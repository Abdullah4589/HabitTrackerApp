import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../src/store';
import { Colors, Radii, Spacing } from '../../src/theme';
import HabitCard from '../../src/components/HabitCard';
import ProgressRing from '../../src/components/ProgressRing';
import CelebrationOverlay from '../../src/components/CelebrationOverlay';
import { playAllDoneSound } from '../../src/sound';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const { habits, userName, logHabit, unlogHabit, getStreak, getTodayLog, deleteHabit, fetchAIInsight, getLatestInsight, aiLoading } = useStore();

  const [allDoneOverlay, setAllDoneOverlay] = useState(false);
  const [nudgeError, setNudgeError] = useState<string | null>(null);

  const nudge = getLatestInsight('nudge');

  const handleGetNudge = async () => {
    setNudgeError(null);
    try {
      await fetchAIInsight('nudge');
    } catch {
      setNudgeError('Could not reach AI service. Try again later.');
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const todayLogs = habits.map(h => getTodayLog(h.id));
  const completedCount = habits.filter((h, i) => {
    const log = todayLogs[i];
    return log && log.completedCount >= h.targetCount;
  }).length;
  const progress = habits.length > 0 ? completedCount / habits.length : 0;

  const barAnim = useRef(new Animated.Value(progress)).current;

  const animateBar = (to: number) => {
    Animated.spring(barAnim, {
      toValue: to,
      useNativeDriver: false,
      tension: 60,
      friction: 8,
    }).start();
  };

  const handleLog = (habitId: string) => {
    const result = logHabit(habitId);

    if (result === 'completed') {
      // Re-read store state after update to count completions
      const { logs: updatedLogs } = useStore.getState();
      const todayStr = new Date().toISOString().split('T')[0];
      const newCompleted = habits.filter(h => {
        const log = updatedLogs.find(l => l.habitId === h.id && l.date === todayStr);
        return log && log.completedCount >= h.targetCount;
      }).length;
      const newProgress = habits.length > 0 ? newCompleted / habits.length : 0;
      animateBar(newProgress);

      if (newCompleted === habits.length) {
        setTimeout(() => {
          setAllDoneOverlay(true);
          playAllDoneSound();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 300);
        }, 700);
      }
    }

    return result;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {greeting()}{userName ? `, ${userName}` : ''}
            </Text>
            <Text style={styles.date}>{today}</Text>
          </View>
        </View>

        {/* Progress card */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View>
              <Text style={styles.progressLabel}>TODAY'S PROGRESS</Text>
              <View style={styles.countRow}>
                <Text style={styles.countBig}>{completedCount}</Text>
                <Text style={styles.countOf}> / {habits.length} habits</Text>
              </View>
            </View>
            <ProgressRing
              progress={progress}
              size={72}
              strokeWidth={4}
              color={Colors.accent}
              label={`${Math.round(progress * 100)}%`}
            />
          </View>

          <View style={styles.barBg}>
            <Animated.View
              style={[
                styles.barFill,
                {
                  width: barAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          </View>

          {completedCount === habits.length && habits.length > 0 && (
            <Text style={styles.allDone}>Perfect day! 🔥 Keep the streak alive</Text>
          )}
        </View>

        {/* AI Coaching Nudge */}
        {habits.length > 0 && (
          <View style={styles.nudgeCard}>
            <View style={styles.nudgeHeader}>
              <Text style={styles.nudgeTitle}>AI Coach</Text>
              <TouchableOpacity
                onPress={handleGetNudge}
                disabled={aiLoading}
                style={styles.nudgeRefreshBtn}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color={Colors.accent} />
                ) : (
                  <Text style={styles.nudgeRefreshText}>{nudge ? '↻' : 'Get tip'}</Text>
                )}
              </TouchableOpacity>
            </View>
            {nudgeError ? (
              <Text style={styles.nudgeError}>{nudgeError}</Text>
            ) : nudge ? (
              <Text style={styles.nudgeContent}>{nudge.content}</Text>
            ) : (
              <Text style={styles.nudgePlaceholder}>
                Tap "Get tip" for a personalized coaching message.
              </Text>
            )}
          </View>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Habits</Text>
          <Text style={styles.habitCount}>{habits.length}/5</Text>
        </View>

        {habits.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyText}>No habits yet. Tap + to create one.</Text>
          </View>
        )}

        {habits.length > 0 && habits.length < 3 && (
          <Text style={styles.minHintText}>Add at least {3 - habits.length} more habit{3 - habits.length > 1 ? 's' : ''} to build a strong routine.</Text>
        )}

        {habits.length >= 5 && (
          <Text style={styles.maxHintText}>Maximum 5 habits reached. Remove one to add another.</Text>
        )}

        {habits.map((habit, i) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            log={todayLogs[i]}
            streak={getStreak(habit.id)}
            onLog={() => handleLog(habit.id)}
            onUnlog={() => unlogHabit(habit.id)}
            onDelete={() => deleteHabit(habit.id)}
          />
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB — hidden at max capacity */}
      {habits.length < 5 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/habit-modal')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <CelebrationOverlay
        visible={allDoneOverlay}
        title="All done today!"
        subtitle="You completed every habit today. You're on a roll — keep going tomorrow!"
        buttonLabel="Amazing!"
        onDismiss={() => setAllDoneOverlay(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  date: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 3,
  },
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1.5,
    borderColor: Colors.border,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.2)',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
    fontWeight: '600',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countBig: {
    fontSize: 38,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 42,
  },
  countOf: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  barBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  allDone: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  habitCount: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  minHintText: {
    fontSize: 13,
    color: Colors.accent,
    marginBottom: 10,
    opacity: 0.8,
  },
  maxHintText: {
    fontSize: 13,
    color: '#F87171',
    marginBottom: 10,
  },
  nudgeCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.accent + '44',
  },
  nudgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nudgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  nudgeRefreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    backgroundColor: Colors.accent + '22',
    minWidth: 52,
    alignItems: 'center',
  },
  nudgeRefreshText: {
    color: Colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  nudgeContent: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  nudgePlaceholder: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  nudgeError: {
    fontSize: 13,
    color: Colors.rose,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 4px 12px ${Colors.accent}80`,
    elevation: 8,
  },
  fabText: {
    fontSize: 30,
    color: Colors.bg,
    fontWeight: '300',
    lineHeight: 34,
  },
});
