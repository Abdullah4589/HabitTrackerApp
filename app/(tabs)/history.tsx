import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../../src/store';
import { supabase } from '../../src/supabase';
import { Colors, Radii, Spacing } from '../../src/theme';
import ConsistencyChart from '../../src/components/ConsistencyChart';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function HistoryScreen() {
  const { habits, getConsistencyData, getAllCompletedLogs, getStreak, getBestStreak, logs, userName, clearUserData, updateUserName, fetchAIInsight, getLatestInsight, aiLoading } = useStore();
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const weeklyInsight = getLatestInsight('weekly_summary');
  const monthlyInsight = getLatestInsight('monthly_summary');

  const handleGenerateSummary = async (type: 'weekly_summary' | 'monthly_summary') => {
    setSummaryError(null);
    try {
      await fetchAIInsight(type);
    } catch {
      setSummaryError('Could not reach AI service. Try again later.');
    }
  };
  const router = useRouter();

  const handleEditName = () => {
    setNameInput(userName);
    setEditingName(true);
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === userName) {
      setEditingName(false);
      return;
    }
    Alert.alert(
      'Change Name',
      `Are you sure you want to change your name to "${trimmed}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Change',
          onPress: () => {
            updateUserName(trimmed);
            setEditingName(false);
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          clearUserData();
          router.replace('/auth');
        },
      },
    ]);
  };
  const allLogs = getAllCompletedLogs();

  // Group logs by date
  const grouped = allLogs.reduce<Record<string, typeof allLogs>>((acc, log) => {
    const key = log.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  const sections = Object.entries(grouped).map(([date, data]) => ({
    title: formatDate(data[0]?.fullyCompletedAt ?? date),
    data,
  }));

  // Overall Stats
  const globalCurrentStreak = habits.length > 0 ? Math.max(...habits.map(h => getStreak(h.id))) : 0;
  const globalBestStreak = habits.length > 0 ? Math.max(...habits.map(h => getBestStreak(h.id))) : 0;

  // Calculate 7-day average completion rate
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
  let completedCount7d = 0;
  last7Days.forEach(dateStr => {
    habits.forEach(h => {
      const log = logs.find(l => l.habitId === h.id && l.date === dateStr);
      if (log && log.completedCount >= h.targetCount) {
        completedCount7d++;
      }
    });
  });
  const totalPossible = habits.length * 7;
  const sevenDayAverage = totalPossible > 0 ? Math.round((completedCount7d / totalPossible) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity style={styles.accountBtn} onPress={() => setShowAccountModal(true)}>
          <Text style={styles.accountBtnText}>
            {userName ? userName.charAt(0).toUpperCase() : '?'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showAccountModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowAccountModal(false); setEditingName(false); }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setShowAccountModal(false); setEditingName(false); }}
        >
          <View style={styles.accountSheet}>
            {/* Name row */}
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  placeholder="Your name"
                  placeholderTextColor={Colors.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                  onTouchStart={e => e.stopPropagation()}
                />
                <View style={styles.nameEditActions}>
                  <TouchableOpacity
                    style={styles.nameCancelBtn}
                    onPress={() => setEditingName(false)}
                  >
                    <Text style={styles.nameCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.nameSaveBtn}
                    onPress={handleSaveName}
                  >
                    <Text style={styles.nameSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.nameRow} onPress={handleEditName} activeOpacity={0.7}>
                <View>
                  <Text style={styles.accountName}>{userName || 'Account'}</Text>
                  <Text style={styles.editNameHint}>Tap to edit name</Text>
                </View>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={() => { setShowAccountModal(false); setEditingName(false); handleSignOut(); }}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Overall Stats Cards */}
            {habits.length > 0 && (
              <View style={styles.statsSummaryRow}>
                <View style={styles.statsSummaryCard}>
                  <Text style={styles.statsSummaryEmoji}>🔥</Text>
                  <Text style={styles.statsSummaryNumber}>{globalCurrentStreak}</Text>
                  <Text style={styles.statsSummaryLabel}>Streak</Text>
                </View>
                <View style={styles.statsSummaryCard}>
                  <Text style={styles.statsSummaryEmoji}>👑</Text>
                  <Text style={styles.statsSummaryNumber}>{globalBestStreak}</Text>
                  <Text style={styles.statsSummaryLabel}>Best Streak</Text>
                </View>
                <View style={styles.statsSummaryCard}>
                  <Text style={styles.statsSummaryEmoji}>📈</Text>
                  <Text style={styles.statsSummaryNumber}>{sevenDayAverage}%</Text>
                  <Text style={styles.statsSummaryLabel}>7-Day Avg</Text>
                </View>
              </View>
            )}

            {/* AI Reflection Summaries */}
            {habits.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>AI Reflections</Text>
                <Text style={styles.sectionSub}>AI-generated summaries of your progress</Text>

                {summaryError && (
                  <Text style={styles.summaryError}>{summaryError}</Text>
                )}

                {/* Weekly */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <Text style={styles.summaryCardTitle}>Weekly Report</Text>
                    <TouchableOpacity
                      onPress={() => handleGenerateSummary('weekly_summary')}
                      disabled={aiLoading}
                      style={styles.generateBtn}
                    >
                      {aiLoading ? (
                        <ActivityIndicator size="small" color={Colors.accent} />
                      ) : (
                        <Text style={styles.generateBtnText}>{weeklyInsight ? '↻ Refresh' : 'Generate'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {weeklyInsight ? (
                    <>
                      <Text style={styles.summaryContent}>{weeklyInsight.content}</Text>
                      <Text style={styles.summaryTimestamp}>
                        Generated {new Date(weeklyInsight.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.summaryPlaceholder}>Tap Generate to see your weekly summary.</Text>
                  )}
                </View>

                {/* Monthly */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <Text style={styles.summaryCardTitle}>Monthly Report</Text>
                    <TouchableOpacity
                      onPress={() => handleGenerateSummary('monthly_summary')}
                      disabled={aiLoading}
                      style={styles.generateBtn}
                    >
                      {aiLoading ? (
                        <ActivityIndicator size="small" color={Colors.accent} />
                      ) : (
                        <Text style={styles.generateBtnText}>{monthlyInsight ? '↻ Refresh' : 'Generate'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {monthlyInsight ? (
                    <>
                      <Text style={styles.summaryContent}>{monthlyInsight.content}</Text>
                      <Text style={styles.summaryTimestamp}>
                        Generated {new Date(monthlyInsight.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.summaryPlaceholder}>Tap Generate to see your monthly summary.</Text>
                  )}
                </View>
              </View>
            )}

            {/* Per-habit streak stats */}
            {habits.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Streaks</Text>
                {habits.map(habit => {
                  const streak = getStreak(habit.id);
                  const best = getBestStreak(habit.id);
                  const completedCount = logs.filter(
                    l => l.habitId === habit.id && l.fullyCompletedAt
                  ).length;
                  return (
                    <View key={habit.id} style={styles.streakCard}>
                      <View style={[styles.streakIconBg, { backgroundColor: habit.color + '22' }]}>
                        <Text style={styles.streakIcon}>{habit.icon}</Text>
                      </View>
                      <Text style={styles.streakHabitName} numberOfLines={1}>
                        {habit.name}
                      </Text>
                      <View style={styles.streakStats}>
                        <View style={styles.statItem}>
                          <Text style={[styles.statValue, { color: habit.color }]}>{streak}</Text>
                          <Text style={styles.statLabel}>Current</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                          <Text style={[styles.statValue, { color: habit.color }]}>{best}</Text>
                          <Text style={styles.statLabel}>Best</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                          <Text style={[styles.statValue, { color: habit.color }]}>{completedCount}</Text>
                          <Text style={styles.statLabel}>Total</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Consistency chart */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Consistency</Text>
              <Text style={styles.sectionSub}>Last 4 weeks</Text>
              <View style={styles.chartCard}>
                <ConsistencyChart habits={habits} getConsistencyData={getConsistencyData} />
              </View>
            </View>

            {/* Log */}
            <Text style={[styles.sectionTitle, { marginHorizontal: Spacing.md, marginBottom: 0 }]}>
              Activity Log
            </Text>
            {sections.length === 0 && (
              <View style={styles.emptyLog}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyText}>Complete habits to see them here.</Text>
              </View>
            )}
            {sections.map(section => (
              <View key={section.title}>
                <Text style={styles.dateHeader}>{section.title}</Text>
                {section.data.map(log => (
                  <View key={log.id} style={styles.logItem}>
                    <View style={[styles.logDot, { backgroundColor: log.habit?.color ?? Colors.accent }]} />
                    <View style={styles.logInfo}>
                      <Text style={styles.logName}>
                        {log.habit?.icon} {log.habit?.name ?? 'Unknown'}
                      </Text>
                      {log.habit?.type === 'volume' && (
                        <Text style={styles.logVolume}>
                          {log.completedCount}/{log.habit.targetCount} times
                        </Text>
                      )}
                    </View>
                    <Text style={styles.logTime}>
                      {log.fullyCompletedAt ? formatTime(log.fullyCompletedAt) : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={{ height: 80 }} />
          </>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  accountBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  accountSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  accountName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  editNameHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  editIcon: {
    fontSize: 18,
  },
  nameEditRow: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  nameInput: {
    backgroundColor: Colors.bg,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.accent,
    color: Colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  nameEditActions: {
    flexDirection: 'row',
    gap: 10,
  },
  nameCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: Radii.md,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nameCancelText: {
    color: Colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  nameSaveBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: Radii.md,
    backgroundColor: Colors.accent,
  },
  nameSaveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  signOutBtn: {
    backgroundColor: Colors.rose + '22',
    borderRadius: Radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.rose + '44',
  },
  signOutText: {
    color: Colors.rose,
    fontWeight: '700',
    fontSize: 15,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  streakIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  streakIcon: {
    fontSize: 20,
  },
  streakHabitName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    flexShrink: 1,
  },
  streakStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 38,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyLog: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    letterSpacing: 0.3,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
    flexShrink: 0,
  },
  logInfo: {
    flex: 1,
  },
  logName: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  logVolume: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  logTime: {
    fontSize: 12,
    color: Colors.textMuted,
    flexShrink: 0,
    marginLeft: 8,
  },
  statsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    gap: 12,
  },
  statsSummaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
  },
  statsSummaryEmoji: {
    fontSize: 26,
    marginBottom: 8,
  },
  statsSummaryNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  statsSummaryLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryCard: {
    backgroundColor: Colors.bg,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.accent + '33',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  generateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.sm,
    backgroundColor: Colors.accent + '22',
    minWidth: 80,
    alignItems: 'center',
  },
  generateBtnText: {
    color: Colors.accent,
    fontWeight: '700',
    fontSize: 12,
  },
  summaryContent: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  summaryTimestamp: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
  },
  summaryPlaceholder: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  summaryError: {
    fontSize: 13,
    color: Colors.rose,
    marginBottom: 8,
  },
});
