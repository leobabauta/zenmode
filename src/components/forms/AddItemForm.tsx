import { useState, useRef, useEffect } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { cn } from '../../lib/utils';

interface AddItemFormProps {
  dayKey: string | null;
  isLater?: boolean;
  className?: string;
}

type EditMode = 'idle' | 'task' | 'note';

export function AddItemForm({ dayKey, isLater = false, className }: AddItemFormProps) {
  const addItem = usePlannerStore((s) => s.addItem);
  const [mode, setMode] = useState<EditMode>('idle');
  const [text, setText] = useState('');
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
      addItem({ type: 'note', text: trimmed, dayKey, isLater });
    } else {
      addItem({ type: 'task', text: trimmed, dayKey, isLater });
    }
  };

  const submit = () => {
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
          'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
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
    <div className={cn('flex items-center gap-2 px-3 py-2', className)}>
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
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={(e) => {
          if ((e.key === 'Backspace' || e.key === 'Delete') && text === '' && (inputRef.current?.selectionStart ?? 0) === 0) {
            e.preventDefault();
            if (mode === 'task') {
              // Convert to note
              setMode('note');
            } else {
              // Already a note — close
              close();
            }
            return;
          }
          if (e.key === 'Enter') { submit(); return; }
          if (e.key === 'Escape') { close(); return; }
        }}
        onBlur={() => {
          if (!text.trim()) close();
        }}
        placeholder={mode === 'task' ? 'Task' : 'Note'}
        className={cn(
          'flex-1 bg-transparent text-sm text-[var(--color-text-primary)]',
          'placeholder:text-[var(--color-text-muted)]',
          'outline-none',
        )}
      />
    </div>
  );
}
