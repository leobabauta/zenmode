import { useState, useRef, useEffect } from 'react';
import { parseISO } from 'date-fns';
import type { Recurrence, RecurrenceType } from '../../types';

interface RecurrencePopoverProps {
  recurrence: Recurrence | undefined;
  dayKey: string | null;
  taskName: string;
  onSave: (recurrence: Recurrence) => void;
  onClear: () => void;
  onClose: () => void;
}

const WEEKDAY_PILLS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

const MODES: { label: string; value: RecurrenceType }[] = [
  { label: 'Day', value: 'days' },
  { label: 'Week', value: 'weeks' },
  { label: 'Month', value: 'months' },
];

function getDefaultWeekday(dayKey: string | null): number {
  if (!dayKey) return new Date().getDay();
  return parseISO(dayKey).getDay();
}

function getDefaultDayOfMonth(dayKey: string | null): number {
  if (!dayKey) return new Date().getDate();
  return parseISO(dayKey).getDate();
}

function initMode(recurrence: Recurrence | undefined): RecurrenceType {
  if (!recurrence) return 'days';
  if (recurrence.type === 'weekday') return 'weeks';
  return recurrence.type;
}

function initWeekdays(recurrence: Recurrence | undefined, dayKey: string | null): number[] {
  if (recurrence?.weekdays?.length) return [...recurrence.weekdays];
  if (recurrence?.type === 'weekday' && recurrence.weekday != null) return [recurrence.weekday];
  return [getDefaultWeekday(dayKey)];
}

export function RecurrencePopover({ recurrence, dayKey, taskName, onSave, onClear, onClose }: RecurrencePopoverProps) {
  const [mode, setMode] = useState<RecurrenceType>(initMode(recurrence));
  const [interval, setInterval] = useState(recurrence?.interval ?? 1);
  const [weekdays, setWeekdays] = useState<number[]>(initWeekdays(recurrence, dayKey));
  const [dayOfMonth, setDayOfMonth] = useState(recurrence?.dayOfMonth ?? getDefaultDayOfMonth(dayKey));
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) => {
      if (prev.includes(day)) {
        // Don't allow deselecting the last one
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  };

  const handleSave = () => {
    let rec: Recurrence;
    switch (mode) {
      case 'days':
        rec = { type: 'days', interval };
        break;
      case 'weeks':
        rec = { type: 'weeks', interval: 1, weekdays };
        break;
      case 'months':
        rec = { type: 'months', interval: 1, dayOfMonth };
        break;
      default:
        rec = { type: 'days', interval: 1 };
    }
    onSave(rec);
    onClose();
  };

  const truncatedName = taskName.length > 30 ? taskName.slice(0, 30) + '…' : taskName;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-lg p-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Task name */}
      <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-3 truncate">
        {truncatedName}
      </div>

      {/* Segmented toggle */}
      <div className="flex rounded-lg bg-[var(--color-surface)] p-0.5 mb-3">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
              mode === m.value
                ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Mode-specific content */}
      {confirming ? (
        <div>
          <p className="text-xs text-[var(--color-text-primary)] mb-3">
            Delete all future recurrences of this task?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { onClear(); onClose(); }}
              className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-red-500 text-white hover:opacity-90 transition-opacity"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3">
            {mode === 'days' && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--color-surface)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">Repeat every</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 text-center text-sm font-medium bg-transparent text-[var(--color-text-primary)] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-[var(--color-text-secondary)]">day{interval !== 1 ? 's' : ''}</span>
              </div>
            )}

            {mode === 'weeks' && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {WEEKDAY_PILLS.map((wd) => {
                  const selected = weekdays.includes(wd.value);
                  return (
                    <button
                      key={wd.value}
                      onClick={() => toggleWeekday(wd.value)}
                      className={`w-9 h-9 text-xs font-medium rounded-full transition-colors ${
                        selected
                          ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)]'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      }`}
                    >
                      {wd.label}
                    </button>
                  );
                })}
              </div>
            )}

            {mode === 'months' && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--color-surface)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">Day of month</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                  className="w-12 text-center text-sm font-medium bg-transparent text-[var(--color-text-primary)] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            {recurrence ? (
              <button
                onClick={() => setConfirming(true)}
                className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Clear
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
            >
              Save
            </button>
          </div>
        </>
      )}
    </div>
  );
}
