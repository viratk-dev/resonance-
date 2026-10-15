/**
 * Design tokens — dark-first premium theme.
 * Accent is customizable; dynamic artwork mode can override at runtime.
 */

export interface ColorScheme {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceElevated: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  border: string;
  divider: string;
  success: string;
  warning: string;
  error: string;
  overlay: string;
  skeleton: string;
  skeletonHighlight: string;
}

export const DEFAULT_ACCENT = '#7C5CFF';

export const ACCENT_PRESETS = [
  '#7C5CFF', // violet
  '#FF5C7A', // rose
  '#2FD08C', // mint
  '#3AA7FF', // azure
  '#FFB02E', // amber
  '#FF6B4A', // ember
] as const;

const darkBase: Omit<ColorScheme, 'accent' | 'accentSoft' | 'accentText'> = {
  background: '#0A0A0C',
  backgroundElevated: '#101014',
  surface: '#141419',
  surfaceElevated: '#1B1B22',
  card: '#17171D',
  textPrimary: '#F5F4F0',
  textSecondary: '#B9B8C0',
  textMuted: '#6E6D78',
  border: '#26262E',
  divider: '#1E1E25',
  success: '#2FD08C',
  warning: '#FFB02E',
  error: '#FF5C7A',
  overlay: 'rgba(6,6,8,0.72)',
  skeleton: '#1C1C23',
  skeletonHighlight: '#26262F',
};

const lightBase: Omit<ColorScheme, 'accent' | 'accentSoft' | 'accentText'> = {
  background: '#F6F5F1',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#F1EFEA',
  card: '#FFFFFF',
  textPrimary: '#151515',
  textSecondary: '#4A4A52',
  textMuted: '#8A8994',
  border: '#E4E2DC',
  divider: '#ECEAE4',
  success: '#1E9E6A',
  warning: '#D98A12',
  error: '#E0445E',
  overlay: 'rgba(20,20,24,0.45)',
  skeleton: '#E9E7E1',
  skeletonHighlight: '#F4F2ED',
};

function withAccent(
  base: Omit<ColorScheme, 'accent' | 'accentSoft' | 'accentText'>,
  accent: string,
): ColorScheme {
  return {
    ...base,
    accent,
    accentSoft: `${accent}26`,
    accentText: accent,
  };
}

export function getColors(mode: 'dark' | 'light', accent: string): ColorScheme {
  return withAccent(mode === 'dark' ? darkBase : lightBase, accent);
}

export const darkColors = getColors('dark', DEFAULT_ACCENT);
export const lightColors = getColors('light', DEFAULT_ACCENT);

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  fontFamily: 'System',
  hero: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  title1: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  title2: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.2 },
  title3: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, fontWeight: '500' as const },
  callout: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  captionMedium: { fontSize: 12, fontWeight: '500' as const },
  tiny: { fontSize: 10, fontWeight: '500' as const, letterSpacing: 0.6 },
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  artwork: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;
