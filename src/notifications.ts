import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { Habit } from './types';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isExpoGo) return false;
  const Notifications = require('expo-notifications');
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return status === 'granted';
}

export async function scheduleHabitReminders(habits: Habit[]): Promise<void> {
  if (isExpoGo) return;
  const Notifications = require('expo-notifications');
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Global morning reminder
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Good morning! 🌟',
      body: `You have ${habits.length} habit${habits.length === 1 ? '' : 's'} to track today.`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });

  // Per-habit reminders at user-specified times
  for (const habit of habits) {
    if (habit.reminderHour === undefined) continue;
    // Skip habits that would duplicate the 9am global reminder
    if (habit.reminderHour === 9 && (habit.reminderMinute ?? 0) === 0) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${habit.icon} ${habit.name}`,
        body: `Time to ${habit.name.toLowerCase()}!`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: habit.reminderHour,
        minute: habit.reminderMinute ?? 0,
      },
    });
  }
}

export function setupNotificationHandler(): void {
  if (isExpoGo) return;
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}
