import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useColors, typography, spacing, radii } from '../../theme';
import { useLibraryStore } from '../../state/libraryStore';
import { usePlayerStore } from '../../state/playerStore';
import { SongRow } from '../../components/SongRow';
import { EmptyState } from '../../components/EmptyState';
import { SectionHeader } from '../../components/IconButton';
import { Button } from '../../components/Button';
import { MiniPlayer } from '../../features/player/MiniPlayer';
import { localProvider } from '../../providers/localProvider';

type Tab = 'songs' | 'playlists' | 'favorites';

export default function LibraryScreen() {
  const colors = useColors();
  const [tab, setTab] = useState<Tab>('songs');
  const [scanning, setScanning] = useState(false);
  const {
    tracks,
    playlists,
    favorites,
    refresh,
    createPlaylist,
  } = useLibraryStore();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrackId = usePlayerStore((s) => s.track?.id);

  const scan = async () => {
    setScanning(true);
    try {
      const count = await localProvider.scanLibrary();
      await refresh();
      Alert.alert('Scan complete', `Found ${count} audio files on your device.`);
    } catch (e) {
      Alert.alert('Scan failed', e instanceof Error ? e.message : 'Could not scan device storage.');
    } finally {
      setScanning(false);
    }
  };

  const newPlaylist = () => {
    Alert.prompt(
      'New playlist',
      'Give your playlist a name',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: (name?: string) => {
            if (name?.trim()) createPlaylist(name.trim()).catch(() => {});
          },
        },
      ],
      'plain-text',
    );
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'songs', label: 'Songs' },
    { key: 'playlists', label: 'Playlists' },
    { key: 'favorites', label: 'Favorites' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.hero, { color: colors.textPrimary, paddingHorizontal: spacing.lg, paddingTop: 56 }]}>
        Library
      </Text>

      <View style={[styles.tabRow, { paddingHorizontal: spacing.lg }]}>
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[
              styles.tab,
              {
                backgroundColor: tab === t.key ? colors.accentSoft : 'transparent',
                borderRadius: radii.full,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
          >
            <Text
              style={[
                typography.callout,
                { color: tab === t.key ? colors.accent : colors.textSecondary },
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {tab === 'songs' && (
          <>
            <View style={{ paddingHorizontal: spacing.lg, marginVertical: spacing.md }}>
              <Button
                title={scanning ? 'Scanning…' : tracks.length > 0 ? 'Rescan device music' : 'Scan device music'}
                variant="secondary"
                onPress={scan}
                disabled={scanning}
              />
            </View>
            {tracks.length === 0 ? (
              <EmptyState
                icon="♫"
                title="No songs yet"
                message="Your device music will appear here after a scan."
              />
            ) : (
              tracks.map((t) => (
                <SongRow
                  key={t.id}
                  track={t}
                  isPlaying={t.id === currentTrackId}
                  onPress={() => playTrack(t, tracks).catch(() => {})}
                />
              ))
            )}
          </>
        )}

        {tab === 'playlists' && (
          <>
            <View style={{ paddingHorizontal: spacing.lg, marginVertical: spacing.md }}>
              <Button title="+ New playlist" variant="secondary" onPress={newPlaylist} />
            </View>
            {playlists.length === 0 ? (
              <EmptyState
                icon="▤"
                title="No playlists"
                message="Create playlists to organize your music. Everything is stored on your device."
              />
            ) : (
              playlists.map((p) => (
                <Pressable key={p.id} style={[styles.playlistRow, { paddingHorizontal: spacing.lg }]}>
                  <View style={[styles.playlistArt, { backgroundColor: colors.surfaceElevated, borderRadius: radii.md }]}>
                    <Text style={{ fontSize: 24, color: colors.textMuted }}>▤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>{p.name}</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {p.trackIds.length} songs
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </>
        )}

        {tab === 'favorites' && (
          <>
            {favorites.length > 0 && (
              <SectionHeader title={`${favorites.length} liked songs`} />
            )}
            {favorites.length === 0 ? (
              <EmptyState
                icon="♥"
                title="No favorites yet"
                message="Tap the heart on any song to save it here."
              />
            ) : (
              favorites.map((t) => (
                <SongRow
                  key={t.id}
                  track={t}
                  isPlaying={t.id === currentTrackId}
                  onPress={() => playTrack(t, favorites).catch(() => {})}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  tab: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  playlistRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  playlistArt: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
});
