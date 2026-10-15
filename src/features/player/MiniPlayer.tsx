import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useColors, typography, radii, spacing, shadows } from '../../theme';
import { usePlayerStore } from '../../state/playerStore';

export function MiniPlayer() {
  const colors = useColors();
  const router = useRouter();
  const track = usePlayerStore((s) => s.track);
  const isPlaying = usePlayerStore((s) => s.status === 'playing');
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);

  const translateY = useSharedValue(0);
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY < -60) {
        router.push('/player');
      }
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!track) return null;

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.surfaceElevated,
            borderRadius: radii.lg,
            ...shadows.card,
          },
          animatedStyle,
        ]}
      >
        <Pressable
          style={styles.main}
          onPress={() => router.push('/player')}
          accessibilityRole="button"
          accessibilityLabel={`Now playing: ${track.title}`}
        >
          {track.artworkUri ? (
            <Image source={{ uri: track.artworkUri }} style={[styles.art, { borderRadius: radii.sm }]} />
          ) : (
            <View style={[styles.art, { borderRadius: radii.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>♪</Text>
            </View>
          )}
          <View style={styles.meta}>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary }]} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
              {track.artistName}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => toggle().catch(() => {})}
          style={styles.control}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          hitSlop={12}
        >
          <Text style={[styles.controlIcon, { color: colors.textPrimary }]}>
            {isPlaying ? '❚❚' : '▶'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => next().catch(() => {})}
          style={styles.control}
          accessibilityRole="button"
          accessibilityLabel="Next"
          hitSlop={12}
        >
          <Text style={[styles.controlIcon, { color: colors.textPrimary }]}>⏭</Text>
        </Pressable>

        <View style={[styles.progress, { backgroundColor: colors.border }]}>
          <View style={{ width: `${progress * 100}%`, height: 2, backgroundColor: colors.accent }} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 76,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    overflow: 'hidden',
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  art: { width: 44, height: 44 },
  meta: { flex: 1, gap: 2 },
  control: { padding: spacing.sm },
  controlIcon: { fontSize: 20 },
  progress: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },
});
