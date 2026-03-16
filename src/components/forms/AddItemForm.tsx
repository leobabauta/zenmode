import { useState, useRef, useEffect } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { parseReminder, detectPossibleReminder } from '../../lib/reminderParser';
import { toDayKey } from '../../lib/dates';
import { cn } from '../../lib/utils';

interface AddItemFormProps {
  dayKey: string | null;
  isLater?: boolean;
  className?: string;
  listId?: string;
}

type EditMode = 'idle' | 'task' | 'note';

export function AddItemForm({ dayKey, isLater = false, className, listId }: AddItemFormProps) {
  const addItem = usePlannerStore((s) => s.addItem);
  const setRecurrence = usePlannerStore((s) => s.setRecurrence);
  const [mode, setMode] = useState<EditMode>('idle');
  const [text, setText] = useState('');
  const [showReminderConfirm, setShowReminderConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    setMode('task');
    setText('');
  };

  const close = () => {
    setMode('idle');
    setText('');
  };

  useEffect(() => {
    if (mode !== 'idle') {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [mode]);

  const submitLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (mode === 'note') {
      addItem({ type: 'note', text: trimmed, dayKey, isLater, listId });
    } else {
      const reminder = parseReminder(trimmed);
      if (reminder) {
        const reminderDate = new Date(reminder.reminderAt);
        const reminderDayKey = toDayKey(reminderDate);
        addItem({ type: 'task', text: reminder.cleanText, dayKey: reminderDayKey, reminderAt: reminder.reminderAt });
        // If recurring, find the just-created item and set recurrence
        if (reminder.recurrence) {
          const items = usePlannerStore.getState().items;
          const newItem = Object.values(items).find(
            (i) => i.text === reminder.cleanText && i.dayKey === reminderDayKey && i.reminderAt === reminder.reminderAt
          );
          if (newItem) setRecurrence(newItem.id, reminder.recurrence);
        }
        const timeStr = reminderDate.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        const recurLabel = reminder.recurrence ? ' (recurring)' : '';
        usePlannerStore.setState({ reminderToast: `Reminder set for ${timeStr}${recurLabel}` });
      } else {
        addItem({ type: 'task', text: trimmed, dayKey, isLater, listId });
      }
    }
  };

  const detectedReminder = mode === 'task' && text.trim() && !parseReminder(text.trim())
    ? detectPossibleReminder(text.trim())
    : null;

  const acceptDetectedReminder = () => {
    if (!detectedReminder) return;
    const reminderDate = new Date(detectedReminder.reminderAt);
    const reminderDayKey = toDayKey(reminderDate);
    addItem({ type: 'task', text: detectedReminder.cleanText, dayKey: reminderDayKey, reminderAt: detectedReminder.reminderAt });
    const timeStr = reminderDate.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    usePlannerStore.setState({ reminderToast: `Reminder set for ${timeStr}` });
    setText('');
    setShowReminderConfirm(false);
    inputRef.current?.focus();
  };

  const submit = () => {
    // If there's a detected reminder (no @), ask for confirmation first
    if (detectedReminder && !showReminderConfirm) {
      setShowReminderConfirm(true);
      return;
    }
    setShowReminderConfirm(false);
    submitLine(text);
    setText('');
    setMode('task');
    inputRef.current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted.includes('\n')) {
      e.preventDefault();
      const lines = (text + pasted).split('\n');
      lines.forEach((line) => submitLine(line));
      setText('');
    }
  };

  if (mode === 'idle') {
    return (
      <button
        onClick={open}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm -ml-9',
          'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
          'hover:bg-[var(--color-surface)] transition-colors duration-100',
          className
        )}
      >
        {/* Invisible spacer matching drag handle width */}
        <span className="w-4 flex-shrink-0" />
        {/* + icon matching checkbox width */}
        <span className="w-5 flex-shrink-0 flex items-center justify-center">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </span>
        Add item
      </button>
    );
  }

  return (
    <div className={cn('relative flex items-center gap-2 px-3 py-2 -ml-9', className)}>
      {/* Invisible spacer matching drag handle width */}
      <span className="w-4 flex-shrink-0" />

      {/* Checkbox circle only in task mode; in note mode text aligns with checkbox position */}
      {mode === 'task' && (
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
          <svg viewBox="0 0 16 16" className="w-full h-full" fill="none">
            <circle
              cx="8" cy="8" r="6.5"
              stroke="var(--color-text-muted)"
              strokeWidth="1.5"
              strokeDasharray="2.5 2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      <input
        ref={inputRef}
        value={text}
        onPaste={handlePaste}
        onKeyDown={(e) => {
          // Handle Y/N when reminder confirmation is showing
          if (showReminderConfirm && detectedReminder) {
            if (e.key === 'y' || e.key === 'Y') {
              e.preventDefault();
              acceptDetectedReminder();
              return;
            }
            if (e.key === 'n' || e.key === 'N') {
              e.preventDefault();
              setShowReminderConfirm(false);
              return;
            }
          }
          if ((e.key === 'Backspace' || e.key === 'Delete') && text === '' && (inputRef.current?.selectionStart ?? 0) === 0) {
            e.preventDefault();
            if (mode === 'task') {
              setMode('note');
            } else {
              close();
            }
            return;
          }
          if (e.key === 'Enter') { submit(); return; }
          if (e.key === 'Escape') { setShowReminderConfirm(false); close(); return; }
        }}
        onChange={(e) => { setText(e.target.value); setShowReminderConfirm(false); }}
        onBlur={() => {
          if (!text.trim()) { setShowReminderConfirm(false); close(); }
        }}
        placeholder={mode === 'task' ? 'Task' : 'Note'}
        className={cn(
          'flex-1 bg-transparent text-sm text-[var(--color-text-primary)]',
          'placeholder:text-[var(--color-text-muted)]',
          'outline-none',
        )}
      />
      {showReminderConfirm && detectedReminder && (
        <div className="absolute left-0 right-0 top-full mt-1 ml-9 flex items-center gap-2 text-[11px] z-10">
          <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <span className="text-[var(--color-text-secondary)]">
            Reminder for {new Date(detectedReminder.reminderAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}?
          </span>
          <button
            onMouseDown={(e) => { e.preventDefault(); acceptDetectedReminder(); }}
            className="px-2 py-0.5 font-semibold rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors"
          >
            Y
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); setShowReminderConfirm(false); }}
            className="px-2 py-0.5 font-medium rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-colors"
          >
            N
          </button>
        </div>
      )}
    </div>
  );
}
