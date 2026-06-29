import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { setupNotificationHandler } from '../src/notifications';
import { Colors } from '../src/theme';
import { supabase } from '../src/supabase';
import { useStore } from '../src/store';

setupNotificationHandler();

export default function RootLayout() {
  const hydrateFromRemote = useStore(s => s.hydrateFromRemote);
  const clearUserData = useStore(s => s.clearUserData);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const userId = session?.user?.id ?? null;
      if (userId) {
        await hydrateFromRemote(userId);
      } else {
        clearUserData();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="habit-modal"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  );
}
