export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'daily' | 'volume';
  targetCount: number;
  createdAt: string;
  reminderHour?: number;
  reminderMinute?: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completedCount: number;
  fullyCompletedAt?: string;
}

export interface Challenge {
  id: string;
  habitIds: string[];
  durationDays: number;
  startDate: string;
  name: string;
  completedDays: string[];
  rewardClaimed: boolean;
}

export interface AIInsight {
  id: string;
  type: 'nudge' | 'weekly_summary' | 'monthly_summary';
  content: string;
  generatedAt: string;
}

export interface AppState {
  userName: string;
  onboardingComplete: boolean;
  habits: Habit[];
  logs: HabitLog[];
  challenges: Challenge[];
}
