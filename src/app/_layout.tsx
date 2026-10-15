import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme';
import { useSettingsStore } from '../state/settingsStore';
import { useInitPlayer } from '../state/playerStore';
import { useLibraryStore } from '../state/libraryStore';
import { ensureStorageDirs } from '../storage/storageService';
import { getDatabase } from '../database';
import { STORAGE_KEYS } from '../constants';
import { ToastHost } from '../components/Toast';

export default function RootLayout() {
  const resolvedMode = useTheme((s) => s.resolvedMode);
  const loadSettings = useSettingsStore((s) => s.load);
  const refreshLibrary = useLibraryStore((s) => s.refresh);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  useInitPlayer();

  useEffect(() => {
    (async () => {
      try {
        await getDatabase();
        await ensureStorageDirs();
        await loadSettings();
        const done = await AsyncStorage.getItem(STORAGE_KEYS.onboardingDone);
        setShowOnboarding(done !== '1');
        await refreshLibrary();
      } catch {
        // startup best-effort; screens handle empty states
      } finally {
        setOnboardingChecked(true);
      }
    })();
  }, [loadSettings, refreshLibrary]);

  if (!onboardingChecked) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          {showOnboarding ? (
            <Stack.Screen name="onboarding" />
          ) : (
            <>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="player"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="queue"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
            </>
          )}
        </Stack>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
