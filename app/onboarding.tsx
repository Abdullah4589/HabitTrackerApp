import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../src/store';
import { Colors, HabitColors, Radii, Spacing } from '../src/theme';
import { requestNotificationPermissions, scheduleHabitReminders } from '../src/notifications';

const { width: SW } = Dimensions.get('window');

const ICONS = ['🏃', '💧', '📖', '🧘', '💪', '🥗', '😴', '🚴', '✍️', '🎯',
               '🧠', '🎨', '🎵', '🌿', '☀️', '🏊', '🧹', '💊', '📵', '🙏'];

// Steps: 0=Welcome, 1=HowItWorks, 2=Name, 3=Habit, 4=Challenge
const TOTAL_STEPS = 5;

export default function Onboarding() {
  const router = useRouter();
  const completeOnboarding = useStore(s => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [userName, setUserName] = useState('');
  const [habitName, setHabitName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🏃');
  const [selectedColor, setSelectedColor] = useState(HabitColors[0]);
  const [habitType, setHabitType] = useState<'daily' | 'volume'>('daily');
  const [targetCount, setTargetCount] = useState(3);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const goTo = (next: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -SW, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(SW);
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }).start();
    });
  };

  const handleFinish = async () => {
    const name = habitName.trim() || 'My Habit';
    completeOnboarding(userName.trim(), {
      name,
      icon: selectedIcon,
      color: selectedColor,
      type: habitType,
      targetCount: habitType === 'daily' ? 1 : targetCount,
    });

    router.replace('/(tabs)');

    // Notifications are optional — set up in the background after navigating
    requestNotificationPermissions().then(granted => {
      if (!granted) return;
      scheduleHabitReminders([{
        id: 'tmp',
        name,
        icon: selectedIcon,
        color: selectedColor,
        type: habitType,
        targetCount: habitType === 'daily' ? 1 : targetCount,
        createdAt: new Date().toISOString(),
      }]).catch(() => {});
    }).catch(() => {});
  };

  // Progress dots
  const dots = Array.from({ length: TOTAL_STEPS });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Step dots */}
        {step > 0 && (
          <View style={styles.dots}>
            {dots.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < step && styles.dotActive, i === step && styles.dotCurrent]}
              />
            ))}
          </View>
        )}

        <Animated.View style={[styles.screen, { transform: [{ translateX: slideAnim }] }]}>
          {step === 0 && <StepWelcome onNext={() => goTo(1)} />}
          {step === 1 && <StepHowItWorks onNext={() => goTo(2)} />}
          {step === 2 && (
            <StepName
              value={userName}
              onChange={setUserName}
              onNext={() => goTo(3)}
              onSkip={() => goTo(3)}
            />
          )}
          {step === 3 && (
            <StepHabit
              habitName={habitName}
              setHabitName={setHabitName}
              selectedIcon={selectedIcon}
              setSelectedIcon={setSelectedIcon}
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
              habitType={habitType}
              setHabitType={setHabitType}
              targetCount={targetCount}
              setTargetCount={setTargetCount}
              onNext={() => goTo(4)}
            />
          )}
          {step === 4 && (
            <StepChallenge
              habitName={habitName || 'your habit'}
              icon={selectedIcon}
              color={selectedColor}
              onFinish={handleFinish}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.stepCenter}>
      <Text style={styles.bigEmoji}>🌱</Text>
      <Text style={styles.headline}>Build habits that{'\n'}actually stick.</Text>
      <Text style={styles.sub}>
        Track your habits, earn rewards, and stay consistent with daily challenges.
      </Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={onNext} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

function StepHowItWorks({ onNext }: { onNext: () => void }) {
  const features = [
    { emoji: '📝', title: 'Create Habits', desc: 'Set up habits with icons, colors, and daily or volume targets.' },
    { emoji: '✅', title: 'Track Daily', desc: 'Check off habits each day to build streaks and earn milestones.' },
    { emoji: '🏆', title: 'Earn Rewards', desc: 'Complete challenges like the 3-Day Kickstart to unlock badges.' },
    { emoji: '🔔', title: 'Stay Notified', desc: 'Set custom reminders for each habit at the time that works for you.' },
  ];
  return (
    <ScrollView
      contentContainerStyle={styles.stepPad}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.stepHeading}>How it works</Text>
      <Text style={styles.stepSub}>Here's everything you can do in HabitTracker.</Text>
      {features.map(f => (
        <View key={f.title} style={styles.featureCard}>
          <Text style={styles.featureEmoji}>{f.emoji}</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>{f.title}</Text>
            <Text style={styles.featureDesc}>{f.desc}</Text>
          </View>
        </View>
      ))}
      <TouchableOpacity
        style={[styles.primaryBtn, { marginTop: 24 }]}
        onPress={onNext}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Got it →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StepName({
  value, onChange, onNext, onSkip,
}: {
  value: string; onChange: (v: string) => void; onNext: () => void; onSkip: () => void;
}) {
  return (
    <View style={styles.stepPad}>
      <Text style={styles.stepHeading}>What should we call you?</Text>
      <Text style={styles.stepSub}>We'll use this to personalize your experience.</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Your name"
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChange}
        returnKeyType="next"
        onSubmitEditing={onNext}
        autoFocus
      />
      <TouchableOpacity
        style={[styles.primaryBtn, { marginTop: 20 }]}
        onPress={onNext}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Continue</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

function StepHabit({
  habitName, setHabitName,
  selectedIcon, setSelectedIcon,
  selectedColor, setSelectedColor,
  habitType, setHabitType,
  targetCount, setTargetCount,
  onNext,
}: any) {
  return (
    <ScrollView
      contentContainerStyle={styles.stepPad}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.stepHeading}>Create your first habit</Text>
      <Text style={styles.stepSub}>You can add more later.</Text>

      <Text style={styles.label}>Habit name</Text>
      <TextInput
        style={styles.textInput}
        placeholder="e.g. Morning Run"
        placeholderTextColor={Colors.textMuted}
        value={habitName}
        onChangeText={setHabitName}
      />

      <Text style={styles.label}>Icon</Text>
      <View style={styles.iconGrid}>
        {ICONS.map(ic => (
          <TouchableOpacity
            key={ic}
            onPress={() => setSelectedIcon(ic)}
            style={[styles.iconCell, selectedIcon === ic && { backgroundColor: selectedColor + '33', borderColor: selectedColor }]}
          >
            <Text style={styles.iconEmoji}>{ic}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Color</Text>
      <View style={styles.colorRow}>
        {HabitColors.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setSelectedColor(c)}
            style={[styles.colorSwatch, { backgroundColor: c }, selectedColor === c && styles.colorSwatchSelected]}
          />
        ))}
      </View>

      <Text style={styles.label}>Type</Text>
      <View style={styles.typeToggle}>
        {(['daily', 'volume'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setHabitType(t)}
            style={[styles.typeBtn, habitType === t && { backgroundColor: selectedColor }]}
          >
            <Text style={[
              styles.typeBtnText,
              habitType === t ? styles.typeBtnTextActive : styles.typeBtnTextInactive,
            ]}>
              {t === 'daily' ? 'Once per day' : 'Volume (count)'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {habitType === 'volume' && (
        <View style={styles.counterRow}>
          <Text style={styles.counterLabel}>Daily target</Text>
          <View style={styles.counter}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setTargetCount((c: number) => Math.max(2, c - 1))}
            >
              <Text style={styles.counterBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>{targetCount}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setTargetCount((c: number) => Math.min(20, c + 1))}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: selectedColor, marginTop: 28 }]}
        onPress={onNext}
        activeOpacity={0.85}
        disabled={!habitName.trim()}
      >
        <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StepChallenge({
  habitName, icon, color, onFinish,
}: { habitName: string; icon: string; color: string; onFinish: () => void }) {
  return (
    <View style={styles.stepCenter}>
      <Text style={styles.bigEmoji}>{icon}</Text>
      <Text style={styles.headline}>3-Day{'\n'}Kickstart!</Text>
      <Text style={styles.sub}>
        You've started a <Text style={{ color, fontWeight: '700' }}>3-day challenge</Text> for{' '}
        <Text style={{ color: Colors.textPrimary, fontWeight: '600' }}>"{habitName}"</Text>.
        {'\n\n'}Complete it every day for 3 days to earn your first reward.
      </Text>
      <View style={styles.dayDots}>
        {[1, 2, 3].map(d => (
          <View key={d} style={[styles.dayDot, { borderColor: color }]}>
            <Text style={[styles.dayDotText, { color }]}>{d}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: color }]}
        onPress={onFinish}
        activeOpacity={0.85}
      >
        <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>Let's go! 🚀</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    paddingBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.textMuted,
  },
  dotCurrent: {
    backgroundColor: Colors.accent,
    width: 18,
  },
  screen: {
    flex: 1,
  },
  stepCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  stepPad: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  bigEmoji: {
    fontSize: 72,
    marginBottom: Spacing.md,
  },
  headline: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
  },
  sub: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  stepHeading: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  stepSub: {
    fontSize: 15,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  featureEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: 15,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  iconEmoji: {
    fontSize: 22,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: Colors.textPrimary,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  typeBtnTextInactive: {
    color: Colors.textPrimary,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  counterLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  counterValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  dayDots: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: Spacing.xl,
  },
  dayDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotText: {
    fontSize: 20,
    fontWeight: '700',
  },
});
