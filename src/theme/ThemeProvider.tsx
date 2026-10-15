import { create } from 'zustand';
import { ColorScheme, getColors } from './tokens';
import type { ThemeMode } from '../types';

interface ThemeState {
  mode: ThemeMode;
  resolvedMode: 'dark' | 'light';
  accent: string;
  dynamicArtworkColors: boolean;
  artworkAccent?: string;
  colors: ColorScheme;
  setMode: (mode: ThemeMode) => void;
  setResolvedMode: (mode: 'dark' | 'light') => void;
  setAccent: (accent: string) => void;
  setDynamicArtworkColors: (enabled: boolean) => void;
  setArtworkAccent: (accent?: string) => void;
}

function resolveColors(
  resolvedMode: 'dark' | 'light',
  accent: string,
  dynamicArtworkColors: boolean,
  artworkAccent?: string,
): ColorScheme {
  const effectiveAccent =
    dynamicArtworkColors && artworkAccent ? artworkAccent : accent;
  return getColors(resolvedMode, effectiveAccent);
}

export const useTheme = create<ThemeState>((set, get) => ({
  mode: 'dark',
  resolvedMode: 'dark',
  accent: '#7C5CFF',
  dynamicArtworkColors: false,
  artworkAccent: undefined,
  colors: getColors('dark', '#7C5CFF'),

  setMode: (mode) => {
    const { resolvedMode, accent, dynamicArtworkColors, artworkAccent } = get();
    set({
      mode,
      colors: resolveColors(resolvedMode, accent, dynamicArtworkColors, artworkAccent),
    });
  },
  setResolvedMode: (resolvedMode) => {
    const { accent, dynamicArtworkColors, artworkAccent } = get();
    set({
      resolvedMode,
      colors: resolveColors(resolvedMode, accent, dynamicArtworkColors, artworkAccent),
    });
  },
  setAccent: (accent) => {
    const { resolvedMode, dynamicArtworkColors, artworkAccent } = get();
    set({
      accent,
      colors: resolveColors(resolvedMode, accent, dynamicArtworkColors, artworkAccent),
    });
  },
  setDynamicArtworkColors: (dynamicArtworkColors) => {
    const { resolvedMode, accent, artworkAccent } = get();
    set({
      dynamicArtworkColors,
      colors: resolveColors(resolvedMode, accent, dynamicArtworkColors, artworkAccent),
    });
  },
  setArtworkAccent: (artworkAccent) => {
    const { resolvedMode, accent, dynamicArtworkColors } = get();
    set({
      artworkAccent,
      colors: resolveColors(resolvedMode, accent, dynamicArtworkColors, artworkAccent),
    });
  },
}));

export function useColors(): ColorScheme {
  return useTheme((s) => s.colors);
}
