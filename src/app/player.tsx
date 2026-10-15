import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useColors, typography, spacing, radii, shadows } from '../theme';
import { usePlayerStore } from '../state/playerStore';
import { useLibraryStore } from '../state/libraryStore';
import { useSettingsStore } from '../state/settingsStore';
import { IconButton } from '../components/IconButton';
import type { RepeatMode } from '../types';

const { width } = Dimensions.get('window');
const ART_SIZE = width - 96;

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, '0')}`;
}

function RepeatIcon({ mode, color }: { mode: RepeatMode; color: string }) {
  return (
    <Text style={{ fontSize: 22, color: mode === 'off' ? color : undefined, opacity: mode === 'off' ? 0.4 : 1 }}>
      <Text style={{ color: mode !== 'off' ? '#7C5CFF' : color }}>⟳</Text>
      {mode === 'one' && <Text style={{ fontSize: 10, color: '#7C5CFF' }}> 1</Text>}
    </Text>
  );
}

export default function PlayerScreen() {
  const colors = useColors();
  const router = useRouter();
  const track = usePlayerStore((s) => s.track);
  const isPlaying = usePlayerStore((s) => s.status === 'playing');
  const status = usePlayerStore((s) => s.status);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const error = usePlayerStore((s) => s.error);
  const { toggle, next, previous, seekTo, setShuffle, setRepeatMode } = usePlayerStore();
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  const [seeking, setSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  // Gentle floating motion for artwork
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [float]);

  const artworkStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: float.value * 6 - 3 },
      { scale: isPlaying ? withSpring(1) : withSpring(0.97) },
    ],
  }));

  const haptic = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const cycleRepeat = () => {
    haptic();
    const nextMode: RepeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatMode(nextMode).catch(() => {});
  };

  if (!track) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.title3, { color: colors.textSecondary }]}>Nothing playing</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: spacing.lg }}>
          <Text style={[typography.bodyMedium, { color: colors.accent }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const displayedPosition = seeking ? seekValue : positionMs;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <IconButton label="Close player" onPress={() => router.back()}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>⌄</Text>
        </IconButton>
        <View style={{ alignItems: 'center' }}>
          <Text style={[typography.tiny, { color: colors.textMuted }]}>NOW PLAYING</Text>
          <Text style={[typography.captionMedium, { color: colors.textSecondary }]} numberOfLines={1}>
            {track.albumTitle ?? 'Single'}
          </Text>
        </View>
        <IconButton label="More options" onPress={() => {}}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>⋯</Text>
        </IconButton>
      </View>

      {/* Artwork */}
      <View style={styles.artworkWrap}>
        <Animated.View style={artworkStyle}>
          {track.artworkUri ? (
            <Image
              source={{ uri: track.artworkUri }}
              style={[{ width: ART_SIZE, height: ART_SIZE, borderRadius: radii.xl }, shadows.artwork]}
            />
          ) : (
            <View
              style={[
                { width: ART_SIZE, height: ART_SIZE, borderRadius: radii.xl, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
                shadows.artwork,
              ]}
            >
              <Text style={{ fontSize: 72, color: colors.textMuted }}>♪</Text>
            </View>
          )}
        </Animated.View>
        {/* Ambient glow */}
        <View
          style={[
            styles.glow,
            { backgroundColor: colors.accent, opacity: 0.12, borderRadius: radii.xl, width: ART_SIZE, height: ART_SIZE },
          ]}
          pointerEvents="none"
        />
      </View>

      {/* Title / artist / actions */}
      <View style={styles.metaRow}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.title1, { color: colors.textPrimary }]} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            {track.artistName}
          </Text>
        </View>
        <IconButton
          label={track.isFavorite ? 'Unlike' : 'Like'}
          onPress={() => {
            haptic();
            toggleFavorite(track.id).catch(() => {});
          }}
        >
          <Text style={{ fontSize: 24, color: track.isFavorite ? colors.accent : colors.textMuted }}>
            {track.isFavorite ? '♥' : '♡'}
          </Text>
        </IconButton>
      </View>

      {error && (
        <Text style={[typography.caption, { color: colors.error, paddingHorizontal: spacing.xxxl, textAlign: 'center' }]}>
          {error}
        </Text>
      )}
      {status === 'loading' && (
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Loading…</Text>
      )}

      {/* Progress */}
      <View style={styles.progressWrap}>
        <Slider
          style={{ width: '100%', height: 32 }}
          minimumValue={0}
          maximumValue={Math.max(1, durationMs)}
          value={displayedPosition}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.surfaceElevated}
          thumbTintColor={colors.accent}
          onSlidingStart={() => {
            setSeeking(true);
            setSeekValue(positionMs);
          }}
          onValueChange={setSeekValue}
          onSlidingComplete={(v) => {
            setSeeking(false);
            seekTo(v).catch(() => {});
          }}
          accessibilityLabel="Seek"
        />
        <View style={styles.timeRow}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{formatTime(displayedPosition)}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>-{formatTime(Math.max(0, durationMs - displayedPosition))}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <IconButton
          label="Shuffle"
          size={52}
          onPress={() => {
            haptic();
            setShuffle(!shuffle).catch(() => {});
          }}
        >
          <Text style={{ fontSize: 22, color: shuffle ? colors.accent : colors.textMuted, opacity: shuffle ? 1 : 0.5 }}>
            ⇆
          </Text>
        </IconButton>
        <IconButton label="Previous" size={64} onPress={() => { haptic(); previous().catch(() => {}); }}>
          <Text style={{ fontSize: 30, color: colors.textPrimary }}>⏮</Text>
        </IconButton>
        <Pressable
          onPress={() => { haptic(); toggle().catch(() => {}); }}
          style={[styles.playButton, { backgroundColor: colors.textPrimary }]}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <Text style={{ fontSize: 30, color: colors.background }}>{isPlaying ? '❚❚' : '▶'}</Text>
        </Pressable>
        <IconButton label="Next" size={64} onPress={() => { haptic(); next().catch(() => {}); }}>
          <Text style={{ fontSize: 30, color: colors.textPrimary }}>⏭</Text>
        </IconButton>
        <IconButton label="Repeat" size={52} onPress={cycleRepeat}>
          <RepeatIcon mode={repeatMode} color={colors.textMuted} />
        </IconButton>
      </View>

      {/* Secondary actions */}
      <View style={styles.secondaryRow}>
        <Pressable style={styles.secondaryBtn} onPress={() => router.push('/queue')}>
          <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>Queue</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => {}}>
          <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>Sleep</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => {}}>
          <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>Speed</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  artworkWrap: { alignItems: 'center', marginTop: spacing.xl, position: 'relative' },
  glow: { position: 'absolute', top: -18, transform: [{ scale: 1.12 }] },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  progressWrap: { paddingHorizontal: spacing.xxl, marginTop: spacing.lg },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  secondaryRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xxl, marginTop: spacing.xxl },
  secondaryBtn: { padding: spacing.sm },
});
