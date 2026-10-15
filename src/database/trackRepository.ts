import type { Track } from '../types';
import { getDatabase } from './db';

interface TrackRow {
  id: string;
  title: string;
  artist_id: string;
  artist_name: string;
  album_id: string | null;
  album_title: string | null;
  artwork_uri: string | null;
  duration_ms: number;
  file_uri: string | null;
  stream_url: string | null;
  source: string;
  downloadable: number;
  is_downloaded: number;
  genre: string | null;
  year: number | null;
  track_number: number | null;
  provider_id: string;
  added_at: number;
  play_count: number;
  last_played_at: number | null;
  is_favorite: number;
}

export function rowToTrack(row: TrackRow): Track {
  return {
    id: row.id,
    title: row.title,
    artistId: row.artist_id,
    artistName: row.artist_name,
    albumId: row.album_id ?? undefined,
    albumTitle: row.album_title ?? undefined,
    artworkUri: row.artwork_uri ?? undefined,
    durationMs: row.duration_ms,
    fileUri: row.file_uri ?? undefined,
    streamUrl: row.stream_url ?? undefined,
    source: row.source as Track['source'],
    downloadable: row.downloadable === 1,
    isDownloaded: row.is_downloaded === 1,
    genre: row.genre ?? undefined,
    year: row.year ?? undefined,
    trackNumber: row.track_number ?? undefined,
    providerId: row.provider_id,
    addedAt: row.added_at,
    playCount: row.play_count,
    lastPlayedAt: row.last_played_at ?? undefined,
    isFavorite: row.is_favorite === 1,
  };
}

export async function upsertTrack(track: Track): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO tracks (
      id, title, artist_id, artist_name, album_id, album_title, artwork_uri,
      duration_ms, file_uri, stream_url, source, downloadable, is_downloaded,
      genre, year, track_number, provider_id, added_at, play_count,
      last_played_at, is_favorite
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      artist_id = excluded.artist_id,
      artist_name = excluded.artist_name,
      album_id = excluded.album_id,
      album_title = excluded.album_title,
      artwork_uri = excluded.artwork_uri,
      duration_ms = excluded.duration_ms,
      file_uri = COALESCE(excluded.file_uri, tracks.file_uri),
      stream_url = COALESCE(excluded.stream_url, tracks.stream_url),
      source = excluded.source,
      downloadable = excluded.downloadable,
      genre = excluded.genre,
      year = excluded.year,
      track_number = excluded.track_number,
      provider_id = excluded.provider_id`,
    [
      track.id,
      track.title,
      track.artistId,
      track.artistName,
      track.albumId ?? null,
      track.albumTitle ?? null,
      track.artworkUri ?? null,
      track.durationMs,
      track.fileUri ?? null,
      track.streamUrl ?? null,
      track.source,
      track.downloadable ? 1 : 0,
      track.isDownloaded ? 1 : 0,
      track.genre ?? null,
      track.year ?? null,
      track.trackNumber ?? null,
      track.providerId,
      track.addedAt,
      track.playCount,
      track.lastPlayedAt ?? null,
      track.isFavorite ? 1 : 0,
    ],
  );
}

export async function getTrackById(id: string): Promise<Track | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TrackRow>('SELECT * FROM tracks WHERE id = ?', [id]);
  return row ? rowToTrack(row) : null;
}

export async function getAllTracks(limit = 500, offset = 0): Promise<Track[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TrackRow>(
    'SELECT * FROM tracks ORDER BY title COLLATE NOCASE LIMIT ? OFFSET ?',
    [limit, offset],
  );
  return rows.map(rowToTrack);
}

export async function searchTracks(query: string, limit = 50): Promise<Track[]> {
  const db = await getDatabase();
  const like = `%${query}%`;
  const rows = await db.getAllAsync<TrackRow>(
    `SELECT * FROM tracks
     WHERE title LIKE ? OR artist_name LIKE ? OR album_title LIKE ?
     ORDER BY play_count DESC, title COLLATE NOCASE LIMIT ?`,
    [like, like, like, limit],
  );
  return rows.map(rowToTrack);
}

export async function getFavoriteTracks(): Promise<Track[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TrackRow>(
    'SELECT * FROM tracks WHERE is_favorite = 1 ORDER BY title COLLATE NOCASE',
  );
  return rows.map(rowToTrack);
}

export async function getDownloadedTracks(): Promise<Track[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TrackRow>(
    'SELECT * FROM tracks WHERE is_downloaded = 1 ORDER BY title COLLATE NOCASE',
  );
  return rows.map(rowToTrack);
}

export async function getRecentlyPlayedTracks(limit = 30): Promise<Track[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TrackRow>(
    `SELECT t.* FROM tracks t
     INNER JOIN history h ON h.track_id = t.id
     GROUP BY t.id
     ORDER BY MAX(h.played_at) DESC LIMIT ?`,
    [limit],
  );
  return rows.map(rowToTrack);
}

export async function getMostPlayedTracks(limit = 30): Promise<Track[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TrackRow>(
    'SELECT * FROM tracks WHERE play_count > 0 ORDER BY play_count DESC LIMIT ?',
    [limit],
  );
  return rows.map(rowToTrack);
}

export async function setTrackFavorite(id: string, favorite: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE tracks SET is_favorite = ? WHERE id = ?', [
    favorite ? 1 : 0,
    id,
  ]);
}

export async function markTrackPlayed(id: string): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync(
    'UPDATE tracks SET play_count = play_count + 1, last_played_at = ? WHERE id = ?',
    [now, id],
  );
}

export async function setTrackDownloaded(id: string, fileUri: string | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE tracks SET is_downloaded = ?, file_uri = ? WHERE id = ?', [
    fileUri ? 1 : 0,
    fileUri,
    id,
  ]);
}

export async function deleteTrack(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM tracks WHERE id = ?', [id]);
}

export async function countTracks(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM tracks');
  return row?.count ?? 0;
}
