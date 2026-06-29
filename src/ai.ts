import { supabase } from './supabase';
import { Habit, HabitLog, AIInsight } from './types';

export interface HabitStat {
  name: string;
  icon: string;
  currentStreak: number;
  bestStreak: number;
  last7Days: number;
  completedLast7: number;
  last30Days: number;
  completedLast30: number;
}

function countCompletedDays(logs: HabitLog[], habitId: string, days: number): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return logs.filter(
    l => l.habitId === habitId && l.fullyCompletedAt && l.date >= cutoffStr,
  ).length;
}

function computeStreak(logs: HabitLog[], habitId: string): number {
  const completedDates = new Set(
    logs.filter(l => l.habitId === habitId && l.fullyCompletedAt).map(l => l.date),
  );
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().split('T')[0];
    if (completedDates.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function computeBestStreak(logs: HabitLog[], habitId: string): number {
  const dates = [...new Set(
    logs.filter(l => l.habitId === habitId && l.fullyCompletedAt).map(l => l.date),
  )].sort();
  let best = 0;
  let current = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      current = 1;
    } else {
      const diff =
        (new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) / 86400000;
      current = diff === 1 ? current + 1 : 1;
    }
    best = Math.max(best, current);
  }
  return best;
}

export function buildHabitStats(habits: Habit[], logs: HabitLog[]): {
  stats: HabitStat[];
  overallAvg7: number;
  overallAvg30: number;
} {
  const stats: HabitStat[] = habits.map(h => {
    const completedLast7 = countCompletedDays(logs, h.id, 7);
    const completedLast30 = countCompletedDays(logs, h.id, 30);
    return {
      name: h.name,
      icon: h.icon,
      currentStreak: computeStreak(logs, h.id),
      bestStreak: computeBestStreak(logs, h.id),
      last7Days: Math.round((completedLast7 / 7) * 100),
      completedLast7,
      last30Days: Math.round((completedLast30 / 30) * 100),
      completedLast30,
    };
  });

  const overallAvg7 =
    stats.length > 0
      ? Math.round(stats.reduce((s, h) => s + h.last7Days, 0) / stats.length)
      : 0;
  const overallAvg30 =
    stats.length > 0
      ? Math.round(stats.reduce((s, h) => s + h.last30Days, 0) / stats.length)
      : 0;

  return { stats, overallAvg7, overallAvg30 };
}

export async function fetchInsight(
  type: AIInsight['type'],
  habits: Habit[],
  logs: HabitLog[],
  userName: string,
): Promise<AIInsight> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const { stats, overallAvg7, overallAvg30 } = buildHabitStats(habits, logs);

  const { data, error } = await supabase.functions.invoke('ai-insights', {
    body: { type, habitStats: stats, userName, overallAvg7, overallAvg30 },
  });

  if (error) {
    // Extract the actual error body from the edge function response
    let msg = error.message ?? 'Edge function error';
    try {
      const body = await (error as any).context?.json?.();
      if (body?.error) msg = body.error;
      console.error('[ai] Edge function response body:', body);
    } catch {}
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);

  return {
    id: data.id,
    type: data.type,
    content: data.content,
    generatedAt: data.generatedAt,
  };
}
