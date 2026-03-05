import { useRef, useEffect, useState, useCallback } from 'react';
import { useTimeline } from '../../hooks/useTimeline';
import { usePlannerStore } from '../../store/usePlannerStore';
import { setPendingEditX } from '../../lib/editNavigation';
import { DayColumn } from './DayColumn';


const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function Timeline() {
  const { daySlots, scrollToToday } = useTimeline();
  const containerRef = useRef<HTMLDivElement>(null);
  const todayColumnRef = useRef<HTMLDivElement>(null);
  const startSelection = usePlannerStore((s) => s.startSelection);
  const selectionAnchorId = usePlannerStore((s) => s.selectionAnchorId);

  const [visibleMonth, setVisibleMonth] = useState<string>(() => {
    const now = new Date();
    return MONTH_NAMES[now.getMonth()];
  });

  // Refs for IntersectionObserver
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setDayRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) {
      dayRefs.current.set(key, el);
    } else {
      dayRefs.current.delete(key);
    }
  }, []);

  // Set up IntersectionObserver for month detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible day column
        let topEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) {
              topEntry = entry;
            }
          }
        }
        if (topEntry) {
          const el = topEntry.target as HTMLElement;
          const month = parseInt(el.dataset.month ?? '0', 10);
          setVisibleMonth(MONTH_NAMES[month]);
        }
      },
      {
        root: container,
        rootMargin: '0px 0px -80% 0px',
        threshold: 0,
      }
    );

    // Observe all day elements
    dayRefs.current.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [daySlots]);

  const scrollToTodayRequested = usePlannerStore((s) => s.scrollToTodayRequested);

  // Scroll to today on mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      todayColumnRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, 50);
    return () => clearTimeout(timeout);
  }, [scrollToToday]);

  // Scroll to today when requested via "gt" shortcut
  useEffect(() => {
    if (scrollToTodayRequested > 0) {
      todayColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scrollToTodayRequested]);

  // Auto-select first item of today (or nearest day) on mount for manipulating mode
  useEffect(() => {
    if (selectionAnchorId) return; // already have a selection
    const todayIndex = daySlots.findIndex((d) => d.isToday);
    if (todayIndex === -1) return;
    for (let j = todayIndex; j < daySlots.length; j++) {
      if (daySlots[j].items.length > 0) {
        startSelection(daySlots[j].items[0].id);
        return;
      }
    }
    for (let j = todayIndex - 1; j >= 0; j--) {
      if (daySlots[j].items.length > 0) {
        startSelection(daySlots[j].items[0].id);
        return;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-4 relative">
      {/* Floating month pill + inbox icon */}
      <div className="sticky top-2 z-10 flex justify-center items-start pointer-events-none mb-2">
        <div className="pointer-events-auto bg-white dark:bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm rounded-full px-4 py-1.5 flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
          <svg className="w-4 h-4 text-[var(--color-text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {visibleMonth}
        </div>

      </div>

      <div className="max-w-2xl mx-auto space-y-2">
        {daySlots.map((day, i) => {
          const onCrossPrev = (cursorX?: number) => {
            for (let j = i - 1; j >= 0; j--) {
              const prev = daySlots[j];
              if (prev.items.length > 0) {
                if (cursorX !== undefined) setPendingEditX(cursorX);
                startSelection(prev.items[prev.items.length - 1].id);
                return;
              }
            }
          };

          const onCrossNext = (cursorX?: number) => {
            for (let j = i + 1; j < daySlots.length; j++) {
              const next = daySlots[j];
              if (next.items.length > 0) {
                if (cursorX !== undefined) setPendingEditX(cursorX);
                startSelection(next.items[0].id);
                return;
              }
            }
          };

          return (
            <DayColumn
              key={day.key}
              day={day}
              ref={(el) => {
                setDayRef(day.key, el);
                if (day.isToday) {
                  (todayColumnRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                }
              }}
              id={day.isToday ? 'today-column' : undefined}
              onCrossPrev={onCrossPrev}
              onCrossNext={onCrossNext}
            />
          );
        })}
        <div className="h-24" />
      </div>
    </div>
  );
}
