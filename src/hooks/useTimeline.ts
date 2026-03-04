import { useMemo, useRef, useCallback } from 'react';
import { generateDayRange, toDayKey, isDayToday, isDayPast } from '../lib/dates';
import { usePlannerStore, selectItemsForDay } from '../store/usePlannerStore';
import type { DaySlot } from '../types';

const PAST_DAYS = 30;
const FUTURE_DAYS = 60;

export function useTimeline() {
  const items = usePlannerStore((s) => s.items);
  const todayRef = useRef<HTMLDivElement | null>(null);

  const days = useMemo(() => generateDayRange(PAST_DAYS, FUTURE_DAYS), []);

  const daySlots: DaySlot[] = useMemo(() => {
    return days.map((date) => {
      const key = toDayKey(date);
      return {
        key,
        date,
        isToday: isDayToday(date),
        isPast: isDayPast(date),
        items: selectItemsForDay(items, key),
      };
    });
  }, [days, items]);

  const scrollToToday = useCallback(() => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return { daySlots, todayRef, scrollToToday };
}
