import {
  format,
  addDays,
  subDays,
  isToday,
  isPast,
  startOfDay,
  startOfWeek,
} from 'date-fns';

export function toDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDayLabel(date: Date): string {
  return format(date, 'EEE, MMM d');
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy');
}

export function generateDayRange(pastDays: number, futureDays: number): Date[] {
  const today = startOfDay(new Date());
  const days: Date[] = [];

  for (let i = pastDays; i >= 1; i--) {
    days.push(subDays(today, i));
  }
  days.push(today);
  for (let i = 1; i <= futureDays; i++) {
    days.push(addDays(today, i));
  }

  return days;
}

export function isDayToday(date: Date): boolean {
  return isToday(date);
}

export function isDayPast(date: Date): boolean {
  return isPast(startOfDay(date)) && !isToday(date);
}

/** Returns the "YYYY-MM-DD" key for the Monday of the week containing `date`. */
export function getWeekKey(date: Date = new Date()): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 }); // 1 = Monday
  return format(monday, 'yyyy-MM-dd');
}

/**
 * Returns the week key for the week the user intends to plan/review.
 * When the configured ritual day is Sunday (0) and today is Sunday, the user
 * is planning for the NEXT week — advance by one day to get that Monday.
 * All other days: the current week's Monday is correct.
 */
export function getWeekKeyForPlanning(date: Date, ritualDay: number): string {
  if (ritualDay === 0 && date.getDay() === 0) {
    return getWeekKey(addDays(date, 1));
  }
  return getWeekKey(date);
}
