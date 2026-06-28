import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../src/store';
import { Colors, Radii, Spacing } from '../../src/theme';
import ProgressRing from '../../src/components/ProgressRing';
import CelebrationOverlay from '../../src/components/CelebrationOverlay';
import { playChallengeSound } from '../../src/sound';

const DURATIONS = [3, 7, 14, 21, 30];

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

function formatStartDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function pastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export default function ChallengesScreen() {
  const {
    challenges, habits, claimChallengeReward, addChallenge,
    debugMarkChallengeDay, debugResetChallenge, debugAddHabitLog, debugFillChallenge,
  } = useStore();

  const [rewardChallenge, setRewardChallenge] = useState<string | null>(null);
  const [showNewChallenge, setShowNewChallenge] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [devTapCount, setDevTapCount] = useState(0);

  // New challenge form state
  const [challengeName, setChallengeName] = useState('');
  const [challengeDuration, setChallengeDuration] = useState(7);
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);

  const active = challenges.filter(c => !c.rewardClaimed);
  const past = challenges.filter(c => c.rewardClaimed);

  const claimReward = (id: string) => {
    claimChallengeReward(id);
    setRewardChallenge(id);
    playChallengeSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const claimedChallenge = rewardChallenge
    ? challenges.find(c => c.id === rewardChallenge)
    : null;

  const handleCreateChallenge = () => {
    if (selectedHabitIds.length === 0) return;
    const name = challengeName.trim() || `${challengeDuration}-Day Challenge`;
    addChallenge(name, selectedHabitIds, challengeDuration);
    setShowNewChallenge(false);
    setChallengeName('');
    setSelectedHabitIds([]);
    setChallengeDuration(7);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleHabitSelection = (id: string) => {
    setSelectedHabitIds(prev =>
      prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
    );
  };

  const handleTitleTap = () => {
    const next = devTapCount + 1;
    setDevTapCount(next);
    if (next >= 5) {
      setShowDevTools(v => !v);
      setDevTapCount(0);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleTitleTap} activeOpacity={1}>
            <Text style={styles.title}>Challenges</Text>
          </TouchableOpacity>
          <Text style={styles.subtitle}>Stay consistent, earn rewards.</Text>
        </View>

        {/* Dev Tools Panel */}
        {__DEV__ && showDevTools && (
          <View style={styles.devPanel}>
            <Text style={styles.devTitle}>🛠 Dev Tools</Text>
            <Text style={styles.devHint}>Tap title 5× to toggle</Text>
            {active.map(c => (
              <View key={c.id} style={styles.devChallenge}>
                <Text style={styles.devChallengeLabel} numberOfLines={1}>{c.name}</Text>
                <View style={styles.devBtnRow}>
                  {[2, 1, 0].map(daysAgo => (
                    <TouchableOpacity
                      key={daysAgo}
                      style={styles.devBtn}
                      onPress={() => {
                        const date = pastDate(daysAgo);
                        debugMarkChallengeDay(c.id, date);
                        c.habitIds.forEach(hId => debugAddHabitLog(hId, date));
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                    >
                      <Text style={styles.devBtnText}>
                        {daysAgo === 0 ? 'Today' : `-${daysAgo}d`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.devBtn, styles.devBtnFill]}
                    onPress={() => {
                      debugFillChallenge(c.id);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                  >
                    <Text style={styles.devBtnText}>Fill All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.devBtn, styles.devBtnReset]}
                    onPress={() => {
                      debugResetChallenge(c.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    }}
                  >
                    <Text style={styles.devBtnText}>Reset</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {active.length === 0 && (
              <Text style={styles.devHint}>No active challenges to test.</Text>
            )}
          </View>
        )}

        {active.length === 0 && past.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyText}>
              Complete onboarding to start your first 3-day challenge, or create one below!
            </Text>
          </View>
        )}

        {active.map(challenge => {
          const linkedHabits = challenge.habitIds
            .map(id => habits.find(h => h.id === id))
            .filter(Boolean);
          const isFullyComplete = challenge.completedDays.length >= challenge.durationDays;
          const color = linkedHabits[0]?.color ?? Colors.accent;

          return (
            <View key={challenge.id} style={[styles.challengeCard, { borderColor: color + '55' }]}>
              <View style={styles.challengeHeader}>
                <View style={styles.challengeHeaderText}>
                  <Text style={styles.challengeName}>{challenge.name}</Text>
                  <Text style={styles.challengeMeta}>
                    Started {formatStartDate(challenge.startDate)} ·{' '}
                    {challenge.completedDays.length}/{challenge.durationDays} days done
                  </Text>
                </View>
                <ProgressRing
                  progress={challenge.completedDays.length / challenge.durationDays}
                  size={52}
                  strokeWidth={3}
                  color={color}
                />
              </View>

              {linkedHabits.map(h => h && (
                <View key={h.id} style={styles.habitChip}>
                  <Text style={styles.habitChipText}>{h.icon} {h.name}</Text>
                </View>
              ))}

              {/* Day circles */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
                <View style={styles.dayRow}>
                  {Array.from({ length: challenge.durationDays }).map((_, i) => {
                    const dayDate = new Date(challenge.startDate);
                    dayDate.setDate(dayDate.getDate() + i);
                    const dayKey = dayDate.toISOString().split('T')[0];
                    const done = challenge.completedDays.includes(dayKey);
                    return (
                      <View
                        key={i}
                        style={[
                          styles.dayCircle,
                          { borderColor: color },
                          done && { backgroundColor: color },
                        ]}
                      >
                        <Text style={[styles.dayCircleText, done && styles.dayCircleTextDone]}>
                          {done ? '✓' : `${i + 1}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              {isFullyComplete && (
                <TouchableOpacity
                  style={[styles.claimBtn, { backgroundColor: color }]}
                  onPress={() => claimReward(challenge.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.claimBtnText}>🏆 Claim Your Reward!</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Create New Challenge */}
        {habits.length > 0 && !showNewChallenge && (
          <TouchableOpacity
            style={styles.newChallengeBtn}
            onPress={() => setShowNewChallenge(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.newChallengeBtnText}>+ New Challenge</Text>
          </TouchableOpacity>
        )}

        {showNewChallenge && (
          <View style={styles.newChallengeCard}>
            <Text style={styles.newChallengeTitle}>Create Challenge</Text>

            <Text style={styles.formLabel}>NAME</Text>
            <TextInput
              style={styles.formInput}
              placeholder={`${challengeDuration}-Day Challenge`}
              placeholderTextColor={Colors.textMuted}
              value={challengeName}
              onChangeText={setChallengeName}
            />

            <Text style={styles.formLabel}>DURATION</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.durationChip,
                    challengeDuration === d && { backgroundColor: Colors.accent, borderColor: Colors.accent },
                  ]}
                  onPress={() => setChallengeDuration(d)}
                >
                  <Text style={[
                    styles.durationChipText,
                    challengeDuration === d && { color: Colors.bg },
                  ]}>
                    {d}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>HABITS</Text>
            {habits.map(h => {
              const isSelected = selectedHabitIds.includes(h.id);
              return (
                <TouchableOpacity
                  key={h.id}
                  style={[
                    styles.habitSelectRow,
                    isSelected && { backgroundColor: h.color + '15', borderColor: h.color },
                  ]}
                  onPress={() => toggleHabitSelection(h.id)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.habitSelectCheck,
                    isSelected && { backgroundColor: h.color, borderColor: h.color }
                  ]}>
                    {isSelected && <Text style={styles.habitSelectCheckMark}>✓</Text>}
                  </View>
                  <Text style={styles.habitSelectIcon}>{h.icon}</Text>
                  <Text style={[
                    styles.habitSelectName,
                    isSelected && { fontWeight: '600', color: Colors.textPrimary }
                  ]}>
                    {h.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.newChallengeActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowNewChallenge(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.createBtn,
                  selectedHabitIds.length === 0 && { opacity: 0.4 },
                ]}
                onPress={handleCreateChallenge}
                disabled={selectedHabitIds.length === 0}
                activeOpacity={0.85}
              >
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {past.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Completed</Text>
            {past.map(challenge => {
              const linkedHabits = challenge.habitIds
                .map(id => habits.find(h => h.id === id))
                .filter(Boolean);
              const color = linkedHabits[0]?.color ?? Colors.accent;
              return (
                <View key={challenge.id} style={styles.pastCard}>
                  <Text style={styles.pastBadge}>🏅</Text>
                  <View style={styles.pastInfo}>
                    <Text style={styles.pastName}>{challenge.name}</Text>
                    <Text style={styles.pastMeta}>
                      {challenge.durationDays} days · Completed
                    </Text>
                  </View>
                  <View style={[styles.doneTag, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.doneTagText, { color }]}>Done</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <CelebrationOverlay
        visible={!!rewardChallenge && !!(claimedChallenge?.rewardClaimed)}
        title="Challenge Complete!"
        subtitle={`You completed the ${claimedChallenge?.name ?? '3-Day'} Challenge! You've built real momentum — keep it going!`}
        buttonLabel="Collect Badge 🏅"
        onDismiss={() => setRewardChallenge(null)}
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
    padding: Spacing.md,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  devPanel: {
    backgroundColor: '#1a1a2e',
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#ff6b6b55',
  },
  devTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ff6b6b',
    marginBottom: 2,
  },
  devHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  devChallenge: {
    marginBottom: 10,
  },
  devChallengeLabel: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginBottom: 6,
    fontWeight: '600',
  },
  devBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  devBtn: {
    backgroundColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  devBtnFill: {
    backgroundColor: '#6bff9033',
  },
  devBtnReset: {
    backgroundColor: '#ff6b6b33',
  },
  devBtnText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 14,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  challengeCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.2)',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  challengeHeaderText: {
    flex: 1,
  },
  challengeName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  challengeMeta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  habitChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.bg,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  habitChipText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  dayScroll: {
    marginBottom: 16,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  dayCircleTextDone: {
    color: '#FFFFFF',
  },
  claimBtn: {
    borderRadius: Radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  claimBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  newChallengeBtn: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  newChallengeBtnText: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  newChallengeCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.25)',
  },
  newChallengeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: Colors.bg,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  durationChip: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  durationChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  habitSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.bg,
    borderRadius: Radii.md,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
  },
  habitSelectCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitSelectCheckMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  habitSelectIcon: {
    fontSize: 18,
  },
  habitSelectName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
    flex: 1,
  },
  newChallengeActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: Radii.md,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  createBtn: {
    flex: 2,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: Radii.md,
    backgroundColor: Colors.accent,
  },
  createBtnText: {
    color: Colors.bg,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 10,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  pastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pastBadge: {
    fontSize: 28,
    marginRight: 12,
  },
  pastInfo: {
    flex: 1,
  },
  pastName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  pastMeta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  doneTag: {
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  doneTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
