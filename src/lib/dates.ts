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

/** Returns the appropriate week key for weekly planning. 
 * If it's Sunday, returns next week's key (since people want to plan ahead).
 * Otherwise returns current week's key. */
export function getWeekKeyForPlanning(date: Date = new Date()): string {
  if (date.getDay() === 0) { // Sunday is 0
    // On Sunday, plan for next week
    const nextWeek = addDays(date, 1); // Move to Monday (next week)
    return getWeekKey(nextWeek);
  }
  return getWeekKey(date);
}
