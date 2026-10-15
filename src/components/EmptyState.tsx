import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors, typography, spacing, radii } from '../theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '♪', title, message, actionLabel, onAction }: EmptyStateProps) {
  const colors = useColors();
  return (
    <View style={[styles.container, { paddingHorizontal: spacing.xxxl }]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: colors.surfaceElevated, borderRadius: radii.full },
        ]}
      >
        <Text style={[styles.icon, { color: colors.textMuted }]}>{icon}</Text>
      </View>
      <Text style={[typography.title3, { color: colors.textPrimary, textAlign: 'center' }]}>
        {title}
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
        {message}
      </Text>
      {actionLabel && onAction && (
        <Button title={actionLabel} variant="secondary" onPress={onAction} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.huge,
  },
  iconCircle: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 36,
  },
});
