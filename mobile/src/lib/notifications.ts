import Constants from 'expo-constants';

// Detect Expo Go — notifications don't work there since SDK 53
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy-load expo-notifications to avoid crash in Expo Go
let _Notifications: typeof import('expo-notifications') | null = null;
async function getNotifications() {
  if (isExpoGo) return null;
  if (!_Notifications) {
    _Notifications = await import('expo-notifications');
  }
  return _Notifications;
}

// Configure notification handler (called once on first successful load)
let _handlerSet = false;
async function ensureHandler() {
  const N = await getNotifications();
  if (!N || _handlerSet) return;
  _handlerSet = true;
  N.setNotificationHandler({
    handleNotification: async (notification) => {
      const type = notification.request.content.data?.type;
      const playSound = type === 'focus-timer';
      return {
        shouldShowAlert: true,
        shouldPlaySound: playSound,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      } as any;
    },
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const N = await getNotifications();
    if (!N) return false;
    await ensureHandler();

    const { status: existing } = await N.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await N.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function schedulePlanningReminder(hour: number): Promise<void> {
  try {
    const N = await getNotifications();
    if (!N) return;
    await cancelPlanningReminder();
    await N.scheduleNotificationAsync({
      content: {
        title: 'Good morning',
        body: 'Take a moment to review your plan for today.',
        data: { type: 'planning' },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
      identifier: 'daily-planning',
    });
  } catch {}
}

export async function scheduleReviewReminder(hour: number): Promise<void> {
  try {
    const N = await getNotifications();
    if (!N) return;
    await cancelReviewReminder();
    await N.scheduleNotificationAsync({
      content: {
        title: 'Daily Review',
        body: 'Time to reflect on your day.',
        data: { type: 'review' },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
      identifier: 'daily-review',
    });
  } catch {}
}

export async function cancelPlanningReminder(): Promise<void> {
  try {
    const N = await getNotifications();
    if (!N) return;
    await N.cancelScheduledNotificationAsync('daily-planning');
  } catch {}
}

export async function cancelReviewReminder(): Promise<void> {
  try {
    const N = await getNotifications();
    if (!N) return;
    await N.cancelScheduledNotificationAsync('daily-review');
  } catch {}
}

export async function scheduleFocusTimerNotification(durationSeconds: number): Promise<void> {
  try {
    const N = await getNotifications();
    if (!N) return;
    await cancelFocusTimerNotification();
    await N.scheduleNotificationAsync({
      content: {
        title: 'Focus session complete',
        body: 'Nice work! Your focus timer has finished.',
        sound: true,
        data: { type: 'focus-timer' },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: durationSeconds,
      },
      identifier: 'focus-timer',
    });
  } catch {}
}

export async function cancelFocusTimerNotification(): Promise<void> {
  try {
    const N = await getNotifications();
    if (!N) return;
    await N.cancelScheduledNotificationAsync('focus-timer');
  } catch {}
}

// --- Reminder notifications ---

export async function scheduleReminderNotification(itemId: string, text: string, reminderAt: string): Promise<void> {
  try {
    const N = await getNotifications();
    if (!N) return;
    const triggerDate = new Date(reminderAt);
    const now = new Date();
    if (triggerDate <= now) return; // Already past

    const secondsUntil = Math.max(1, Math.floor((triggerDate.getTime() - now.getTime()) / 1000));
    await N.scheduleNotificationAsync({
      content: {
        title: 'Reminder',
        body: text,
        data: { type: 'reminder', itemId },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntil,
      },
      identifier: `reminder-${itemId}`,
    });
  } catch {}
}

export async function cancelReminderNotification(itemId: string): Promise<void> {
  try {
    const N = await getNotifications();
    if (!N) return;
    await N.cancelScheduledNotificationAsync(`reminder-${itemId}`);
  } catch {}
}

export async function syncReminderNotifications(items: Record<string, import('../../../shared/types').PlannerItem>): Promise<void> {
  try {
    const N = await getNotifications();
    if (!N) return;

    // Cancel all existing reminder notifications first
    const scheduled = await N.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier.startsWith('reminder-')) {
        await N.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    // Schedule notifications for all pending reminders
    const now = new Date();
    for (const item of Object.values(items)) {
      if (!item.reminderAt || item.parentId || item.isArchived) continue;
      const reminderTime = new Date(item.reminderAt);
      if (reminderTime <= now) continue;
      await scheduleReminderNotification(item.id, item.text, item.reminderAt);
    }
  } catch {}
}

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
