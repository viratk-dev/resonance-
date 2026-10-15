import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings } from '../types';
import { STORAGE_KEYS } from '../constants';
import { useTheme } from '../theme';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: '#7C5CFF',
  dynamicArtworkColors: false,
  animationQuality: 'high',
  audioQuality: 'auto',
  shuffle: false,
  repeatMode: 'off',
  crossfadeMs: 0,
  gapless: true,
  normalization: false,
  playbackRate: 1,
  wifiOnlyDownloads: true,
  downloadLocation: 'internal',
  compactMode: false,
  hapticsEnabled: true,
  analyticsEnabled: false,
  sleepTimerMinutes: undefined,
};

interface SettingsState extends AppSettings {
  isLoaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  reset: () => Promise<void>;
}

function applyToTheme(settings: AppSettings): void {
  const { setMode, setAccent, setDynamicArtworkColors } = useTheme.getState();
  setMode(settings.theme);
  setAccent(settings.accentColor);
  setDynamicArtworkColors(settings.dynamicArtworkColors);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.settings);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        set({ ...merged, isLoaded: true });
        applyToTheme(merged);
      } else {
        set({ isLoaded: true });
        applyToTheme(DEFAULT_SETTINGS);
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  update: async (patch) => {
    const next = { ...get(), ...patch };
    set(patch);
    applyToTheme(next);
    try {
      const { isLoaded: _loaded, load: _load, update: _update, reset: _reset, ...persistable } = next;
      await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(persistable));
    } catch {
      // best-effort
    }
  },

  reset: async () => {
    set({ ...DEFAULT_SETTINGS });
    applyToTheme(DEFAULT_SETTINGS);
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.settings);
    } catch {
      // best-effort
    }
  },
}));
