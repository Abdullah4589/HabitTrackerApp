import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { setupNotificationHandler } from '../src/notifications';
import { Colors } from '../src/theme';

setupNotificationHandler();

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Screen name="index" />
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
