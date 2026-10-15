import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle, type DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useColors, radii } from '../theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius, style }: SkeletonProps) {
  const colors = useColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.5, 1, 0.5]),
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? radii.sm,
          backgroundColor: colors.skeleton,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          { flex: 1, backgroundColor: colors.skeletonHighlight },
          animatedStyle,
        ]}
      />
    </View>
  );
}

export function SongRowSkeleton() {
  return (
    <View style={[styles.row, { paddingHorizontal: 16 }]}>
      <Skeleton width={48} height={48} borderRadius={10} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="45%" height={12} />
      </View>
      <Skeleton width={36} height={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
});
