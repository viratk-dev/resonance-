import React from 'react';
import { Pressable, Text, StyleSheet, type PressableProps, type TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors, typography, radii, spacing } from '../theme';
import { useSettingsStore } from '../state/settingsStore';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ title, variant = 'primary', size = 'md', onPress, ...rest }: ButtonProps) {
  const colors = useColors();
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  const handlePress = (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };

  const bg =
    variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.surfaceElevated : 'transparent';
  const textColor =
    variant === 'primary' ? '#FFFFFF' : variant === 'secondary' ? colors.textPrimary : colors.accent;

  const titleStyle: TextStyle =
    size === 'sm' ? typography.callout : size === 'lg' ? typography.title3 : typography.bodyMedium;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderRadius: radii.lg,
          paddingVertical: size === 'sm' ? spacing.sm : size === 'lg' ? spacing.lg : spacing.md,
          paddingHorizontal: spacing.xl,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      {...rest}
    >
      <Text style={[titleStyle, { color: textColor, textAlign: 'center' }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
