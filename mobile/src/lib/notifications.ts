import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule daily planning ritual reminder.
 * Cancels any existing planning notification first.
 */
export async function schedulePlanningReminder(hour: number): Promise<void> {
  // Cancel existing planning reminders
  await cancelPlanningReminder();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily Planning Ritual',
      body: 'Ready to plan your day with intention?',
      data: { type: 'planning' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
    identifier: 'daily-planning',
  });
}

/**
 * Schedule daily review ritual reminder.
 */
export async function scheduleReviewReminder(hour: number): Promise<void> {
  await cancelReviewReminder();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily Review',
      body: 'Time to reflect on your day.',
      data: { type: 'review' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
    identifier: 'daily-review',
  });
}

export async function cancelPlanningReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('daily-planning').catch(() => {});
}

export async function cancelReviewReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('daily-review').catch(() => {});
}

/**
 * Sync notification schedules with current store settings.
 */
export async function syncNotificationSchedules(prefs: {
  planningRitualEnabled: boolean;
  planningRitualHour: number;
  reviewRitualEnabled: boolean;
  reviewRitualHour: number;
}): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  if (prefs.planningRitualEnabled) {
    await schedulePlanningReminder(prefs.planningRitualHour);
  } else {
    await cancelPlanningReminder();
  }

  if (prefs.reviewRitualEnabled) {
    await scheduleReviewReminder(prefs.reviewRitualHour);
  } else {
    await cancelReviewReminder();
  }
}
