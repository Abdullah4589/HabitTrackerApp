import { Stack } from 'expo-router';
import { Colors } from '../../src/theme';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
