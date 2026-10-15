import * as MediaLibrary from 'expo-media-library';
import type {
  MusicProvider,
  ProviderCapability,
  Track,
  Artist,
  Album,
  SearchResults,
} from '../types';
import { AUDIO_EXTENSIONS } from '../constants';
import { upsertTrack, getTrackById } from '../database';
import { providerRegistry } from './registry';

function newId(prefix: string, raw: string): string {
  return `local-${prefix}-${raw}`;
}

function extensionOf(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * LocalProvider — scans device storage for audio files the user owns.
 * This is the default, always-available provider. No network required.
 */
class LocalProvider implements MusicProvider {
  readonly id = 'local';
  readonly name = 'Device Music';
  readonly capabilities: ProviderCapability[] = ['search'];

  async requestPermission(): Promise<boolean> {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Scan device audio files and upsert them into the local database.
   * Returns the number of tracks found.
   */
  async scanLibrary(onProgress?: (scanned: number) => void): Promise<number> {
    const granted = await this.requestPermission();
    if (!granted) throw new Error('Storage permission denied.');

    let scanned = 0;
    let after: string | undefined;
    const seenArtists = new Map<string, Artist>();
    const seenAlbums = new Map<string, Album>();

    // expo-media-library paginates assets
    do {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: 'audio',
        first: 100,
        after,
        sortBy: [['creationTime', false]],
      });

      for (const asset of page.assets) {
        const ext = extensionOf(asset.filename);
        if (!(AUDIO_EXTENSIONS as readonly string[]).includes(ext)) continue;

        const trackId = newId('track', asset.id);
        const artistName = 'Unknown Artist';
        const albumTitle = 'Unknown Album';
        const artistId = newId('artist', `unknown`);
        const albumId = newId('album', `unknown`);

        if (!seenArtists.has(artistId)) {
          seenArtists.set(artistId, {
            id: artistId,
            name: artistName,
            isLocal: true,
            providerId: 'local',
          });
        }
        if (!seenAlbums.has(albumId)) {
          seenAlbums.set(albumId, {
            id: albumId,
            title: albumTitle,
            artistId,
            artistName,
            trackCount: 0,
            isLocal: true,
            providerId: 'local',
          });
        }

        const track: Track = {
          id: trackId,
          title: asset.filename.replace(/\.[^.]+$/, ''),
          artistId,
          artistName,
          albumId,
          albumTitle,
          durationMs: Math.floor((asset.duration || 0) * 1000),
          fileUri: asset.uri,
          source: 'local',
          downloadable: false,
          isDownloaded: false,
          providerId: 'local',
          addedAt: asset.creationTime || Date.now(),
          playCount: 0,
          isFavorite: false,
        };

        // Preserve favorite/play-count state across rescans
        const existing = await getTrackById(trackId);
        if (existing) {
          track.isFavorite = existing.isFavorite;
          track.playCount = existing.playCount;
          track.lastPlayedAt = existing.lastPlayedAt;
        }

        await upsertTrack(track);
        scanned++;
        if (scanned % 25 === 0) onProgress?.(scanned);
      }

      after = page.hasNextPage ? page.endCursor : undefined;
    } while (after);

    onProgress?.(scanned);
    return scanned;
  }

  async search(query: string, limit = 50): Promise<SearchResults> {
    // Local search is handled by the SQLite layer; this delegates there.
    const { searchTracks } = await import('../database');
    const tracks = await searchTracks(query, limit);
    return { tracks, artists: [], albums: [], playlists: [] };
  }

  async getTrack(id: string): Promise<Track | null> {
    return getTrackById(id);
  }

  async getArtist(): Promise<Artist | null> {
    return null;
  }

  async getAlbum(): Promise<Album | null> {
    return null;
  }

  async getStreamUrl(): Promise<string | null> {
    return null; // local files play from fileUri
  }

  async getLyrics(): Promise<string | null> {
    return null; // no fabricated lyrics
  }

  async isDownloadable(): Promise<boolean> {
    return false; // local files are already on device
  }

  async getTrending(): Promise<Track[]> {
    return [];
  }

  async getNewReleases(): Promise<Album[]> {
    return [];
  }
}

export const localProvider = new LocalProvider();
providerRegistry.register(localProvider as unknown as MusicProvider);
