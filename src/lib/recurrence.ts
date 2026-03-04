import { addDays, addMonths, nextDay, parseISO } from 'date-fns';
import type { Recurrence } from '../types';

function formatDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Given a current day key and a recurrence config, returns the next occurrence as "YYYY-MM-DD".
 */
export function computeNextOccurrence(currentDayKey: string, recurrence: Recurrence): string {
  const current = parseISO(currentDayKey);

  let next: Date;
  switch (recurrence.type) {
    case 'days':
      next = addDays(current, recurrence.interval);
      break;
    case 'weeks': {
      // Find the next date whose weekday is in weekdays[]
      const weekdays = recurrence.weekdays ?? [];
      if (weekdays.length === 0) {
        next = addDays(current, 1);
        break;
      }
      const weekdaySet = new Set(weekdays);
      let candidate = addDays(current, 1);
      // Search up to 7 days to find next matching weekday
      for (let i = 0; i < 7; i++) {
        if (weekdaySet.has(candidate.getDay())) {
          next = candidate;
          break;
        }
        candidate = addDays(candidate, 1);
      }
      next = next! ?? candidate;
      break;
    }
    case 'months': {
      const dayOfMonth = recurrence.dayOfMonth ?? current.getDate();
      const nextMonth = addMonths(current, 1);
      // Clamp to month length
      const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
      const clampedDay = Math.min(dayOfMonth, lastDay);
      next = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), clampedDay);
      break;
    }
    case 'weekday':
      // Legacy: nextDay returns the next occurrence of the given weekday
      next = nextDay(current, recurrence.weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6);
      break;
    default:
      next = addDays(current, 1);
  }

  return formatDayKey(next);
}
