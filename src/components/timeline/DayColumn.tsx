import { useDroppable } from '@dnd-kit/core';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { PracticeBox } from '../ui/PracticeBox';
import { cn } from '../../lib/utils';
import { GreetingBanner } from '../ui/GreetingBanner';
import { usePlannerStore } from '../../store/usePlannerStore';
import { getWeekKey } from '../../lib/dates';
import type { DaySlot } from '../../types';
import { forwardRef, useMemo } from 'react';

interface DayColumnProps {
  day: DaySlot;
  id?: string;
  onCrossPrev?: (cursorX?: number) => void;
  onCrossNext?: (cursorX?: number) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DayColumn = forwardRef<HTMLDivElement, DayColumnProps>(
  ({ day, id, onCrossPrev, onCrossNext }, ref) => {
    const { setNodeRef, isOver } = useDroppable({ id: day.key });
    const setView = usePlannerStore((s) => s.setView);
    const weeklyPlans = usePlannerStore((s) => s.weeklyPlans);
    const hasWeekPlan = day.isToday && !!weeklyPlans[getWeekKey(day.date)];

    const dayNum = day.date.getDate();
    const weekday = WEEKDAYS[day.date.getDay()];
    const practiceItems = useMemo(() => day.items.filter((i) => i.isPractice), [day.items]);
    const nonPracticeItems = useMemo(() => day.items.filter((i) => !i.isPractice), [day.items]);

    return (
      <div
        ref={ref}
        id={id}
        data-month={day.date.getMonth()}
        data-year={day.date.getFullYear()}
        className={cn(
          'min-h-[80px]',
          day.isToday
            ? 'bg-[var(--color-today)] rounded-2xl'
            : 'border-b border-[var(--color-border)]'
        )}
      >
        <div
          className={cn(
            'p-3 rounded-2xl transition-colors duration-100 flex gap-4',
            isOver && 'bg-[var(--color-accent-tint)]',
          )}
        >
          {/* Left column: day number + weekday */}
          <div className="w-[60px] flex-shrink-0 flex flex-col items-center pt-1">
            <span className={cn(
              'text-2xl font-bold leading-tight',
              day.isToday
                ? 'text-accent'
                : day.isPast
                  ? 'text-[var(--color-text-muted)]'
                  : 'text-[var(--color-text-primary)]'
            )}>
              {dayNum}
            </span>
            <span className={cn(
              'text-xs uppercase tracking-wider',
              day.isToday
                ? 'text-accent font-semibold'
                : day.isPast
                  ? 'text-[var(--color-text-muted)]'
                  : 'text-[var(--color-text-secondary)]'
            )}>
              {weekday}
            </span>
          </div>

          {/* Right column: tasks + add form */}
          <div className="flex-1 min-w-0">
            {day.isToday && (
              <>
                <div className="ml-[24px] mr-[34px]">
                  <GreetingBanner />
                </div>
                {hasWeekPlan && (
                  <button
                    onClick={() => setView('weekPlan')}
                    className="flex items-center gap-1.5 ml-[24px] mb-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span>Week's Plan</span>
                  </button>
                )}
              </>
            )}
            {practiceItems.length > 0 && (
              <PracticeBox items={practiceItems} className="mb-2 ml-[24px] mr-[34px]" />
            )}
            <div ref={setNodeRef} className="min-h-[8px]">
              <ItemList items={nonPracticeItems} onCrossPrev={onCrossPrev} onCrossNext={onCrossNext} />
            </div>
            <AddItemForm dayKey={day.key} className="mt-1" />
          </div>
        </div>
      </div>
    );
  }
);

DayColumn.displayName = 'DayColumn';
