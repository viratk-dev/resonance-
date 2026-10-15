import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useColors, typography, spacing, radii } from '../../theme';
import { useDownloadStore } from '../../services/downloadService';
import { usePlayerStore } from '../../state/playerStore';
import { EmptyState } from '../../components/EmptyState';
import { SectionHeader } from '../../components/IconButton';
import { MiniPlayer } from '../../features/player/MiniPlayer';
import { getStorageUsage, formatBytes } from '../../storage/storageService';
import { getTrackById } from '../../database';
import type { DownloadEntry } from '../../types';
import { useState } from 'react';

function DownloadRow({ entry }: { entry: DownloadEntry }) {
  const colors = useColors();
  const { pause, resume, cancel, remove } = useDownloadStore();
  const [title, setTitle] = useState(entry.trackId);

  useEffect(() => {
    getTrackById(entry.trackId).then((t) => t && setTitle(t.title)).catch(() => {});
  }, [entry.trackId]);

  const statusLabel: Record<DownloadEntry['status'], string> = {
    queued: 'Queued',
    downloading: `Downloading… ${Math.round(entry.progress * 100)}%`,
    paused: 'Paused',
    completed: 'Completed',
    failed: entry.error || 'Failed',
    cancelled: 'Cancelled',
  };

  return (
    <View style={[styles.row, { paddingHorizontal: spacing.lg }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[typography.bodyMedium, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[typography.caption, { color: entry.status === 'failed' ? colors.error : colors.textSecondary }]} numberOfLines={1}>
          {statusLabel[entry.status]}
        </Text>
        {['downloading', 'paused'].includes(entry.status) && (
          <View style={[styles.bar, { backgroundColor: colors.surfaceElevated, borderRadius: radii.full }]}>
            <View
              style={{
                width: `${Math.round(entry.progress * 100)}%`,
                height: 4,
                backgroundColor: colors.accent,
                borderRadius: radii.full,
              }}
            />
          </View>
        )}
      </View>
      {entry.status === 'downloading' && (
        <Pressable onPress={() => pause(entry.id)}><Text style={[styles.action, { color: colors.accent }]}>❚❚</Text></Pressable>
      )}
      {['paused', 'failed'].includes(entry.status) && (
        <Pressable onPress={() => resume(entry.id)}><Text style={[styles.action, { color: colors.accent }]}>▶</Text></Pressable>
      )}
      {['completed', 'failed', 'cancelled'].includes(entry.status) && (
        <Pressable onPress={() => remove(entry.id)}><Text style={[styles.action, { color: colors.textMuted }]}>✕</Text></Pressable>
      )}
      {entry.status === 'queued' && (
        <Pressable onPress={() => cancel(entry.id)}><Text style={[styles.action, { color: colors.textMuted }]}>✕</Text></Pressable>
      )}
    </View>
  );
}

export default function DownloadsScreen() {
  const colors = useColors();
  const { downloads, load } = useDownloadStore();
  const [usage, setUsage] = useState({ musicBytes: 0, artworkBytes: 0, cacheBytes: 0, totalBytes: 0 });

  useEffect(() => {
    load().catch(() => {});
    getStorageUsage().then(setUsage).catch(() => {});
  }, [load]);

  const active = downloads.filter((d) => ['queued', 'downloading', 'paused'].includes(d.status));
  const finished = downloads.filter((d) => ['completed', 'failed', 'cancelled'].includes(d.status));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.hero, { color: colors.textPrimary, paddingHorizontal: spacing.lg, paddingTop: 56 }]}>
        Downloads
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary, paddingHorizontal: spacing.lg, marginTop: spacing.xs }]}>
        {formatBytes(usage.totalBytes)} used • offline-ready tracks appear in Library
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {downloads.length === 0 ? (
          <EmptyState
            icon="⤓"
            title="No downloads"
            message="Download tracks where permitted and they'll play without internet."
          />
        ) : (
          <>
            {active.length > 0 && (
              <>
                <SectionHeader title="Active" />
                {active.map((d) => <DownloadRow key={d.id} entry={d} />)}
              </>
            )}
            {finished.length > 0 && (
              <>
                <SectionHeader title="Finished" />
                {finished.map((d) => <DownloadRow key={d.id} entry={d} />)}
              </>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  bar: { height: 4, overflow: 'hidden', marginTop: 4 },
  action: { fontSize: 18, padding: spacing.sm },
});
