import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors, typography, spacing, radii, shadows } from '../theme';
import { usePlayerStore } from '../state/playerStore';
import { useLibraryStore } from '../state/libraryStore';
import { SongRow } from '../components/SongRow';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { MiniPlayer } from '../features/player/MiniPlayer';
import { toast } from '../components/Toast';
import type { Track } from '../types';

export default function AlbumScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tracks = useLibraryStore((s) => s.tracks);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrackId = usePlayerStore((s) => s.track?.id);
  const [albumTracks, setAlbumTracks] = useState<Track[]>([]);

  useEffect(() => {
    setAlbumTracks(tracks.filter((t) => t.albumId === id));
  }, [tracks, id]);

  const album = albumTracks[0];
  if (!album) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="◉" title="Album not found" message="This album is no longer in your library." />
      </View>
    );
  }

  const playAll = (shuffle = false) => {
    const list = shuffle ? [...albumTracks].sort(() => Math.random() - 0.5) : albumTracks;
    if (list[0]) playTrack(list[0], list).catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
        </Pressable>

        <View style={styles.header}>
          {album.artworkUri ? (
            <Image source={{ uri: album.artworkUri }} style={[{ width: 200, height: 200, borderRadius: radii.lg }, shadows.artwork]} />
          ) : (
            <View style={[{ width: 200, height: 200, borderRadius: radii.lg, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }, shadows.artwork]}>
              <Text style={{ fontSize: 64, color: colors.textMuted }}>◉</Text>
            </View>
          )}
          <Text style={[typography.title1, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.lg }]}>
            {album.albumTitle}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {album.artistName}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
            {albumTracks.length} songs{album.year ? ` • ${album.year}` : ''}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button title="▶  Play" onPress={() => playAll(false)} />
          <Button title="⇆  Shuffle" variant="secondary" onPress={() => playAll(true)} />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          {albumTracks.map((t, i) => (
            <SongRow
              key={t.id}
              track={t}
              index={i}
              showArtwork={false}
              isPlaying={t.id === currentTrackId}
              onPress={() => playTrack(t, albumTracks).catch(() => {})}
              onLongPress={() => toast('Long-press actions coming soon')}
            />
          ))}
        </View>
      </ScrollView>
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },
  backBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  header: { alignItems: 'center', paddingHorizontal: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xxxl, marginTop: spacing.xl },
});
