import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import type { Track, RepeatMode, QueueItem } from '../types';
import { getTrackById, markTrackPlayed, addHistoryEntry } from '../database';
import { fileExists } from '../storage/storageService';

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'completed'
  | 'error';

export interface PlayerSnapshot {
  status: PlayerStatus;
  track: Track | null;
  positionMs: number;
  durationMs: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  queue: QueueItem[];
  queueIndex: number;
  playbackRate: number;
  volume: number;
  error?: string;
}

type Listener = (snapshot: PlayerSnapshot) => void;

const REPEAT_STORAGE_KEY = 'player.repeatMode';

/**
 * PlayerService — the single owner of audio playback.
 * UI components subscribe via `subscribe()`; never put playback logic in components.
 */
class PlayerService {
  private audioPlayer: AudioPlayer | null = null;
  private listeners = new Set<Listener>();
  private status: PlayerStatus = 'idle';
  private currentTrack: Track | null = null;
  private queue: QueueItem[] = [];
  private queueIndex = -1;
  private shuffle = false;
  private shuffledOrder: number[] = [];
  private repeatMode: RepeatMode = 'off';
  private playbackRate = 1;
  private volume = 1;
  private error?: string;
  private positionTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
      allowsRecording: false,
    });
    this.initialized = true;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const l of this.listeners) l(snap);
  }

  snapshot(): PlayerSnapshot {
    return {
      status: this.status,
      track: this.currentTrack,
      positionMs: this.audioPlayer ? this.audioPlayer.currentTime * 1000 : 0,
      durationMs: this.audioPlayer ? (this.audioPlayer.duration || 0) * 1000 : 0,
      shuffle: this.shuffle,
      repeatMode: this.repeatMode,
      queue: [...this.queue],
      queueIndex: this.queueIndex,
      playbackRate: this.playbackRate,
      volume: this.volume,
      error: this.error,
    };
  }

  private startPositionTimer(): void {
    this.stopPositionTimer();
    this.positionTimer = setInterval(() => {
      if (this.status === 'playing') this.emit();
    }, 500);
  }

  private stopPositionTimer(): void {
    if (this.positionTimer) {
      clearInterval(this.positionTimer);
      this.positionTimer = null;
    }
  }

  private resolveSource(track: Track): string | null {
    if (track.fileUri) return track.fileUri;
    if (track.streamUrl) return track.streamUrl;
    return null;
  }

  async loadTrack(track: Track, autoplay = true): Promise<void> {
    await this.init();
    const source = this.resolveSource(track);
    if (!source) {
      this.setError('Track unavailable — no playable source.');
      return;
    }
    if (track.fileUri && !(await fileExists(track.fileUri))) {
      this.setError('Audio file not found on device.');
      return;
    }

    this.setStatus('loading');
    this.error = undefined;
    try {
      this.audioPlayer?.remove();
      this.audioPlayer = createAudioPlayer({ uri: source });
      this.audioPlayer.playbackRate = this.playbackRate;
      this.audioPlayer.volume = this.volume;
      this.audioPlayer.loop = this.repeatMode === 'one';
      this.currentTrack = track;
      // Restore last position for long tracks (resume where left off)
      // Position restore is handled by the caller via seekTo if desired.
      if (autoplay) {
        this.audioPlayer.play();
        this.setStatus('playing');
        this.startPositionTimer();
      } else {
        this.setStatus('paused');
      }
      markTrackPlayed(track.id).catch(() => {});
      this.emit();
    } catch (e) {
      this.setError(e instanceof Error ? e.message : 'Playback failed.');
    }
  }

  async play(): Promise<void> {
    await this.init();
    if (!this.audioPlayer) {
      if (this.currentTrack) {
        await this.loadTrack(this.currentTrack, true);
      }
      return;
    }
    this.audioPlayer.play();
    this.setStatus('playing');
    this.startPositionTimer();
  }

  async pause(): Promise<void> {
    this.audioPlayer?.pause();
    this.setStatus('paused');
    this.stopPositionTimer();
    await this.recordHistory(false);
  }

  async toggle(): Promise<void> {
    if (this.status === 'playing') await this.pause();
    else await this.play();
  }

  async seekTo(positionMs: number): Promise<void> {
    if (!this.audioPlayer) return;
    this.audioPlayer.seekTo(Math.max(0, positionMs / 1000));
    this.emit();
  }

  private nextIndex(): number {
    if (this.queue.length === 0) return -1;
    if (this.shuffle && this.shuffledOrder.length > 0) {
      const pos = this.shuffledOrder.indexOf(this.queueIndex);
      const nextPos = pos + 1;
      if (nextPos < this.shuffledOrder.length) return this.shuffledOrder[nextPos];
      return this.repeatMode === 'all' ? this.shuffledOrder[0] : -1;
    }
    const next = this.queueIndex + 1;
    if (next < this.queue.length) return next;
    return this.repeatMode === 'all' ? 0 : -1;
  }

  private prevIndex(): number {
    if (this.queue.length === 0) return -1;
    // If more than 3s into the song, restart it instead of going back
    const posMs = this.audioPlayer ? this.audioPlayer.currentTime * 1000 : 0;
    if (posMs > 3000) {
      this.seekTo(0);
      return this.queueIndex;
    }
    if (this.shuffle && this.shuffledOrder.length > 0) {
      const pos = this.shuffledOrder.indexOf(this.queueIndex);
      if (pos > 0) return this.shuffledOrder[pos - 1];
      return this.queueIndex;
    }
    return this.queueIndex > 0 ? this.queueIndex - 1 : 0;
  }

  async playQueue(queue: QueueItem[], startIndex = 0): Promise<void> {
    this.queue = queue;
    this.queueIndex = startIndex;
    this.rebuildShuffleOrder();
    const item = this.queue[startIndex];
    if (!item) {
      this.setError('Queue is empty.');
      return;
    }
    const track = await getTrackById(item.trackId);
    if (!track) {
      this.setError('Track not found.');
      return;
    }
    await this.loadTrack(track, true);
  }

  async next(): Promise<void> {
    const idx = this.nextIndex();
    if (idx === -1) {
      await this.onQueueCompleted();
      return;
    }
    this.queueIndex = idx;
    const track = await getTrackById(this.queue[idx].trackId);
    if (track) await this.loadTrack(track, true);
    else await this.next();
  }

  async previous(): Promise<void> {
    const idx = this.prevIndex();
    if (idx === this.queueIndex && this.audioPlayer) return; // restarted current
    this.queueIndex = idx;
    const track = await getTrackById(this.queue[idx].trackId);
    if (track) await this.loadTrack(track, true);
  }

  private async onQueueCompleted(): Promise<void> {
    if (this.repeatMode === 'one' && this.currentTrack) {
      await this.seekTo(0);
      await this.play();
      return;
    }
    await this.recordHistory(true);
    this.setStatus('completed');
    this.stopPositionTimer();
  }

  async setShuffle(enabled: boolean): Promise<void> {
    this.shuffle = enabled;
    this.rebuildShuffleOrder();
    this.emit();
  }

  private rebuildShuffleOrder(): void {
    this.shuffledOrder = this.queue.map((_, i) => i);
    // Fisher-Yates, keeping current index first
    for (let i = this.shuffledOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledOrder[i], this.shuffledOrder[j]] = [this.shuffledOrder[j], this.shuffledOrder[i]];
    }
  }

  async setRepeatMode(mode: RepeatMode): Promise<void> {
    this.repeatMode = mode;
    if (this.audioPlayer) this.audioPlayer.loop = mode === 'one';
    this.emit();
  }

  async setPlaybackRate(rate: number): Promise<void> {
    this.playbackRate = rate;
    if (this.audioPlayer) this.audioPlayer.playbackRate = rate;
    this.emit();
  }

  async setVolume(volume: number): Promise<void> {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.audioPlayer) this.audioPlayer.volume = this.volume;
    this.emit();
  }

  // ---- Queue management ----

  addToQueue(trackId: string): void {
    this.queue.push({ queueId: newId(), trackId });
    this.rebuildShuffleOrder();
    this.emit();
  }

  playNext(trackId: string): void {
    const item = { queueId: newId(), trackId };
    this.queue.splice(this.queueIndex + 1, 0, item);
    this.rebuildShuffleOrder();
    this.emit();
  }

  removeFromQueue(queueId: string): void {
    const idx = this.queue.findIndex((q) => q.queueId === queueId);
    if (idx === -1) return;
    this.queue.splice(idx, 1);
    if (idx < this.queueIndex) this.queueIndex--;
    else if (idx === this.queueIndex) {
      // removed currently playing — advance
      this.next().catch(() => {});
      return;
    }
    this.rebuildShuffleOrder();
    this.emit();
  }

  reorderQueue(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    const [moved] = this.queue.splice(fromIndex, 1);
    this.queue.splice(toIndex, 0, moved);
    // keep queueIndex pointing at the same track
    const currentId = this.queue[toIndex === fromIndex ? fromIndex : -1]?.trackId;
    void currentId;
    this.rebuildShuffleOrder();
    this.emit();
  }

  clearQueue(): void {
    this.queue = [];
    this.queueIndex = -1;
    this.shuffledOrder = [];
    this.emit();
  }

  private async recordHistory(completed: boolean): Promise<void> {
    if (!this.currentTrack || !this.audioPlayer) return;
    try {
      await addHistoryEntry(
        this.currentTrack.id,
        Math.floor(this.audioPlayer.currentTime * 1000),
        completed,
      );
    } catch {
      // best-effort
    }
  }

  private setStatus(status: PlayerStatus): void {
    this.status = status;
    this.emit();
  }

  private setError(message: string): void {
    this.error = message;
    this.setStatus('error');
    this.stopPositionTimer();
  }

  async destroy(): Promise<void> {
    this.stopPositionTimer();
    await this.recordHistory(false);
    this.audioPlayer?.remove();
    this.audioPlayer = null;
    this.listeners.clear();
    this.initialized = false;
  }
}

export const playerService = new PlayerService();
export { REPEAT_STORAGE_KEY };
