import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';

interface Habit {
  id: string;
  name: string;
  icon: string;
  completed: boolean;
  streak: number;
}

const INITIAL_HABITS: Habit[] = [
  { id: '1', name: 'Morning run',                icon: '🏃', completed: false, streak: 5  },
  { id: '2', name: 'Drink 8 glasses of water',   icon: '💧', completed: false, streak: 12 },
  { id: '3', name: 'Read for 30 minutes',        icon: '📖', completed: false, streak: 3  },
  { id: '4', name: 'Meditate',                   icon: '🧘', completed: false, streak: 7  },
  { id: '5', name: 'No social media before noon',icon: '📵', completed: false, streak: 2  },
  { id: '6', name: 'Sleep by 11pm',              icon: '😴', completed: false, streak: 9  },
];

const ACCENT       = '#34D399';
const BG           = '#0F172A';
const CARD         = '#1E293B';
const BORDER       = '#334155';
const TEXT_PRIMARY = '#F1F5F9';
const TEXT_MUTED   = '#94A3B8';

function HabitItem({
  habit,
  onToggle,
}: {
  habit: Habit;
  onToggle: (id: string) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 70,  useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 130, useNativeDriver: true }),
    ]).start();
    onToggle(habit.id);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={[styles.habitCard, habit.completed && styles.habitCardDone]}
      >
        <View style={styles.habitLeft}>
          <Text style={styles.habitIcon}>{habit.icon}</Text>
          <View>
            <Text style={[styles.habitName, habit.completed && styles.habitNameDone]}>
              {habit.name}
            </Text>
            <Text style={styles.streakLabel}>🔥 {habit.streak} day streak</Text>
          </View>
        </View>
        <View style={[styles.checkbox, habit.completed && styles.checkboxDone]}>
          {habit.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function App() {
  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);

  const completedCount = habits.filter(h => h.completed).length;
  const total          = habits.length;
  const progress       = completedCount / total;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
  });

  const toggle = (id: string) =>
    setHabits(prev => prev.map(h => (h.id === id ? { ...h, completed: !h.completed } : h)));

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.date}>{today}</Text>
        </View>

        {/* Progress card */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View>
              <Text style={styles.progressLabel}>TODAY'S PROGRESS</Text>
              <View style={styles.countRow}>
                <Text style={styles.countBig}>{completedCount}</Text>
                <Text style={styles.countOf}> / {total} habits</Text>
              </View>
            </View>
            <View style={styles.ring}>
              <Text style={styles.ringText}>{Math.round(progress * 100)}%</Text>
            </View>
          </View>

          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${progress * 100}%` as any }]} />
          </View>

          {completedCount === total && (
            <Text style={styles.allDone}>All done for today - great work! 🎉</Text>
          )}
        </View>

        {/* Habits list */}
        <Text style={styles.sectionTitle}>Habits</Text>
        {habits.map(habit => (
          <HabitItem key={habit.id} habit={habit} onToggle={toggle} />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 20,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 3,
  },

  // Progress card
  progressCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: BORDER,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  progressLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    letterSpacing: 1,
    marginBottom: 6,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countBig: {
    fontSize: 36,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    lineHeight: 40,
  },
  countOf: {
    fontSize: 16,
    color: TEXT_MUTED,
  },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
  },
  barBg: {
    height: 6,
    backgroundColor: BORDER,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    backgroundColor: ACCENT,
    borderRadius: 3,
  },
  allDone: {
    marginTop: 14,
    fontSize: 14,
    color: ACCENT,
    fontWeight: '500',
  },

  // Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },

  // Habit card
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  habitCardDone: {
    borderColor: ACCENT + '55',
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  habitIcon: {
    fontSize: 26,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '500',
    color: TEXT_PRIMARY,
    marginBottom: 3,
  },
  habitNameDone: {
    color: TEXT_MUTED,
    textDecorationLine: 'line-through',
  },
  streakLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  checkmark: {
    color: BG,
    fontSize: 14,
    fontWeight: '800',
  },
});
