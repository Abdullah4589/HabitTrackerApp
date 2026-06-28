# HabitTrackerApp

A mobile habit tracking app built with Expo (SDK 56) and React Native. Track daily habits, build streaks, and complete challenges to earn rewards.

## Features

- **Create habits** — choose an icon, color, and set a daily or volume-based target
- **Track daily** — log habits with a tap; volume habits count up to their target
- **Streaks & history** — current and best streaks, weekly consistency grid
- **Challenges** — complete a 3-day kickstart challenge at onboarding; create custom challenges
- **Reminders** — per-habit push notifications at user-specified times
- **Celebration animations** — particle burst and sound effects on habit completion

## Tech stack

| Layer | Library |
|---|---|
| Framework | Expo SDK 56 / React Native 0.85.3 |
| Navigation | Expo Router v3 (file-based) |
| State | Zustand v5 (persisted via AsyncStorage) |
| Animations | React Native Reanimated 4 |
| Audio | expo-audio |
| Notifications | expo-notifications |
| Charts | react-native-svg |

## Getting started

```bash
npm install
npm start        # Expo Go (notifications/audio disabled in Go)
npm run android  # Android emulator or device
npm run ios      # iOS simulator or device
npm run web      # Browser
```

> Notifications and audio require a development build — they do not work in Expo Go.

## Project structure

```
app/               # Expo Router screens
  _layout.tsx      # Root stack
  index.tsx        # Entry redirect (onboarding vs tabs)
  onboarding.tsx   # 5-step onboarding flow
  habit-modal.tsx  # Add/edit habit bottom sheet
  (tabs)/          # Main tab navigator (Today, History, Challenges)
src/
  store.ts         # Zustand store — all state and actions
  types.ts         # Shared TypeScript types
  theme.ts         # Colors, spacing, and radius tokens
  notifications.ts # Push notification scheduling
  sound.ts         # Web audio no-op
  sound.native.ts  # Native audio (expo-audio)
  components/      # HabitCard, ProgressRing, CelebrationOverlay, ConsistencyChart
```
