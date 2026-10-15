import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors, typography, spacing, radii } from '../../theme';
import { useLibraryStore } from '../../state/libraryStore';
import { usePlayerStore } from '../../state/playerStore';
import { SongRow } from '../../components/SongRow';
import { SongRowSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { SectionHeader } from '../../components/IconButton';
import { MiniPlayer } from '../../features/player/MiniPlayer';
import { SEARCH_DEBOUNCE_MS, MAX_RECENT_SEARCHES, STORAGE_KEYS } from '../../constants';
import type { Track } from '../../types';

export default function SearchScreen() {
  const colors = useColors();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useLibraryStore((s) => s.search);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrackId = usePlayerStore((s) => s.track?.id);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.recentSearches)
      .then((raw) => raw && setRecent(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const saveRecent = async (q: string) => {
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, MAX_RECENT_SEARCHES);
    setRecent(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.recentSearches, JSON.stringify(next));
    } catch {
      // best-effort
    }
  };

  const runSearch = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const tracks = await search(trimmed);
      setResults(tracks);
      setHasSearched(true);
      saveRecent(trimmed).catch(() => {});
    } finally {
      setSearching(false);
    }
  };

  const onChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text), SEARCH_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={onChangeText}
          placeholder="Songs, artists, albums…"
          placeholderTextColor={colors.textMuted}
          style={[typography.body, { color: colors.textPrimary, flex: 1 }]}
          returnKeyType="search"
          onSubmitEditing={() => runSearch(query)}
          accessibilityLabel="Search music"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Text
            onPress={() => {
              setQuery('');
              setResults([]);
              setHasSearched(false);
            }}
            style={{ color: colors.textMuted, fontSize: 16, padding: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            ✕
          </Text>
        )}
      </View>

      {searching ? (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, marginTop: spacing.md }}>
          {[0, 1, 2, 3].map((i) => (
            <SongRowSkeleton key={i} />
          ))}
        </View>
      ) : !hasSearched ? (
        <View style={{ marginTop: spacing.md }}>
          {recent.length > 0 && (
            <>
              <SectionHeader title="Recent searches" />
              {recent.map((r) => (
                <Text
                  key={r}
                  onPress={() => {
                    setQuery(r);
                    runSearch(r);
                  }}
                  style={[
                    typography.body,
                    { color: colors.textSecondary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
                  ]}
                >
                  ◷  {r}
                </Text>
              ))}
            </>
          )}
          {recent.length === 0 && (
            <EmptyState
              icon="⌕"
              title="Search your music"
              message="Find songs, artists and albums across your device library."
            />
          )}
        </View>
      ) : results.length === 0 ? (
        <EmptyState
          icon="∅"
          title="No results"
          message={`Nothing found for "${query}". Try a different spelling or scan more music.`}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <SongRow
              track={item}
              isPlaying={item.id === currentTrackId}
              onPress={() => playTrack(item, results).catch(() => {})}
            />
          )}
          keyboardShouldPersistTaps="handled"
        />
      )}
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
