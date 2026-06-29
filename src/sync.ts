import { supabase } from './supabase';
import { Habit, HabitLog, Challenge, AIInsight } from './types';

// ── Push individual entities ──────────────────────────────────

function check(label: string, error: unknown) {
  if (error) {
    console.error(`[sync:${label}]`, error);
    throw error;
  }
}

export async function pushProfile(userId: string, userName: string, onboardingComplete: boolean) {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    user_name: userName,
    onboarding_complete: onboardingComplete,
  });
  check('pushProfile', error);
}

export async function pushHabit(userId: string, habit: Habit) {
  const { error } = await supabase.from('habits').upsert({
    id: habit.id,
    user_id: userId,
    name: habit.name,
    icon: habit.icon,
    color: habit.color,
    type: habit.type,
    target_count: habit.targetCount,
    reminder_hour: habit.reminderHour ?? null,
    reminder_minute: habit.reminderMinute ?? null,
    created_at: habit.createdAt,
  });
  check('pushHabit', error);
}

export async function pushHabitLog(userId: string, log: HabitLog) {
  const { error } = await supabase.from('habit_logs').upsert({
    id: log.id,
    habit_id: log.habitId,
    user_id: userId,
    date: log.date,
    completed_count: log.completedCount,
    fully_completed_at: log.fullyCompletedAt ?? null,
  });
  check('pushHabitLog', error);
}

export async function pushChallenge(userId: string, challenge: Challenge) {
  const { error } = await supabase.from('challenges').upsert({
    id: challenge.id,
    user_id: userId,
    name: challenge.name,
    habit_ids: challenge.habitIds,
    duration_days: challenge.durationDays,
    start_date: challenge.startDate,
    completed_days: challenge.completedDays,
    reward_claimed: challenge.rewardClaimed,
  });
  check('pushChallenge', error);
}

export async function deleteHabitRemote(habitId: string) {
  const { error } = await supabase.from('habits').delete().eq('id', habitId);
  check('deleteHabitRemote', error);
}

export async function deleteHabitLog(logId: string) {
  const { error } = await supabase.from('habit_logs').delete().eq('id', logId);
  check('deleteHabitLog', error);
}

// ── Bulk push (first sign-in with existing local data) ────────

export async function pushAll(
  userId: string,
  data: {
    habits: Habit[];
    logs: HabitLog[];
    challenges: Challenge[];
    userName: string;
    onboardingComplete: boolean;
  }
) {
  await pushProfile(userId, data.userName, data.onboardingComplete);
  await Promise.all(data.habits.map(h => pushHabit(userId, h)));
  await Promise.all(data.logs.map(l => pushHabitLog(userId, l)));
  await Promise.all(data.challenges.map(c => pushChallenge(userId, c)));
}

// ── Pull AI insights for a user ──────────────────────────────

export async function pullAIInsights(userId: string): Promise<AIInsight[]> {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(10);
  if (error) {
    console.error('[sync:pullAIInsights]', error);
    return [];
  }
  return (data ?? []).map(row => ({
    id: row.id,
    type: row.type as AIInsight['type'],
    content: row.content,
    generatedAt: row.generated_at,
  }));
}

// ── Pull all data for a user ──────────────────────────────────

export async function pullAll(userId: string) {
  const [habitsRes, logsRes, challengesRes, profileRes] = await Promise.all([
    supabase.from('habits').select('*').eq('user_id', userId),
    supabase.from('habit_logs').select('*').eq('user_id', userId),
    supabase.from('challenges').select('*').eq('user_id', userId),
    supabase.from('profiles').select('*').eq('id', userId).single(),
  ]);

  const habits: Habit[] = (habitsRes.data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    type: row.type as 'daily' | 'volume',
    targetCount: row.target_count,
    createdAt: row.created_at,
    reminderHour: row.reminder_hour ?? undefined,
    reminderMinute: row.reminder_minute ?? undefined,
  }));

  const logs: HabitLog[] = (logsRes.data ?? []).map(row => ({
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    completedCount: row.completed_count,
    fullyCompletedAt: row.fully_completed_at ?? undefined,
  }));

  const challenges: Challenge[] = (challengesRes.data ?? []).map(row => ({
    id: row.id,
    habitIds: row.habit_ids,
    durationDays: row.duration_days,
    startDate: row.start_date,
    name: row.name,
    completedDays: row.completed_days,
    rewardClaimed: row.reward_claimed,
  }));

  const profile = profileRes.data
    ? {
        userName: profileRes.data.user_name ?? '',
        onboardingComplete: profileRes.data.onboarding_complete ?? false,
      }
    : null;

  return { habits, logs, challenges, profile };
}
