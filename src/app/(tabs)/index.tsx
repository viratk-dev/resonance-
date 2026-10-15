import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, typography, spacing, radii } from '../../theme';
import { useLibraryStore } from '../../state/libraryStore';
import { usePlayerStore } from '../../state/playerStore';
import { SongRow } from '../../components/SongRow';
import { SongRowSkeleton } from '../../components/Skeleton';
import { SectionHeader } from '../../components/IconButton';
import { EmptyState } from '../../components/EmptyState';
import { MiniPlayer } from '../../features/player/MiniPlayer';
import type { Track } from '../../types';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function TrackCard({ track, onPress }: { track: Track; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={[styles.card, { width: 140 }]}>
      {track.artworkUri ? (
        <Image source={{ uri: track.artworkUri }} style={[styles.cardArt, { borderRadius: radii.md }]} />
      ) : (
        <View style={[styles.cardArt, { borderRadius: radii.md, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 32, color: colors.textMuted }}>♪</Text>
        </View>
      )}
      <Text style={[typography.callout, { color: colors.textPrimary, marginTop: spacing.sm }]} numberOfLines={1}>
        {track.title}
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
        {track.artistName}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { tracks, recentlyPlayed, mostPlayed, favorites, isLoading, refresh, trackCount } =
    useLibraryStore();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrackId = usePlayerStore((s) => s.track?.id);

  const onRefresh = useCallback(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const play = useCallback(
    (track: Track, context: Track[]) => {
      playTrack(track, context).catch(() => {});
    },
    [playTrack],
  );

  const hasMusic = tracks.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[typography.hero, { color: colors.textPrimary }]}>{greeting()}</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/search')}
            style={[styles.searchShortcut, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <Text style={{ color: colors.textMuted, fontSize: 16 }}>⌕</Text>
            <Text style={[typography.body, { color: colors.textMuted }]}>Search songs, artists…</Text>
          </Pressable>
        </View>

        {isLoading && !hasMusic ? (
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <SongRowSkeleton key={i} />
            ))}
          </View>
        ) : !hasMusic ? (
          <EmptyState
            icon="♫"
            title="No music yet"
            message="Scan your device to find the music you own. Everything stays on your phone — no account, no cloud."
            actionLabel="Scan device music"
            onAction={() => router.push('/(tabs)/library')}
          />
        ) : (
          <>
            {recentlyPlayed.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Recently played" actionLabel="See all" onAction={() => router.push('/(tabs)/library')} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                  {recentlyPlayed.slice(0, 10).map((t) => (
                    <TrackCard key={t.id} track={t} onPress={() => play(t, recentlyPlayed)} />
                  ))}
                </ScrollView>
              </View>
            )}

            {mostPlayed.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Most played" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                  {mostPlayed.slice(0, 10).map((t) => (
                    <TrackCard key={t.id} track={t} onPress={() => play(t, mostPlayed)} />
                  ))}
                </ScrollView>
              </View>
            )}

            {favorites.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Your favorites" />
                {favorites.slice(0, 5).map((t) => (
                  <SongRow
                    key={t.id}
                    track={t}
                    isPlaying={t.id === currentTrackId}
                    onPress={() => play(t, favorites)}
                  />
                ))}
              </View>
            )}

            <View style={styles.section}>
              <SectionHeader title="All songs" actionLabel={`${trackCount} tracks`} />
              {tracks.slice(0, 8).map((t) => (
                <SongRow
                  key={t.id}
                  track={t}
                  isPlaying={t.id === currentTrackId}
                  onPress={() => play(t, tracks)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 120 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, gap: spacing.md },
  searchShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  section: { marginTop: spacing.xl },
  rail: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: {},
  cardArt: { width: 140, height: 140 },
});
