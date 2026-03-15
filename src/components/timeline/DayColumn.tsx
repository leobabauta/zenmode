import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { cn } from '../../lib/utils';
import { GreetingBanner } from '../ui/GreetingBanner';
import { usePlannerStore, selectPendingRemindersForDay } from '../../store/usePlannerStore';
import { getWeekKey } from '../../lib/dates';
import type { DaySlot } from '../../types';
import { forwardRef } from 'react';

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
    const items = usePlannerStore((s) => s.items);
    const [showReminders, setShowReminders] = useState(false);

    const pendingReminders = selectPendingRemindersForDay(items, day.key);
    const deleteItem = usePlannerStore((s) => s.deleteItem);

    // Show "This Week's Plan" at bottom of any Monday that has a plan,
    // except the current week's Monday on Monday itself (show starting Tuesday)
    const isMonday = day.date.getDay() === 1;
    const weekKey = isMonday ? getWeekKey(day.date) : '';
    const hasWeekPlan = isMonday && !!weeklyPlans[weekKey];
    const currentWeekKey = getWeekKey(new Date());
    const isCurrentWeek = weekKey === currentWeekKey;
    const todayDow = new Date().getDay();
    const isTuesdayOrLater = todayDow >= 2 || todayDow === 0;
    const showWeekPlanOnMonday = hasWeekPlan && (!isCurrentWeek || isTuesdayOrLater);

    const dayNum = day.date.getDate();
    const weekday = WEEKDAYS[day.date.getDay()];
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
            {/* Pending reminders indicator */}
            {pendingReminders.length > 0 && (
              <button
                onClick={() => setShowReminders(!showReminders)}
                className="mt-1.5 flex items-center gap-0.5 text-[var(--color-accent)] hover:opacity-80 transition-opacity"
                title={`${pendingReminders.length} pending reminder${pendingReminders.length > 1 ? 's' : ''}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <span className="text-[10px] font-semibold">{pendingReminders.length}</span>
              </button>
            )}
          </div>

          {/* Right column: tasks + add form */}
          <div className="flex-1 min-w-0">
            {day.isToday && (
              <div className="ml-[24px] mr-[34px]">
                <GreetingBanner />
              </div>
            )}

            {/* Pending reminders popover */}
            {showReminders && pendingReminders.length > 0 && (
              <div className="mb-2 ml-[24px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  Upcoming reminders
                </div>
                {pendingReminders.map((item) => {
                  const time = new Date(item.reminderAt!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                  return (
                    <div key={item.id} className="flex items-center gap-2 py-1 text-sm group">
                      <span className="text-[var(--color-accent)] text-xs font-medium w-16 flex-shrink-0">{time}</span>
                      <span className="text-[var(--color-text-primary)] truncate flex-1">{item.text}</span>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-500 transition-all"
                        title="Delete reminder"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div ref={setNodeRef} className="min-h-[8px]">
              <ItemList items={day.items} onCrossPrev={onCrossPrev} onCrossNext={onCrossNext} />
            </div>
            <AddItemForm dayKey={day.key} className="mt-1" />
            {showWeekPlanOnMonday && (
              <button
                onClick={() => {
                  usePlannerStore.setState({ activeWeekPlanKey: weekKey });
                  setView('weekPlan');
                }}
                className="flex items-center gap-1.5 ml-[24px] mt-3 mb-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>This Week's Plan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

DayColumn.displayName = 'DayColumn';
