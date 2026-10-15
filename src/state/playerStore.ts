import { useEffect } from 'react';
import { create } from 'zustand';
import { playerService, type PlayerSnapshot, type PlayerStatus } from '../services/playerService';
import type { Track, RepeatMode, QueueItem } from '../types';

interface PlayerStore extends PlayerSnapshot {
  initPlayer: () => void;
  playTrack: (track: Track, queue?: Track[], startIndex?: number) => Promise<void>;
  toggle: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seekTo: (ms: number) => Promise<void>;
  setShuffle: (enabled: boolean) => Promise<void>;
  setRepeatMode: (mode: RepeatMode) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  addToQueue: (trackId: string) => void;
  playNext: (trackId: string) => void;
  removeFromQueue: (queueId: string) => void;
  clearQueue: () => void;
  sleepTimerEndsAt: number | null;
  setSleepTimer: (minutes: number | null) => void;
}

let sleepTimerHandle: ReturnType<typeof setTimeout> | null = null;

function toQueueItems(tracks: Track[]): QueueItem[] {
  return tracks.map((t) => ({
    queueId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${t.id}`,
    trackId: t.id,
  }));
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  status: 'idle' as PlayerStatus,
  track: null,
  positionMs: 0,
  durationMs: 0,
  shuffle: false,
  repeatMode: 'off' as RepeatMode,
  queue: [],
  queueIndex: -1,
  playbackRate: 1,
  volume: 1,

  initPlayer: () => {
    playerService.subscribe((snapshot) => set(snapshot));
    playerService.init().catch(() => {});
  },

  playTrack: async (track, queue, startIndex = 0) => {
    if (queue && queue.length > 0) {
      const items = toQueueItems(queue);
      const idx = queue.findIndex((t) => t.id === track.id);
      await playerService.playQueue(items, idx >= 0 ? idx : startIndex);
    } else {
      await playerService.playQueue(toQueueItems([track]), 0);
    }
  },

  toggle: () => playerService.toggle(),
  play: () => playerService.play(),
  pause: () => playerService.pause(),
  next: () => playerService.next(),
  previous: () => playerService.previous(),
  seekTo: (ms) => playerService.seekTo(ms),
  setShuffle: (enabled) => playerService.setShuffle(enabled),
  setRepeatMode: (mode) => playerService.setRepeatMode(mode),
  setPlaybackRate: (rate) => playerService.setPlaybackRate(rate),
  setVolume: (volume) => playerService.setVolume(volume),
  addToQueue: (trackId) => playerService.addToQueue(trackId),
  playNext: (trackId) => playerService.playNext(trackId),
  removeFromQueue: (queueId) => playerService.removeFromQueue(queueId),
  clearQueue: () => playerService.clearQueue(),

  sleepTimerEndsAt: null,
  setSleepTimer: (minutes) => {
    if (sleepTimerHandle) {
      clearTimeout(sleepTimerHandle);
      sleepTimerHandle = null;
    }
    if (minutes == null) {
      set({ sleepTimerEndsAt: null });
      return;
    }
    const endsAt = Date.now() + minutes * 60 * 1000;
    set({ sleepTimerEndsAt: endsAt });
    sleepTimerHandle = setTimeout(() => {
      playerService.pause().catch(() => {});
      set({ sleepTimerEndsAt: null });
      sleepTimerHandle = null;
    }, minutes * 60 * 1000);
  },
}));

export function useInitPlayer(): void {
  const initPlayer = usePlayerStore((s) => s.initPlayer);
  useEffect(() => {
    initPlayer();
  }, [initPlayer]);
}
