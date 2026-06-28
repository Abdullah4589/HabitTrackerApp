# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm start          # start Expo dev server (scan QR with Expo Go)
npm run android    # launch on Android emulator/device
npm run ios        # launch on iOS simulator/device
npm run web        # launch in browser
```

There are no lint or test scripts configured.

## Architecture

**Routing** — Expo Router v3 (file-based). Entry point is `app/index.tsx`, which redirects to `/onboarding` or `/(tabs)` based on `onboardingComplete` in the store.

- `app/_layout.tsx` — root Stack; calls `setupNotificationHandler()` on mount
- `app/onboarding.tsx` — 5-step linear flow (Welcome → How It Works → Name → Habit → Challenge)
- `app/(tabs)/` — three tabs: Today (`index`), History, Challenges
- `app/habit-modal.tsx` — add/edit habit, presented as a bottom-sheet modal

**State** — single Zustand store (`src/store.ts`) persisted to AsyncStorage under the key `habit-tracker-store`. All state mutations and computed selectors live in `useStore`. There is no separate selector file; selectors are methods on the store (e.g. `getStreak`, `getTodayLog`, `getConsistencyData`).

**Data model** (`src/types.ts`):
- `Habit` — `type: 'daily' | 'volume'`, `targetCount` (1 for daily, 2–20 for volume)
- `HabitLog` — one record per habit per calendar date; `fullyCompletedAt` is set when `completedCount >= targetCount`
- `Challenge` — tracks `completedDays: string[]` (ISO date strings); a challenge day is marked when any of its `habitIds` is fully logged that day

**Platform split for audio** — `src/sound.native.ts` uses `expo-audio`; `src/sound.ts` is a web no-op. Metro resolves `.native.ts` automatically — never import the `.native` file directly.

**Notifications** — `src/notifications.ts` dynamically `require`s `expo-notifications` behind an `isExpoGo` guard because the module crashes in Expo Go. Push notifications and sounds are unavailable in Expo Go; use a development build to test them.

**Theme** — `src/theme.ts` exports `Colors`, `HabitColors`, `Radii`, and `Spacing` constants. The app uses a dark theme (`bg: #0F172A`). Always use these tokens rather than hard-coded values.

**Components** (`src/components/`):
- `HabitCard` — primary card with tap-to-log, progress ring, swipe actions
- `ProgressRing` — SVG arc progress indicator (uses `react-native-svg`)
- `CelebrationOverlay` + `ParticleBurst` — full-screen celebration animation (uses `react-native-reanimated`)
- `ConsistencyChart` — weekly grid of completion booleans

## Key constraints

- Expo SDK 56 / React Native 0.85.3 / React 19. Check versioned docs before using any Expo API.
- `expo-notifications` must stay behind the `isExpoGo` guard or it will crash in Expo Go.
- Streak and consistency logic in the store treats calendar dates as `YYYY-MM-DD` strings (local device time). Date math elsewhere should follow the same convention.
- Debug actions (`debugMarkChallengeDay`, `debugFillChallenge`, etc.) on the store exist for manual testing in dev; do not remove them.
