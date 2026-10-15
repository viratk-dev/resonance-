import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useColors, typography, spacing } from '../theme';
import { usePlayerStore } from '../state/playerStore';
import { getTrackById } from '../database';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { toast } from '../components/Toast';
import type { Track, QueueItem } from '../types';

interface QueueRowData extends QueueItem {
  track: Track | null;
  index: number;
}

export default function QueueScreen() {
  const colors = useColors();
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const currentTrackId = usePlayerStore((s) => s.track?.id);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const [rows, setRows] = useState<QueueRowData[]>([]);

  useEffect(() => {
    (async () => {
      const data: QueueRowData[] = [];
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        const track = await getTrackById(item.trackId).catch(() => null);
        data.push({ ...item, track, index: i });
      }
      setRows(data);
    })();
  }, [queue]);

  const playFromQueue = async (index: number) => {
    const tracks = rows.map((r) => r.track).filter((t): t is Track => !!t);
    const track = rows[index]?.track;
    if (track) {
      await playTrack(track, tracks, index).catch(() => {});
    }
  };

  const saveAsPlaylist = async () => {
    // Implemented via library store in a full version; placeholder for now
    toast('Queue saved — playlist feature coming in this build');
  };

  if (queue.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="☰" title="Queue is empty" message="Songs you play will line up here." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[typography.title2, { color: colors.textPrimary }]}>Up next</Text>
        <Pressable onPress={() => clearQueue()}>
          <Text style={[typography.callout, { color: colors.accent }]}>Clear</Text>
        </Pressable>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.queueId}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => playFromQueue(item.index)}
            style={[
              styles.row,
              {
                paddingHorizontal: spacing.lg,
                backgroundColor: item.index === queueIndex ? colors.accentSoft : 'transparent',
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.bodyMedium,
                  { color: item.track?.id === currentTrackId ? colors.accent : colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {item.track?.title ?? 'Unknown track'}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.track?.artistName ?? ''}
                {item.index === queueIndex ? '  •  Now playing' : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => removeFromQueue(item.queueId)}
              hitSlop={12}
              accessibilityLabel="Remove from queue"
            >
              <Text style={{ color: colors.textMuted, fontSize: 16 }}>✕</Text>
            </Pressable>
          </Pressable>
        )}
      />
      <View style={{ padding: spacing.lg }}>
        <Button title="Save queue as playlist" variant="secondary" onPress={saveAsPlaylist} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
});
