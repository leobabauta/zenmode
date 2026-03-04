import { useState, useEffect, useRef } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { cn } from '../../lib/utils';
import type { ItemType } from '../../types';

export function QuickCaptureBar() {
  const addItem = usePlannerStore((s) => s.addItem);
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [type, setType] = useState<ItemType>('task');
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: N to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === 'n' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    setText('');
    setType('task');
  };

  const submitLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    addItem({ type, text: trimmed, dayKey: null });
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      close();
      return;
    }
    submitLine(trimmed);
    close();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted.includes('\n')) {
      e.preventDefault();
      const lines = (text + pasted).split('\n');
      lines.forEach((line) => submitLine(line));
      close();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2',
          'flex items-center gap-2 px-4 py-2.5 rounded-full',
          'bg-[var(--color-surface)] border border-[var(--color-border)]',
          'text-sm text-[var(--color-text-secondary)]',
          'shadow-lg hover:shadow-xl transition-shadow duration-200',
          'hover:border-accent hover:text-[var(--color-text-primary)]'
        )}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Quick capture
        <kbd className="ml-1 text-[10px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[var(--color-text-muted)]">N</kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
        onClick={close}
      />

      {/* Modal */}
      <div className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'w-full max-w-md mx-auto px-4',
      )}>
        <div className={cn(
          'bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl',
          'shadow-2xl p-4',
        )}>
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setType('task')}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                type === 'task'
                  ? 'bg-accent text-white border-accent'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-accent'
              )}
            >
              Task
            </button>
            <button
              onClick={() => setType('note')}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                type === 'note'
                  ? 'bg-[var(--color-note-accent)] text-white border-[var(--color-note-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-note-accent)]'
              )}
            >
              Note
            </button>
            <span className="ml-auto text-xs text-[var(--color-text-muted)]">to Inbox</span>
          </div>

          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') close();
            }}
            placeholder={type === 'task' ? 'Capture a task...' : 'Capture a note...'}
            className={cn(
              'w-full bg-transparent text-sm text-[var(--color-text-primary)]',
              'placeholder:text-[var(--color-text-muted)]',
              'outline-none',
            )}
          />

          <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
            <button
              onClick={submit}
              className="text-xs px-3 py-1.5 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Add to inbox
            </button>
            <button
              onClick={close}
              className="text-xs px-3 py-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Cancel
            </button>
            <span className="ml-auto text-[10px] text-[var(--color-text-muted)] self-center">
              Enter to save · Esc to close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
