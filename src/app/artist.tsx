import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useColors, typography, spacing, radii } from '../theme';
import { usePlayerStore } from '../state/playerStore';
import { useLibraryStore } from '../state/libraryStore';
import { SongRow } from '../components/SongRow';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { MiniPlayer } from '../features/player/MiniPlayer';
import type { Track } from '../types';

const HEADER_MAX = 280;
const HEADER_MIN = 120;

export default function ArtistScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const tracks = useLibraryStore((s) => s.tracks);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrackId = usePlayerStore((s) => s.track?.id);
  const [artistTracks, setArtistTracks] = useState<Track[]>([]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const headerStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, HEADER_MAX - HEADER_MIN], [HEADER_MAX, HEADER_MIN], Extrapolate.CLAMP),
    opacity: interpolate(scrollY.value, [0, HEADER_MAX - HEADER_MIN], [1, 0.9], Extrapolate.CLAMP),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(scrollY.value, [0, HEADER_MAX - HEADER_MIN], [1, 0.75], Extrapolate.CLAMP),
      },
    ],
  }));

  useEffect(() => {
    setArtistTracks(tracks.filter((t) => t.artistId === id));
  }, [tracks, id]);

  const artistName = name || artistTracks[0]?.artistName || 'Unknown Artist';

  if (artistTracks.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="○" title="Artist not found" message="This artist is no longer in your library." />
      </View>
    );
  }

  const artwork = artistTracks.find((t) => t.artworkUri)?.artworkUri;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, { backgroundColor: colors.surface }, headerStyle]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
            <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
          </Pressable>
          {artwork ? (
            <Image source={{ uri: artwork }} style={[styles.artwork, { borderRadius: radii.lg }]} />
          ) : (
            <View style={[styles.artwork, { borderRadius: radii.lg, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 48, color: colors.textMuted }}>○</Text>
            </View>
          )}
          <Animated.Text style={[typography.hero, { color: colors.textPrimary, marginTop: spacing.md }, titleStyle]}>
            {artistName}
          </Animated.Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {artistTracks.length} songs
          </Text>
        </Animated.View>

        <View style={styles.actions}>
          <Button title="▶  Play" onPress={() => artistTracks[0] && playTrack(artistTracks[0], artistTracks).catch(() => {})} />
          <Button
            title="⇆  Shuffle"
            variant="secondary"
            onPress={() => {
              const shuffled = [...artistTracks].sort(() => Math.random() - 0.5);
              if (shuffled[0]) playTrack(shuffled[0], shuffled).catch(() => {});
            }}
          />
        </View>

        <Text style={[typography.title3, { color: colors.textPrimary, paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
          Popular
        </Text>
        {artistTracks
          .slice()
          .sort((a, b) => b.playCount - a.playCount)
          .slice(0, 10)
          .map((t, i) => (
            <SongRow
              key={t.id}
              track={t}
              index={i}
              showArtwork={false}
              isPlaying={t.id === currentTrackId}
              onPress={() => playTrack(t, artistTracks).catch(() => {})}
            />
          ))}
      </Animated.ScrollView>
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: spacing.lg, overflow: 'hidden' },
  backBtn: { position: 'absolute', top: 56, left: spacing.lg, zIndex: 10 },
  artwork: { width: 140, height: 140, marginTop: 80 },
  actions: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xxxl, marginTop: spacing.lg },
});
