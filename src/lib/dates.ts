import {
  format,
  addDays,
  subDays,
  isToday,
  isPast,
  startOfDay,
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
