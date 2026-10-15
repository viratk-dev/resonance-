import { Paths, File, Directory } from 'expo-file-system';
import { getDatabase } from '../database/db';

let musicDir: Directory | null = null;
let artworkDir: Directory | null = null;
let cacheDir: Directory | null = null;

export async function ensureStorageDirs(): Promise<void> {
  musicDir = new Directory(Paths.document, 'music');
  artworkDir = new Directory(Paths.document, 'artwork');
  cacheDir = new Directory(Paths.cache, 'artwork-cache');
  for (const dir of [musicDir, artworkDir, cacheDir]) {
    if (!dir.exists) dir.create({ intermediates: true });
  }
}

function requireDirs(): { music: Directory; artwork: Directory; cache: Directory } {
  if (!musicDir || !artworkDir || !cacheDir) {
    throw new Error('Storage not initialized. Call ensureStorageDirs() first.');
  }
  return { music: musicDir, artwork: artworkDir, cache: cacheDir };
}

export function getMusicDir(): Directory {
  return requireDirs().music;
}

export function getArtworkDir(): Directory {
  return requireDirs().artwork;
}

export async function fileExists(uri: string): Promise<boolean> {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

export async function deleteFile(uri: string): Promise<void> {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // best-effort
  }
}

export async function getFileSize(uri: string): Promise<number> {
  try {
    const f = new File(uri);
    return f.exists ? (f.size ?? 0) : 0;
  } catch {
    return 0;
  }
}

export interface StorageUsage {
  musicBytes: number;
  artworkBytes: number;
  cacheBytes: number;
  totalBytes: number;
}

async function dirSize(dir: Directory): Promise<number> {
  try {
    if (!dir.exists) return 0;
    const entries = dir.list();
    let total = 0;
    for (const entry of entries) {
      if (entry instanceof File) total += entry.size ?? 0;
    }
    return total;
  } catch {
    return 0;
  }
}

export async function getStorageUsage(): Promise<StorageUsage> {
  const { music, artwork, cache } = requireDirs();
  const [musicBytes, artworkBytes, cacheBytes] = await Promise.all([
    dirSize(music),
    dirSize(artwork),
    dirSize(cache),
  ]);
  return {
    musicBytes,
    artworkBytes,
    cacheBytes,
    totalBytes: musicBytes + artworkBytes + cacheBytes,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

/**
 * Remove files referenced by the DB that no longer exist, and delete
 * downloaded files whose DB entries are gone (orphans).
 */
export async function cleanOrphanedFiles(): Promise<{ removed: number }> {
  const db = await getDatabase();
  const { music } = requireDirs();
  let removed = 0;

  const downloaded = await db.getAllAsync<{ id: string; file_uri: string | null }>(
    'SELECT id, file_uri FROM tracks WHERE is_downloaded = 1',
  );
  for (const t of downloaded) {
    if (!t.file_uri || !(await fileExists(t.file_uri))) {
      await db.runAsync('UPDATE tracks SET is_downloaded = 0, file_uri = NULL WHERE id = ?', [t.id]);
    }
  }

  try {
    const knownUris = new Set(
      (
        await db.getAllAsync<{ file_uri: string | null }>(
          'SELECT file_uri FROM tracks WHERE file_uri IS NOT NULL',
        )
      )
        .map((r) => r.file_uri)
        .filter((u): u is string => !!u),
    );
    for (const entry of music.list()) {
      if (entry instanceof File && !knownUris.has(entry.uri)) {
        entry.delete();
        removed++;
      }
    }
  } catch {
    // best-effort
  }

  return { removed };
}

export async function clearCache(): Promise<void> {
  try {
    const { cache } = requireDirs();
    if (cache.exists) {
      for (const entry of cache.list()) {
        if (entry instanceof File) entry.delete();
      }
    }
  } catch {
    // best-effort
  }
}
