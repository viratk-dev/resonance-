import { File, DownloadTask, type DownloadProgress } from 'expo-file-system';
import { create } from 'zustand';
import type { DownloadEntry, DownloadStatus, Track } from '../types';
import { getDatabase } from '../database/db';
import { getTrackById, setTrackDownloaded } from '../database';
import { getMusicDir, ensureStorageDirs, fileExists, deleteFile } from '../storage/storageService';

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface PersistedDownload {
  id: string;
  track_id: string;
  status: string;
  progress: number;
  bytes_downloaded: number;
  bytes_total: number | null;
  file_uri: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

function rowToEntry(row: PersistedDownload): DownloadEntry {
  return {
    id: row.id,
    trackId: row.track_id,
    status: row.status as DownloadStatus,
    progress: row.progress,
    bytesDownloaded: row.bytes_downloaded,
    bytesTotal: row.bytes_total ?? undefined,
    fileUri: row.file_uri ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface DownloadState {
  downloads: DownloadEntry[];
  activeCount: number;
  load: () => Promise<void>;
  enqueue: (track: Track) => Promise<void>;
  pause: (id: string) => Promise<void>;
  resume: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  retry: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const tasks = new Map<string, DownloadTask>();

async function persist(entry: DownloadEntry): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO downloads (id, track_id, status, progress, bytes_downloaded, bytes_total, file_uri, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       status = excluded.status, progress = excluded.progress,
       bytes_downloaded = excluded.bytes_downloaded, bytes_total = excluded.bytes_total,
       file_uri = excluded.file_uri, error = excluded.error, updated_at = excluded.updated_at`,
    [
      entry.id,
      entry.trackId,
      entry.status,
      entry.progress,
      entry.bytesDownloaded,
      entry.bytesTotal ?? null,
      entry.fileUri ?? null,
      entry.error ?? null,
      entry.createdAt,
      Date.now(),
    ],
  );
}

export const useDownloadStore = create<DownloadState>((set, get) => {
  async function refresh(): Promise<void> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<PersistedDownload>(
      'SELECT * FROM downloads ORDER BY created_at DESC',
    );
    const downloads = rows.map(rowToEntry);
    const activeCount = downloads.filter((d) =>
      ['queued', 'downloading'].includes(d.status),
    ).length;
    set({ downloads, activeCount });
  }

  function patchEntry(id: string, patch: Partial<DownloadEntry>): void {
    set((s) => ({
      downloads: s.downloads.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  }

  async function failEntry(entry: DownloadEntry, error: string): Promise<void> {
    const failed: DownloadEntry = { ...entry, status: 'failed', error, updatedAt: Date.now() };
    await persist(failed);
    await refresh();
  }

  async function startDownload(entry: DownloadEntry, track: Track): Promise<void> {
    const url = track.streamUrl;
    if (!url) {
      await failEntry(entry, 'No download URL available for this track.');
      return;
    }
    await ensureStorageDirs();
    const destFile = new File(getMusicDir(), `${entry.id}.mp3`);

    const onProgress = (progress: DownloadProgress) => {
      const total = progress.totalBytes ?? entry.bytesTotal ?? 0;
      const written = progress.bytesWritten;
      const pct = total > 0 ? written / total : 0;
      patchEntry(entry.id, {
        status: 'downloading',
        progress: pct,
        bytesDownloaded: written,
        bytesTotal: total || undefined,
      });
    };

    const task = File.createDownloadTask(url, destFile, { onProgress });
    tasks.set(entry.id, task);
    patchEntry(entry.id, { status: 'downloading', error: undefined });

    try {
      const result = await task.downloadAsync();
      tasks.delete(entry.id);
      if (!result) {
        // paused or cancelled — status already updated elsewhere
        return;
      }
      const done: DownloadEntry = {
        ...entry,
        status: 'completed',
        progress: 1,
        fileUri: result.uri,
        updatedAt: Date.now(),
      };
      await persist(done);
      await setTrackDownloaded(track.id, result.uri);
      await refresh();
    } catch (e) {
      tasks.delete(entry.id);
      const current = get().downloads.find((d) => d.id === entry.id);
      if (current?.status === 'paused') {
        await persist({ ...current, updatedAt: Date.now() });
        return;
      }
      await failEntry(entry, e instanceof Error ? e.message : 'Download failed.');
    }
  }

  return {
    downloads: [],
    activeCount: 0,

    load: refresh,

    enqueue: async (track: Track) => {
      if (!track.downloadable) throw new Error('This track cannot be downloaded.');
      const existing = get().downloads.find(
        (d) => d.trackId === track.id && !['cancelled', 'failed'].includes(d.status),
      );
      if (existing) return;

      const entry: DownloadEntry = {
        id: newId(),
        trackId: track.id,
        status: 'queued',
        progress: 0,
        bytesDownloaded: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await persist(entry);
      await refresh();
      const active = get().downloads.filter((d) => d.status === 'downloading').length;
      if (active < 3) {
        startDownload(entry, track).catch(() => {});
      }
    },

    pause: async (id: string) => {
      const task = tasks.get(id);
      patchEntry(id, { status: 'paused' });
      if (task) {
        try {
          await task.pauseAsync();
        } catch {
          // best-effort
        }
        tasks.delete(id);
      }
      const entry = get().downloads.find((d) => d.id === id);
      if (entry) await persist({ ...entry, status: 'paused', updatedAt: Date.now() });
      await refresh();
    },

    resume: async (id: string) => {
      const entry = get().downloads.find((d) => d.id === id);
      if (!entry || !['paused', 'failed', 'queued'].includes(entry.status)) return;
      const track = await getTrackById(entry.trackId);
      if (!track) {
        await failEntry(entry, 'Track not found.');
        return;
      }
      const task = tasks.get(id);
      if (task && entry.status === 'paused') {
        patchEntry(id, { status: 'downloading' });
        try {
          const result = await task.resumeAsync();
          tasks.delete(id);
          if (result) {
            const done = { ...entry, status: 'completed' as DownloadStatus, progress: 1, fileUri: result.uri, updatedAt: Date.now() };
            await persist(done);
            await setTrackDownloaded(track.id, result.uri);
          } else {
            await failEntry(entry, 'Resume failed.');
          }
        } catch (e) {
          tasks.delete(id);
          await failEntry(entry, e instanceof Error ? e.message : 'Resume failed.');
        }
        await refresh();
        return;
      }
      await startDownload({ ...entry, status: 'queued', error: undefined }, track);
    },

    cancel: async (id: string) => {
      const task = tasks.get(id);
      if (task) {
        try {
          task.cancel();
        } catch {
          // best-effort
        }
        tasks.delete(id);
      }
      const entry = get().downloads.find((d) => d.id === id);
      if (entry?.fileUri) await deleteFile(entry.fileUri);
      const db = await getDatabase();
      await db.runAsync("UPDATE downloads SET status = 'cancelled', updated_at = ? WHERE id = ?", [
        Date.now(),
        id,
      ]);
      await refresh();
    },

    retry: async (id: string) => {
      const entry = get().downloads.find((d) => d.id === id);
      if (!entry) return;
      const track = await getTrackById(entry.trackId);
      if (!track) {
        await failEntry(entry, 'Track not found.');
        return;
      }
      await startDownload({ ...entry, status: 'queued', error: undefined }, track);
    },

    remove: async (id: string) => {
      const entry = get().downloads.find((d) => d.id === id);
      if (entry?.fileUri && (await fileExists(entry.fileUri))) {
        await deleteFile(entry.fileUri);
        await setTrackDownloaded(entry.trackId, null);
      }
      const db = await getDatabase();
      await db.runAsync('DELETE FROM downloads WHERE id = ?', [id]);
      await refresh();
    },
  };
});
