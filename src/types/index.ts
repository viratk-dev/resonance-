/**
 * Core domain types for the music app.
 * All entities are local-first; remote provider data is normalized into these shapes.
 */

export type ID = string;

export interface Artist {
  id: ID;
  name: string;
  artworkUri?: string;
  followers?: number;
  isLocal: boolean;
  providerId?: string;
}

export interface Album {
  id: ID;
  title: string;
  artistId: ID;
  artistName: string;
  artworkUri?: string;
  releaseYear?: number;
  trackCount: number;
  isLocal: boolean;
  providerId?: string;
}

export type TrackSource = 'local' | 'download' | 'stream';

export type TrackAvailability = 'available' | 'unavailable';

export interface Track {
  id: ID;
  title: string;
  artistId: ID;
  artistName: string;
  albumId?: ID;
  albumTitle?: string;
  artworkUri?: string;
  durationMs: number;
  /** Local file URI (device storage or downloaded file) */
  fileUri?: string;
  /** Remote stream URL, only when streaming is permitted */
  streamUrl?: string;
  source: TrackSource;
  downloadable: boolean;
  isDownloaded: boolean;
  genre?: string;
  year?: number;
  trackNumber?: number;
  providerId: string;
  addedAt: number;
  playCount: number;
  lastPlayedAt?: number;
  isFavorite: boolean;
}

export interface Playlist {
  id: ID;
  name: string;
  artworkUri?: string;
  description?: string;
  trackIds: ID[];
  createdAt: number;
  updatedAt: number;
  isSystem: boolean;
}

export interface HistoryEntry {
  id: ID;
  trackId: ID;
  playedAt: number;
  positionMs: number;
  completed: boolean;
}

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadEntry {
  id: ID;
  trackId: ID;
  status: DownloadStatus;
  progress: number; // 0..1
  bytesDownloaded: number;
  bytesTotal?: number;
  fileUri?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface QueueItem {
  queueId: ID;
  trackId: ID;
}

export interface PlayerState {
  currentTrackId?: ID;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  queue: QueueItem[];
  queueIndex: number;
  playbackRate: number;
  volume: number;
}

export type ThemeMode = 'dark' | 'light' | 'system';

export interface AppSettings {
  theme: ThemeMode;
  accentColor: string;
  dynamicArtworkColors: boolean;
  animationQuality: 'high' | 'balanced' | 'reduced';
  audioQuality: 'auto' | 'low' | 'medium' | 'high' | 'lossless';
  shuffle: boolean;
  repeatMode: RepeatMode;
  crossfadeMs: number;
  gapless: boolean;
  normalization: boolean;
  playbackRate: number;
  wifiOnlyDownloads: boolean;
  downloadLocation: string;
  compactMode: boolean;
  hapticsEnabled: boolean;
  analyticsEnabled: boolean;
  sleepTimerMinutes?: number;
}

export interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
}

export type ProviderCapability =
  | 'search'
  | 'stream'
  | 'download'
  | 'lyrics'
  | 'trending'
  | 'newReleases';

export interface MusicProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapability[];
  search(query: string, limit?: number): Promise<SearchResults>;
  getTrack(id: string): Promise<Track | null>;
  getArtist(id: string): Promise<Artist | null>;
  getAlbum(id: string): Promise<Album | null>;
  getStreamUrl(track: Track): Promise<string | null>;
  getLyrics(track: Track): Promise<string | null>;
  isDownloadable(track: Track): Promise<boolean>;
  getTrending(limit?: number): Promise<Track[]>;
  getNewReleases(limit?: number): Promise<Album[]>;
}
