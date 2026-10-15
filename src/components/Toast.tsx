import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { create } from 'zustand';
import { useColors, typography, radii, spacing, shadows } from '../theme';

interface ToastState {
  message: string | null;
  visible: boolean;
  show: (message: string) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  visible: false,
  show: (message: string) => {
    set({ message, visible: true });
  },
  hide: () => set({ visible: false, message: null }),
}));

export function toast(message: string): void {
  useToastStore.getState().show(message);
}

export function ToastHost() {
  const colors = useColors();
  const { message, visible, hide } = useToastStore();
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible && message) {
      translateY.value = withSpring(0, { damping: 20 });
      opacity.value = withTiming(1, { duration: 200 });
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(100, { duration: 200 }, () => {
          runOnJS(hide)();
        });
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [visible, message, translateY, opacity, hide]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!message) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceElevated, borderRadius: radii.lg, ...shadows.card },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Text style={[typography.callout, { color: colors.textPrimary, textAlign: 'center' }]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 150,
    left: spacing.xl,
    right: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    zIndex: 100,
  },
});
