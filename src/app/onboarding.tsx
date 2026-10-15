import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useColors, typography, spacing, radii } from '../theme';
import { Button } from '../components/Button';
import { STORAGE_KEYS, APP_NAME, APP_TAGLINE } from '../constants';
import { localProvider } from '../providers/localProvider';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '♫',
    title: `Welcome to ${APP_NAME}`,
    message: 'A premium music experience that respects you. No subscriptions, no ads, no accounts.',
  },
  {
    icon: '◈',
    title: 'Your music, your device',
    message: 'Everything — playlists, favorites, history, downloads — stays on your phone. Private by design.',
  },
  {
    icon: '⤓',
    title: 'Listen offline',
    message: 'Scan your device for music you own, and download tracks where permitted for offline playback.',
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const finish = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.onboardingDone, '1');
    } catch {
      // best-effort
    }
    router.replace('/(tabs)');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      finish();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.icon, { color: colors.accent }]}>{item.icon}</Text>
            </View>
            <Text style={[typography.hero, { color: colors.textPrimary, textAlign: 'center' }]}>
              {item.title}
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>
              {item.message}
            </Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? colors.accent : colors.surfaceElevated,
                  width: i === index ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
        <Button
          title={index === SLIDES.length - 1 ? 'Start listening' : 'Next'}
          onPress={next}
        />
        {index < SLIDES.length - 1 && (
          <Pressable onPress={finish} style={{ marginTop: spacing.md }}>
            <Text style={[typography.callout, { color: colors.textMuted, textAlign: 'center' }]}>Skip</Text>
          </Pressable>
        )}
        {index === SLIDES.length - 1 && (
          <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md }]}>
            {APP_TAGLINE}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  icon: { fontSize: 52 },
  footer: { paddingHorizontal: spacing.xxxl, paddingBottom: spacing.huge },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  dot: { height: 8, borderRadius: radii.full },
});
