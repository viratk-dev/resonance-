import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { useColors, typography, spacing, radii, ACCENT_PRESETS } from '../../theme';
import { useSettingsStore } from '../../state/settingsStore';
import { useLibraryStore } from '../../state/libraryStore';
import { SectionHeader } from '../../components/IconButton';
import { MiniPlayer } from '../../features/player/MiniPlayer';
import { clearCache } from '../../storage/storageService';
import { clearAllData } from '../../database';
import { APP_NAME, APP_VERSION } from '../../constants';
import type { ThemeMode } from '../../types';

function Row({ label, description, right }: { label: string; description?: string; right: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { paddingHorizontal: spacing.lg }]}>
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>{label}</Text>
        {description && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{description}</Text>
        )}
      </View>
      {right}
    </View>
  );
}

function OptionChips<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { label: string; value: T }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.chips, { paddingHorizontal: spacing.lg }]}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onSelect(o.value)}
          style={[
            styles.chip,
            {
              backgroundColor: value === o.value ? colors.accentSoft : colors.surface,
              borderColor: value === o.value ? colors.accent : colors.border,
              borderRadius: radii.full,
            },
          ]}
        >
          <Text style={[typography.callout, { color: value === o.value ? colors.accent : colors.textSecondary }]}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const settings = useSettingsStore();
  const clearHistory = useLibraryStore((s) => s.clearHistory);

  const clearCacheAction = async () => {
    await clearCache();
    Alert.alert('Done', 'Cache cleared.');
  };

  const clearDataAction = () => {
    Alert.alert(
      'Clear all data?',
      'This removes your library, playlists, favorites and history from this device. Downloaded files are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Done', 'Local database cleared.');
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.hero, { color: colors.textPrimary, paddingHorizontal: spacing.lg, paddingTop: 56 }]}>
        Settings
      </Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Appearance" />
        <OptionChips<ThemeMode>
          options={[
            { label: 'Dark', value: 'dark' },
            { label: 'Light', value: 'light' },
            { label: 'System', value: 'system' },
          ]}
          value={settings.theme}
          onSelect={(theme) => settings.update({ theme })}
        />
        <Text style={[typography.caption, { color: colors.textSecondary, paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm }]}>
          Accent color
        </Text>
        <View style={[styles.chips, { paddingHorizontal: spacing.lg }]}>
          {ACCENT_PRESETS.map((c) => (
            <Pressable
              key={c}
              onPress={() => settings.update({ accentColor: c })}
              style={[
                styles.swatch,
                {
                  backgroundColor: c,
                  borderWidth: settings.accentColor === c ? 3 : 0,
                  borderColor: colors.textPrimary,
                },
              ]}
              accessibilityLabel={`Accent ${c}`}
            />
          ))}
        </View>
        <Row
          label="Dynamic artwork colors"
          description="Tint the player with the current artwork"
          right={
            <Switch
              value={settings.dynamicArtworkColors}
              onValueChange={(v) => settings.update({ dynamicArtworkColors: v })}
              trackColor={{ true: colors.accent }}
            />
          }
        />

        <SectionHeader title="Playback" />
        <Row
          label="Gapless playback"
          right={
            <Switch value={settings.gapless} onValueChange={(v) => settings.update({ gapless: v })} trackColor={{ true: colors.accent }} />
          }
        />
        <Row
          label="Volume normalization"
          right={
            <Switch value={settings.normalization} onValueChange={(v) => settings.update({ normalization: v })} trackColor={{ true: colors.accent }} />
          }
        />
        <Row
          label="Haptic feedback"
          right={
            <Switch value={settings.hapticsEnabled} onValueChange={(v) => settings.update({ hapticsEnabled: v })} trackColor={{ true: colors.accent }} />
          }
        />

        <SectionHeader title="Downloads" />
        <Row
          label="Wi-Fi only"
          description="Only download on Wi-Fi connections"
          right={
            <Switch value={settings.wifiOnlyDownloads} onValueChange={(v) => settings.update({ wifiOnlyDownloads: v })} trackColor={{ true: colors.accent }} />
          }
        />

        <SectionHeader title="Privacy" />
        <Row
          label="Analytics"
          description="Off by default. Your listening stays on your device."
          right={
            <Switch value={settings.analyticsEnabled} onValueChange={(v) => settings.update({ analyticsEnabled: v })} trackColor={{ true: colors.accent }} />
          }
        />
        <Pressable onPress={clearCacheAction} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
          <Text style={[typography.bodyMedium, { color: colors.accent }]}>Clear cache</Text>
        </Pressable>
        <Pressable onPress={clearHistory} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
          <Text style={[typography.bodyMedium, { color: colors.accent }]}>Clear listening history</Text>
        </Pressable>
        <Pressable onPress={clearDataAction} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
          <Text style={[typography.bodyMedium, { color: colors.error }]}>Clear all local data</Text>
        </Pressable>

        <SectionHeader title="About" />
        <Row label="App" right={<Text style={[typography.body, { color: colors.textSecondary }]}>{APP_NAME}</Text>} />
        <Row label="Version" right={<Text style={[typography.body, { color: colors.textSecondary }]}>{APP_VERSION}</Text>} />
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Open-source, local-first music. Your music. Your data. Your device.
          </Text>
        </View>
      </ScrollView>
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  swatch: { width: 40, height: 40, borderRadius: 20 },
});
