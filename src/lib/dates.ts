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
 * Returns the week key for weekly planning purposes.
 * If it's Sunday and the planning day is Sunday (0), plan for next week.
 * Otherwise, plan for the current week.
 */
export function getWeeklyPlanningWeekKey(date: Date = new Date(), planningDay: number): string {
  if (date.getDay() === 0 && planningDay === 0) {
    // It's Sunday and Sunday is the planning day - plan for next week
    const nextWeek = addDays(date, 7);
    return getWeekKey(nextWeek);
  }
  // For all other cases, plan for the current week
  return getWeekKey(date);
}
