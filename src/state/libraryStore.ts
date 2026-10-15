import { create } from 'zustand';
import type { Track, Playlist, HistoryEntry } from '../types';
import {
  getAllTracks,
  getFavoriteTracks,
  getDownloadedTracks,
  getRecentlyPlayedTracks,
  getMostPlayedTracks,
  setTrackFavorite as dbSetFavorite,
  searchTracks as dbSearchTracks,
  countTracks,
} from '../database/trackRepository';
import {
  createPlaylist as dbCreatePlaylist,
  getPlaylists as dbGetPlaylists,
  addTrackToPlaylist as dbAddTrack,
  removeTrackFromPlaylist as dbRemoveTrack,
  deletePlaylist as dbDeletePlaylist,
  renamePlaylist as dbRenamePlaylist,
  getHistory as dbGetHistory,
  clearHistory as dbClearHistory,
} from '../database/playlistRepository';

interface LibraryState {
  tracks: Track[];
  favorites: Track[];
  downloaded: Track[];
  recentlyPlayed: Track[];
  mostPlayed: Track[];
  playlists: Playlist[];
  history: HistoryEntry[];
  trackCount: number;
  isLoading: boolean;
  lastScannedAt?: number;

  refresh: () => Promise<void>;
  search: (query: string) => Promise<Track[]>;
  toggleFavorite: (trackId: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist>;
  deletePlaylist: (id: string) => Promise<void>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  addToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  favorites: [],
  downloaded: [],
  recentlyPlayed: [],
  mostPlayed: [],
  playlists: [],
  history: [],
  trackCount: 0,
  isLoading: false,

  refresh: async () => {
    set({ isLoading: true });
    try {
      const [tracks, favorites, downloaded, recentlyPlayed, mostPlayed, playlists, history, trackCount] =
        await Promise.all([
          getAllTracks(1000),
          getFavoriteTracks(),
          getDownloadedTracks(),
          getRecentlyPlayedTracks(30),
          getMostPlayedTracks(30),
          dbGetPlaylists(),
          dbGetHistory(100),
          countTracks(),
        ]);
      set({
        tracks,
        favorites,
        downloaded,
        recentlyPlayed,
        mostPlayed,
        playlists,
        history,
        trackCount,
        isLoading: false,
        lastScannedAt: Date.now(),
      });
    } catch {
      set({ isLoading: false });
    }
  },

  search: (query: string) => dbSearchTracks(query),

  toggleFavorite: async (trackId: string) => {
    const track = get().tracks.find((t) => t.id === trackId);
    if (!track) return;
    const next = !track.isFavorite;
    // optimistic update
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, isFavorite: next } : t)),
    }));
    await dbSetFavorite(trackId, next);
    const favorites = await getFavoriteTracks();
    set({ favorites });
  },

  createPlaylist: async (name: string) => {
    const playlist = await dbCreatePlaylist(name);
    const playlists = await dbGetPlaylists();
    set({ playlists });
    return playlist;
  },

  deletePlaylist: async (id: string) => {
    await dbDeletePlaylist(id);
    set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) }));
  },

  renamePlaylist: async (id: string, name: string) => {
    await dbRenamePlaylist(id, name);
    set((s) => ({
      playlists: s.playlists.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
  },

  addToPlaylist: async (playlistId: string, trackId: string) => {
    await dbAddTrack(playlistId, trackId);
    const playlists = await dbGetPlaylists();
    set({ playlists });
  },

  removeFromPlaylist: async (playlistId: string, trackId: string) => {
    await dbRemoveTrack(playlistId, trackId);
    const playlists = await dbGetPlaylists();
    set({ playlists });
  },

  clearHistory: async () => {
    await dbClearHistory();
    set({ history: [], recentlyPlayed: [] });
  },
}));
