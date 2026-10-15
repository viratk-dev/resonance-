/** App-wide constants. */

export const APP_NAME = 'Resonance';
export const APP_TAGLINE = 'Your music. Your data. Your device.';
export const APP_VERSION = '1.0.0';

export const AUDIO_EXTENSIONS = [
  'mp3',
  'flac',
  'wav',
  'aac',
  'm4a',
  'ogg',
  'opus',
  'wma',
] as const;

export const SLEEP_TIMER_OPTIONS = [5, 10, 15, 30, 45, 60] as const;

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export const SEARCH_DEBOUNCE_MS = 350;
export const MAX_RECENT_SEARCHES = 20;
export const MAX_HISTORY_ENTRIES = 500;

export const ANIMATION_MS = {
  fast: 180,
  normal: 300,
  slow: 500,
} as const;

export const STORAGE_KEYS = {
  settings: 'resonance.settings.v1',
  onboardingDone: 'resonance.onboarding.done.v1',
  recentSearches: 'resonance.search.recent.v1',
} as const;

export const DB_NAME = 'resonance.db';
