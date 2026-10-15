import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useColors, typography, radii, spacing } from '../theme';
import type { Track } from '../types';

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

interface SongRowProps {
  track: Track;
  index?: number;
  showArtwork?: boolean;
  showDuration?: boolean;
  isPlaying?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function SongRow({
  track,
  index,
  showArtwork = true,
  showDuration = true,
  isPlaying = false,
  onPress,
  onLongPress,
}: SongRowProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        { paddingHorizontal: spacing.lg, opacity: pressed ? 0.7 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${track.title} by ${track.artistName}`}
    >
      {showArtwork ? (
        track.artworkUri ? (
          <Image source={{ uri: track.artworkUri }} style={[styles.artwork, { borderRadius: radii.sm }]} />
        ) : (
          <View style={[styles.artwork, { borderRadius: radii.sm, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>♪</Text>
          </View>
        )
      ) : (
        typeof index === 'number' && (
          <Text style={[typography.callout, { color: colors.textMuted, width: 28, textAlign: 'center' }]}>
            {index + 1}
          </Text>
        )
      )}

      <View style={styles.meta}>
        <Text
          style={[typography.bodyMedium, { color: isPlaying ? colors.accent : colors.textPrimary }]}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
          {track.artistName}
          {track.isDownloaded ? '  •  Offline' : ''}
        </Text>
      </View>

      {showDuration && (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {formatDuration(track.durationMs)}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  artwork: {
    width: 48,
    height: 48,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
});
