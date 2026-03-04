import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { generateDayRange, toDayKey, isDayToday, isDayPast } from '../lib/dates';
import { usePlannerStore, selectItemsForDay } from '../store/usePlannerStore';
import type { DaySlot } from '../types';

const PAST_DAYS = 30;
const FUTURE_DAYS = 60;

export function useTimeline() {
  const items = usePlannerStore((s) => s.items);
  const todayRef = useRef<HTMLDivElement | null>(null);

  // Force recompute at midnight so "today" highlight updates
  const [todayKey, setTodayKey] = useState(() => toDayKey(new Date()));
  useEffect(() => {
    const scheduleNextMidnight = () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      const ms = midnight.getTime() - now.getTime();
      return setTimeout(() => {
        setTodayKey(toDayKey(new Date()));
        timerId = scheduleNextMidnight();
      }, ms + 100); // +100ms buffer
    };
    let timerId = scheduleNextMidnight();
    return () => clearTimeout(timerId);
  }, []);

  const days = useMemo(() => generateDayRange(PAST_DAYS, FUTURE_DAYS), [todayKey]);

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
