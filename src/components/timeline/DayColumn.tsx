import { useDroppable } from '@dnd-kit/core';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { cn } from '../../lib/utils';
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
            {practiceItems.length > 0 && (
              <div className="mb-2 ml-[24px] mr-[34px] rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex-shrink-0">
                  Practice
                </span>
                <span className="text-sm text-[var(--color-text-primary)]">
                  {practiceItems.map((i) => i.text).join(', ')}
                </span>
              </div>
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
