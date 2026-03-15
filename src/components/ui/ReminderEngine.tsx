import { useEffect, useRef } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { toDayKey } from '../../lib/dates';

// Track which reminders we've already fired so we don't re-notify
const firedReminders = new Set<string>();

export function ReminderEngine() {
  const items = usePlannerStore((s) => s.items);
  const permissionRef = useRef<NotificationPermission>('default');

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((p) => { permissionRef.current = p; });
    } else if ('Notification' in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  // Check for due reminders every 15 seconds
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const allItems = usePlannerStore.getState().items;

      for (const item of Object.values(allItems)) {
        if (!item.reminderAt || item.parentId || item.isArchived) continue;
        if (firedReminders.has(item.id)) continue;

        const reminderTime = new Date(item.reminderAt);
        if (reminderTime <= now) {
          firedReminders.add(item.id);

          // Fire browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Reminder', {
              body: item.text,
              icon: '/icon-192.png',
              tag: `reminder-${item.id}`,
            });
          }

          // Move to today if not already there
          const todayKey = toDayKey(new Date());
          if (item.dayKey !== todayKey) {
            usePlannerStore.getState().moveItem(item.id, todayKey, item.order);
          }
        }
      }
    };

    // Check immediately, then every 15 seconds
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [items]); // Re-run when items change

  return null;
}
