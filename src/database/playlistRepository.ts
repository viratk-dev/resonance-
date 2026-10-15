import type { Playlist, HistoryEntry } from '../types';
import { getDatabase } from './db';
import { getTrackById, rowToTrack } from './trackRepository';

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createPlaylist(name: string, description?: string): Promise<Playlist> {
  const db = await getDatabase();
  const now = Date.now();
  const playlist: Playlist = {
    id: newId(),
    name,
    description,
    trackIds: [],
    createdAt: now,
    updatedAt: now,
    isSystem: false,
  };
  await db.runAsync(
    'INSERT INTO playlists (id, name, artwork_uri, description, created_at, updated_at, is_system) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [playlist.id, playlist.name, null, playlist.description ?? null, now, now, 0],
  );
  return playlist;
}

export async function getPlaylists(): Promise<Playlist[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    artwork_uri: string | null;
    description: string | null;
    created_at: number;
    updated_at: number;
    is_system: number;
  }>('SELECT * FROM playlists ORDER BY updated_at DESC');
  const playlists: Playlist[] = [];
  for (const row of rows) {
    const trackRows = await db.getAllAsync<{ track_id: string }>(
      'SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position',
      [row.id],
    );
    playlists.push({
      id: row.id,
      name: row.name,
      artworkUri: row.artwork_uri ?? undefined,
      description: row.description ?? undefined,
      trackIds: trackRows.map((t) => t.track_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isSystem: row.is_system === 1,
    });
  }
  return playlists;
}

export async function getPlaylistById(id: string): Promise<Playlist | null> {
  const playlists = await getPlaylists();
  return playlists.find((p) => p.id === id) ?? null;
}

export async function addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ maxPos: number | null }>(
    'SELECT MAX(position) AS maxPos FROM playlist_tracks WHERE playlist_id = ?',
    [playlistId],
  );
  const position = (row?.maxPos ?? -1) + 1;
  await db.runAsync(
    'INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at) VALUES (?, ?, ?, ?)',
    [playlistId, trackId, position, Date.now()],
  );
  await db.runAsync('UPDATE playlists SET updated_at = ? WHERE id = ?', [Date.now(), playlistId]);
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?', [
    playlistId,
    trackId,
  ]);
  await db.runAsync('UPDATE playlists SET updated_at = ? WHERE id = ?', [Date.now(), playlistId]);
}

export async function reorderPlaylistTracks(playlistId: string, trackIds: string[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < trackIds.length; i++) {
      await db.runAsync(
        'UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?',
        [i, playlistId, trackIds[i]],
      );
    }
    await db.runAsync('UPDATE playlists SET updated_at = ? WHERE id = ?', [Date.now(), playlistId]);
  });
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM playlists WHERE id = ?', [id]);
}

export async function renamePlaylist(id: string, name: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE playlists SET name = ?, updated_at = ? WHERE id = ?', [
    name,
    Date.now(),
    id,
  ]);
}

export async function addHistoryEntry(trackId: string, positionMs: number, completed: boolean): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO history (id, track_id, played_at, position_ms, completed) VALUES (?, ?, ?, ?, ?)',
    [newId(), trackId, now, positionMs, completed ? 1 : 0],
  );
  // Cap history size
  await db.runAsync(
    `DELETE FROM history WHERE id NOT IN (
      SELECT id FROM history ORDER BY played_at DESC LIMIT 500
    )`,
  );
}

export async function getHistory(limit = 100): Promise<HistoryEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    track_id: string;
    played_at: number;
    position_ms: number;
    completed: number;
  }>('SELECT * FROM history ORDER BY played_at DESC LIMIT ?', [limit]);
  return rows.map((r) => ({
    id: r.id,
    trackId: r.track_id,
    playedAt: r.played_at,
    positionMs: r.position_ms,
    completed: r.completed === 1,
  }));
}

export async function clearHistory(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM history');
}

export async function removeHistoryEntry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM history WHERE id = ?', [id]);
}

export async function getLastPosition(trackId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ position_ms: number }>(
    'SELECT position_ms FROM history WHERE track_id = ? AND completed = 0 ORDER BY played_at DESC LIMIT 1',
    [trackId],
  );
  return row?.position_ms ?? 0;
}
