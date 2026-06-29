import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useStore } from '../src/store';
import { Colors } from '../src/theme';

export default function Index() {
  const userId = useStore(s => s.userId);
  const onboardingComplete = useStore(s => s.onboardingComplete);
  const isHydrating = useStore(s => s.isHydrating);

  if (isHydrating) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!userId) return <Redirect href="/auth" />;
  return <Redirect href={onboardingComplete ? '/(tabs)' : '/onboarding'} />;
}
