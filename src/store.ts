import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, HabitLog, Challenge, AIInsight } from './types';
import {
  pushHabit,
  pushHabitLog,
  pushChallenge,
  pushProfile,
  deleteHabitRemote,
  deleteHabitLog,
  pushAll,
  pullAll,
  pullAIInsights,
} from './sync';
import { fetchInsight } from './ai';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getStreak(logs: HabitLog[], habitId: string): number {
  const completedDates = new Set(
    logs
      .filter(l => l.habitId === habitId && l.fullyCompletedAt)
      .map(l => l.date)
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

function getBestStreakFn(logs: HabitLog[], habitId: string): number {
  const dates = [...new Set(
    logs.filter(l => l.habitId === habitId && l.fullyCompletedAt).map(l => l.date)
  )].sort();
  let best = 0;
  let current = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      current = 1;
    } else {
      const diff = (new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) / 86400000;
      current = diff === 1 ? current + 1 : 1;
    }
    best = Math.max(best, current);
  }
  return best;
}

interface StoreState {
  // Auth (not persisted)
  userId: string | null;
  isHydrating: boolean;

  // User data (persisted as local cache)
  userName: string;
  onboardingComplete: boolean;
  habits: Habit[];
  logs: HabitLog[];
  challenges: Challenge[];

  // AI insights (in-memory, pulled from remote on hydration)
  aiInsights: AIInsight[];
  aiLoading: boolean;

  // Auth actions
  hydrateFromRemote: (userId: string) => Promise<void>;
  clearUserData: () => void;

  // AI actions
  fetchAIInsight: (type: AIInsight['type']) => Promise<void>;
  getLatestInsight: (type: AIInsight['type']) => AIInsight | undefined;

  // Data actions
  completeOnboarding: (userName: string, firstHabit: Omit<Habit, 'id' | 'createdAt'>) => void;
  updateUserName: (name: string) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  editHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  /** Returns 'completed' when habit reaches its target for the day */
  logHabit: (habitId: string) => 'incremented' | 'completed' | 'already_done';
  unlogHabit: (habitId: string) => void;
  markChallengeDay: (challengeId: string) => void;
  claimChallengeReward: (challengeId: string) => void;
  addChallenge: (name: string, habitIds: string[], durationDays: number) => void;

  // Debug / dev tools
  debugMarkChallengeDay: (challengeId: string, date: string) => void;
  debugResetChallenge: (challengeId: string) => void;
  debugAddHabitLog: (habitId: string, date: string) => void;
  debugFillChallenge: (challengeId: string) => void;

  // Selectors
  getStreak: (habitId: string) => number;
  getBestStreak: (habitId: string) => number;
  getTodayLog: (habitId: string) => HabitLog | undefined;
  getConsistencyData: (habitId: string, weeks: number) => boolean[];
  getAllCompletedLogs: () => (HabitLog & { habit: Habit | undefined })[];
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // ── Initial state ───────────────────────────────────────
      userId: null,
      isHydrating: true,
      userName: '',
      onboardingComplete: false,
      habits: [],
      logs: [],
      challenges: [],
      aiInsights: [],
      aiLoading: false,

      // ── Auth actions ────────────────────────────────────────

      async hydrateFromRemote(userId) {
        try {
          const [remote, aiInsights] = await Promise.all([
            pullAll(userId),
            pullAIInsights(userId),
          ]);

          if (remote.profile) {
            // Returning user: load their remote data into the local cache
            set({
              userId,
              userName: remote.profile.userName,
              onboardingComplete: remote.profile.onboardingComplete,
              habits: remote.habits,
              logs: remote.logs,
              challenges: remote.challenges,
              aiInsights,
              isHydrating: false,
            });
          } else {
            // No profile row — user signed up before the schema/trigger existed.
            // Create the profile first (habits/challenges FK depend on it).
            const { habits, logs, challenges, userName, onboardingComplete } = get();
            await pushProfile(userId, userName, onboardingComplete);
            if (habits.length > 0 || onboardingComplete) {
              await pushAll(userId, { habits, logs, challenges, userName, onboardingComplete });
            }
            set({ userId, isHydrating: false });
          }
        } catch (e) {
          console.error('[hydrateFromRemote]', e);
          // Offline or network error: keep using local cache
          set({ userId, isHydrating: false });
        }
      },

      clearUserData() {
        set({
          userId: null,
          isHydrating: false,
          userName: '',
          onboardingComplete: false,
          habits: [],
          logs: [],
          challenges: [],
          aiInsights: [],
          aiLoading: false,
        });
      },

      // ── Data actions ────────────────────────────────────────

      completeOnboarding(userName, firstHabitData) {
        const habitId = uid();
        const habit: Habit = {
          id: habitId,
          createdAt: new Date().toISOString(),
          ...firstHabitData,
        };
        const challenge: Challenge = {
          id: uid(),
          habitIds: [habitId],
          durationDays: 3,
          startDate: today(),
          name: '3-Day Kickstart Challenge',
          completedDays: [],
          rewardClaimed: false,
        };
        set({ userName, onboardingComplete: true, habits: [habit], challenges: [challenge] });

        const { userId } = get();
        if (userId) {
          // Profile must exist before habits/challenges (FK constraint) — chain, don't race
          pushProfile(userId, userName, true)
            .then(() => Promise.all([
              pushHabit(userId, habit),
              pushChallenge(userId, challenge),
            ]))
            .catch(e => console.error('[sync:completeOnboarding]', e));
        }
      },

      updateUserName(name) {
        set({ userName: name });
        const { userId, onboardingComplete } = get();
        if (userId) pushProfile(userId, name, onboardingComplete).catch(e => console.error('[sync:updateUserName]', e));
      },

      addHabit(habitData) {
        const habit: Habit = {
          id: uid(),
          createdAt: new Date().toISOString(),
          ...habitData,
        };
        set(s => ({ habits: [...s.habits, habit] }));

        const { userId } = get();
        if (userId) pushHabit(userId, habit).catch(console.error);
      },

      editHabit(id, updates) {
        set(s => ({
          habits: s.habits.map(h => (h.id === id ? { ...h, ...updates } : h)),
        }));

        const { userId, habits } = get();
        const habit = habits.find(h => h.id === id);
        if (userId && habit) pushHabit(userId, habit).catch(console.error);
      },

      deleteHabit(id) {
        set(s => ({
          habits: s.habits.filter(h => h.id !== id),
          logs: s.logs.filter(l => l.habitId !== id),
        }));

        const { userId } = get();
        if (userId) deleteHabitRemote(id).catch(console.error);
      },

      logHabit(habitId) {
        const { habits, logs } = get();
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return 'incremented';

        const date = today();
        const existing = logs.find(l => l.habitId === habitId && l.date === date);

        if (existing && existing.completedCount >= habit.targetCount) {
          return 'already_done';
        }

        const newCount = (existing?.completedCount ?? 0) + 1;
        const isComplete = newCount >= habit.targetCount;

        if (existing) {
          set(s => ({
            logs: s.logs.map(l =>
              l.id === existing.id
                ? {
                    ...l,
                    completedCount: newCount,
                    fullyCompletedAt: isComplete ? new Date().toISOString() : l.fullyCompletedAt,
                  }
                : l
            ),
          }));
        } else {
          const log: HabitLog = {
            id: uid(),
            habitId,
            date,
            completedCount: newCount,
            fullyCompletedAt: isComplete ? new Date().toISOString() : undefined,
          };
          set(s => ({ logs: [...s.logs, log] }));
        }

        if (isComplete) {
          const { challenges } = get();
          const updatedChallenges = challenges.map(c => {
            if (c.habitIds.includes(habitId) && !c.completedDays.includes(date)) {
              return { ...c, completedDays: [...c.completedDays, date] };
            }
            return c;
          });
          set({ challenges: updatedChallenges });
        }

        // Background sync
        const { userId } = get();
        if (userId) {
          const log = get().logs.find(l => l.habitId === habitId && l.date === date);
          if (log) pushHabitLog(userId, log).catch(console.error);
          if (isComplete) {
            get().challenges
              .filter(c => c.habitIds.includes(habitId))
              .forEach(c => pushChallenge(userId, c).catch(console.error));
          }
        }

        return isComplete ? 'completed' : 'incremented';
      },

      unlogHabit(habitId) {
        const { logs } = get();
        const date = today();
        const existing = logs.find(l => l.habitId === habitId && l.date === date);
        if (!existing || existing.completedCount === 0) return;

        const newCount = existing.completedCount - 1;

        if (newCount === 0) {
          set(s => ({ logs: s.logs.filter(l => l.id !== existing.id) }));
        } else {
          set(s => ({
            logs: s.logs.map(l =>
              l.id === existing.id
                ? { ...l, completedCount: newCount, fullyCompletedAt: undefined }
                : l
            ),
          }));
        }

        const { userId } = get();
        if (userId) {
          if (newCount === 0) {
            deleteHabitLog(existing.id).catch(e => console.error('[sync:unlogHabit]', e));
          } else {
            const updated = get().logs.find(l => l.habitId === habitId && l.date === date);
            if (updated) pushHabitLog(userId, updated).catch(e => console.error('[sync:unlogHabit]', e));
          }
        }
      },

      markChallengeDay(challengeId) {
        const date = today();
        set(s => ({
          challenges: s.challenges.map(c =>
            c.id === challengeId && !c.completedDays.includes(date)
              ? { ...c, completedDays: [...c.completedDays, date] }
              : c
          ),
        }));

        const { userId, challenges } = get();
        const challenge = challenges.find(c => c.id === challengeId);
        if (userId && challenge) pushChallenge(userId, challenge).catch(console.error);
      },

      claimChallengeReward(challengeId) {
        set(s => ({
          challenges: s.challenges.map(c =>
            c.id === challengeId ? { ...c, rewardClaimed: true } : c
          ),
        }));

        const { userId, challenges } = get();
        const challenge = challenges.find(c => c.id === challengeId);
        if (userId && challenge) pushChallenge(userId, challenge).catch(console.error);
      },

      addChallenge(name, habitIds, durationDays) {
        const challenge: Challenge = {
          id: uid(),
          habitIds,
          durationDays,
          startDate: today(),
          name,
          completedDays: [],
          rewardClaimed: false,
        };
        set(s => ({ challenges: [...s.challenges, challenge] }));

        const { userId } = get();
        if (userId) pushChallenge(userId, challenge).catch(console.error);
      },

      // ── AI actions ──────────────────────────────────────────

      async fetchAIInsight(type) {
        const { habits, logs, userName, aiLoading } = get();
        if (aiLoading || habits.length === 0) return;
        set({ aiLoading: true });
        try {
          const insight = await fetchInsight(type, habits, logs, userName);
          set(s => ({
            aiInsights: [insight, ...s.aiInsights.filter(i => i.type !== type || i.id !== insight.id)],
            aiLoading: false,
          }));
        } catch (e) {
          console.error('[store:fetchAIInsight]', e);
          set({ aiLoading: false });
          throw e;
        }
      },

      getLatestInsight(type) {
        return get().aiInsights.find(i => i.type === type);
      },

      // ── Debug / dev tools (no remote sync intentionally) ────

      debugMarkChallengeDay(challengeId, date) {
        set(s => ({
          challenges: s.challenges.map(c =>
            c.id === challengeId && !c.completedDays.includes(date)
              ? { ...c, completedDays: [...c.completedDays, date] }
              : c
          ),
        }));
      },

      debugResetChallenge(challengeId) {
        set(s => ({
          challenges: s.challenges.map(c =>
            c.id === challengeId ? { ...c, completedDays: [], rewardClaimed: false } : c
          ),
        }));
      },

      debugFillChallenge(challengeId) {
        const { challenges, habits, logs } = get();
        const challenge = challenges.find(c => c.id === challengeId);
        if (!challenge) return;

        const dates: string[] = [];
        for (let i = 0; i < challenge.durationDays; i++) {
          const d = new Date(challenge.startDate);
          d.setDate(d.getDate() + i);
          dates.push(d.toISOString().split('T')[0]);
        }

        const newCompletedDays = [...new Set([...challenge.completedDays, ...dates])];

        const newLogs = [...logs];
        for (const date of dates) {
          for (const habitId of challenge.habitIds) {
            const habit = habits.find(h => h.id === habitId);
            if (!habit) continue;
            const existing = newLogs.find(l => l.habitId === habitId && l.date === date);
            if (existing?.fullyCompletedAt) continue;
            if (existing) {
              existing.completedCount = habit.targetCount;
              existing.fullyCompletedAt = new Date(date + 'T12:00:00').toISOString();
            } else {
              newLogs.push({
                id: uid(),
                habitId,
                date,
                completedCount: habit.targetCount,
                fullyCompletedAt: new Date(date + 'T12:00:00').toISOString(),
              });
            }
          }
        }

        set(s => ({
          logs: newLogs,
          challenges: s.challenges.map(c =>
            c.id === challengeId ? { ...c, completedDays: newCompletedDays } : c
          ),
        }));
      },

      debugAddHabitLog(habitId, date) {
        const { habits, logs } = get();
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;
        const existing = logs.find(l => l.habitId === habitId && l.date === date);
        if (existing?.fullyCompletedAt) return;
        if (existing) {
          set(s => ({
            logs: s.logs.map(l =>
              l.id === existing.id
                ? { ...l, completedCount: habit.targetCount, fullyCompletedAt: new Date(date + 'T12:00:00').toISOString() }
                : l
            ),
          }));
        } else {
          const log: HabitLog = {
            id: uid(),
            habitId,
            date,
            completedCount: habit.targetCount,
            fullyCompletedAt: new Date(date + 'T12:00:00').toISOString(),
          };
          set(s => ({ logs: [...s.logs, log] }));
        }
        const { challenges } = get();
        set({
          challenges: challenges.map(c => {
            if (c.habitIds.includes(habitId) && !c.completedDays.includes(date)) {
              return { ...c, completedDays: [...c.completedDays, date] };
            }
            return c;
          }),
        });
      },

      // ── Selectors ───────────────────────────────────────────

      getStreak(habitId) {
        return getStreak(get().logs, habitId);
      },

      getBestStreak(habitId) {
        return getBestStreakFn(get().logs, habitId);
      },

      getTodayLog(habitId) {
        const date = today();
        return get().logs.find(l => l.habitId === habitId && l.date === date);
      },

      getConsistencyData(habitId, weeks) {
        const result: boolean[] = [];
        const d = new Date();
        const completedDates = new Set(
          get()
            .logs.filter(l => l.habitId === habitId && l.fullyCompletedAt)
            .map(l => l.date)
        );
        for (let i = weeks * 7 - 1; i >= 0; i--) {
          const past = new Date(d);
          past.setDate(d.getDate() - i);
          result.push(completedDates.has(past.toISOString().split('T')[0]));
        }
        return result;
      },

      getAllCompletedLogs() {
        const { logs, habits } = get();
        return logs
          .filter(l => l.fullyCompletedAt)
          .sort((a, b) => (b.fullyCompletedAt! > a.fullyCompletedAt! ? 1 : -1))
          .map(l => ({ ...l, habit: habits.find(h => h.id === l.habitId) }));
      },
    }),
    {
      name: 'habit-tracker-store',
      storage: createJSONStorage(() => AsyncStorage),
      // userId and isHydrating come from the live Supabase session — never persist them
      partialize: state => ({
        userName: state.userName,
        onboardingComplete: state.onboardingComplete,
        habits: state.habits,
        logs: state.logs,
        challenges: state.challenges,
      }),
    }
  )
);
