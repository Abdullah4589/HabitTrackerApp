# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm start                  # start Expo dev server (scan QR with Expo Go)
npm run android            # launch on Android emulator/device
npm run ios                # launch on iOS simulator/device
npm run web                # launch in browser
npx expo start --clear     # start with Metro cache wiped (use when modules feel stale)
```

There are no lint or test scripts configured.

## Environment

Copy `.env.example` to `.env` and fill in the two Supabase values. All `.env*` files are gitignored.

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

The OpenRouter API key is **not** stored in `.env` — it lives in Supabase Edge Function secrets (`Dashboard → Edge Functions → Manage secrets → OPENROUTER_API_KEY`).

## Architecture

### Routing

Expo Router v3 (file-based). Auth gates everything:

- `app/index.tsx` — checks `isHydrating` (shows spinner), then `userId` (redirects to `/auth` if null), then `onboardingComplete` (redirects to `/onboarding` or `/(tabs)`)
- `app/auth/` — sign-in (`index.tsx`) and sign-up (`sign-up.tsx`) screens; a Stack defined in `app/auth/_layout.tsx`. `forgot-password.tsx` and `reset-password.tsx` exist in this folder but are **not registered** in the layout and are effectively dead code.
- `app/onboarding.tsx` — 5-step linear flow; calls `completeOnboarding()` then `router.replace('/(tabs)')`
- `app/(tabs)/` — three tabs: Today (`index`), History, Challenges
- `app/habit-modal.tsx` — add/edit habit as a bottom-sheet modal
- `app/_layout.tsx` — root Stack; subscribes to `supabase.auth.onAuthStateChange` and calls `hydrateFromRemote(userId)` on sign-in or `clearUserData()` on sign-out

### State — `src/store.ts`

Single Zustand store persisted to AsyncStorage under `habit-tracker-store`. `partialize` excludes `userId` and `isHydrating` — these come from the live Supabase session and must never be persisted.

**Auth/session fields (not persisted):**
- `userId: string | null` — set by `hydrateFromRemote`; null means unauthenticated
- `isHydrating: boolean` — true until first `onAuthStateChange` fires; prevents premature routing

**`hydrateFromRemote(userId)`** — called once per sign-in. Pulls all remote data via `pullAll` + `pullAIInsights` and replaces local cache. If no profile row exists (user predates the trigger), it pushes local data up first to satisfy FK constraints, then sets `isHydrating: false`.

**Local-first sync pattern** — every mutation updates Zustand immediately (optimistic), then fire-and-forgets a background push to Supabase. Errors are logged but never surface to the user.

**Key store actions:**
- `completeOnboarding(userName, firstHabit)` — chains `pushProfile → pushHabit + pushChallenge` (never race, profile must exist first for FK)
- `logHabit(habitId)` → `'incremented' | 'completed' | 'already_done'`; auto-marks challenge days on completion
- `unlogHabit(habitId)` — decrements today's log; deletes the row when count reaches 0
- `updateUserName(name)` — updates store + syncs profile to Supabase
- `fetchAIInsight(type)` — calls `src/ai.ts → supabase.functions.invoke('ai-insights', ...)`; stores result in `aiInsights[]`

### Supabase — `src/supabase.ts` / `src/sync.ts`

`src/supabase.ts` — Supabase JS v2 client configured with AsyncStorage for cross-platform session persistence.

`src/sync.ts` — all push/pull helpers. **Supabase never throws**; every function uses a `check(label, error)` helper that throws when `error` is truthy so callers can catch real failures. Functions: `pushProfile`, `pushHabit`, `pushHabitLog`, `pushChallenge`, `deleteHabitRemote`, `deleteHabitLog`, `pushAll` (bulk first-login), `pullAll`, `pullAIInsights`.

### AI Coaching — `src/ai.ts` + `supabase/functions/ai-insights/`

`src/ai.ts` — computes `HabitStat[]` from local logs, then calls the Edge Function via `supabase.functions.invoke`. The Edge Function verifies the user JWT, calls OpenRouter (`anthropic/claude-haiku-4-5`, max 300 tokens), saves the result to `ai_insights` table via service-role key (bypasses RLS), and returns `{ id, type, content, generatedAt }`.

Three insight types: `nudge` (coaching tip), `weekly_summary`, `monthly_summary`.

### Data model — `src/types.ts`

- `Habit` — `type: 'daily' | 'volume'`; `targetCount` is 1 for daily, 2–20 for volume
- `HabitLog` — one record per habit per calendar date; `fullyCompletedAt` is set when `completedCount >= targetCount`
- `Challenge` — `completedDays: string[]` (ISO date strings); a day is counted when any `habitIds` habit is fully logged
- `AIInsight` — `type: 'nudge' | 'weekly_summary' | 'monthly_summary'`; pulled from remote on hydration, not persisted locally

### Database — `supabase/schema.sql`

Tables: `profiles`, `habits`, `habit_logs`, `challenges`, `ai_insights`. All have RLS (`auth.uid() = user_id`). A trigger `handle_new_user` auto-creates a `profiles` row on sign-up. Run the full schema in the Supabase SQL Editor when setting up a new project.

### Other modules

**Platform split for audio** — `src/sound.native.ts` uses `expo-audio`; `src/sound.ts` is a web no-op. Metro resolves `.native.ts` automatically — never import the `.native` file directly.

**Notifications** — `src/notifications.ts` dynamically `require`s `expo-notifications` behind an `isExpoGo` guard. Push notifications are unavailable in Expo Go; use a development build.

**Theme** — `src/theme.ts` exports `Colors`, `HabitColors`, `Radii`, `Spacing`. Dark theme (`bg: #0F172A`). Always use these tokens.

**App scheme** — `habittrackerapp://` (defined in `app.json`). Required for any deep-link or OAuth redirect work; must be added to Supabase's allowed redirect URLs list.

## Key constraints

- Expo SDK 56 / React Native 0.85.3 / React 19. Check versioned docs before using any Expo API.
- `expo-notifications` must stay behind the `isExpoGo` guard or it will crash in Expo Go.
- Streak and consistency logic treats calendar dates as `YYYY-MM-DD` strings in local device time. All date math must follow the same convention.
- Profile row must exist before inserting habits or challenges (FK constraint). Always chain: `pushProfile → then → pushHabit/pushChallenge`.
- `isHydrating` starts `true` and is only set `false` inside `hydrateFromRemote` or `clearUserData`. Never set it elsewhere.
- Debug actions (`debugMarkChallengeDay`, `debugFillChallenge`, `debugResetChallenge`, `debugAddHabitLog`) exist for manual testing; do not remove them.

## Known issues / open bugs

- **Password reset flow is broken** — `app/auth/reset-password.tsx` is not registered in `app/auth/_layout.tsx`, so it is unreachable. `forgot-password.tsx` also uses `redirectTo: 'habittrackerapp://'` (the app root) instead of `'habittrackerapp://auth/reset-password'`. Additionally, `reset-password.tsx` calls `useStore(s => s.setPasswordRecovery)` which does not exist in the store. All three issues must be fixed together before password reset works.

## Security notes

- **Rate limiting missing on AI endpoint** — `supabase/functions/ai-insights/` makes a paid OpenRouter call on every invocation with no per-user rate limit. Before shipping publicly, add a check against `ai_insights` row count in the last hour and reject with 429 if exceeded.
- **Prompt injection surface** — `habitStats[].name` and `userName` are interpolated directly into the OpenRouter prompt in `buildPrompt()`. Validate and truncate these fields before interpolation.
- **`handle_new_user` is SECURITY DEFINER** — the trigger function in `schema.sql` runs with elevated privileges. Keep it minimal (only the `INSERT INTO profiles` statement). Do not expand it.
- **`getSession()` pre-flight** — `src/ai.ts` uses `getSession()` (reads local storage) as a pre-flight check before calling the Edge Function. The Edge Function independently validates via `getUser()`, so this is safe, but the client check is weaker than `getUser()`.

## Screenshots

App screenshots (web build, 390 px wide) are in `screenshots/`. They are committed to the repo for use in `README.md`. Regenerate them by running `npm run web` and using the browser automation workflow.
