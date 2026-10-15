import React from 'react';
import { Pressable, Text, View, StyleSheet, type PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors, typography, radii, spacing } from '../theme';
import { useSettingsStore } from '../state/settingsStore';

interface IconButtonProps extends PressableProps {
  children: React.ReactNode;
  label: string;
  size?: number;
  filled?: boolean;
}

export function IconButton({ children, label, size = 44, filled = false, onPress, ...rest }: IconButtonProps) {
  const colors = useColors();
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  const handlePress = (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: filled ? colors.surfaceElevated : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const colors = useColors();
  return (
    <View style={[styles.row, { paddingHorizontal: spacing.lg, marginBottom: spacing.sm }]}>
      <Text style={[typography.title2, { color: colors.textPrimary }]}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text style={[typography.callout, { color: colors.accent }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
