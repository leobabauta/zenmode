import { useState, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlannerStore, selectChildItems } from '../../store/usePlannerStore';
import { consumePendingEditX, getInputCursorX, getOffsetFromX, setPendingEditX } from '../../lib/editNavigation';
import { Checkbox } from '../ui/Checkbox';
import { IconButton } from '../ui/IconButton';
import { RecurrencePopover } from '../ui/RecurrencePopover';
import { HashtagText } from '../ui/HashtagText';
import { cn } from '../../lib/utils';
import type { PlannerItem } from '../../types';

interface TaskItemProps {
  item: PlannerItem;
  isDragging?: boolean;
  isSelected?: boolean;   // part of the highlighted selection range
  isFocused?: boolean;    // the keyboard-active end of the selection
  onSelect?: () => void;
  onExtendSelection?: () => void;
  onDeselect?: () => void;
  onSelectPrev?: (cursorX?: number) => void;
  onSelectNext?: (cursorX?: number) => void;
  onShiftSelectPrev?: () => void;
  onShiftSelectNext?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onInsertAfter?: (text: string) => void;
  dragHandleProps?: Record<string, unknown>;
}

export function TaskItem({
  item, isDragging, isSelected, isFocused,
  onSelect, onExtendSelection, onDeselect, onSelectPrev, onSelectNext,
  onShiftSelectPrev, onShiftSelectNext, onMoveUp, onMoveDown,
  onInsertAfter, dragHandleProps,
}: TaskItemProps) {
  const { updateItem, promptDeleteItem, setRecurrence, sendToInbox, sendToLater, setExpandedTask, setShowMoveModal, setHashtagView } = usePlannerStore(useShallow((s) => ({
    updateItem: s.updateItem,
    promptDeleteItem: s.promptDeleteItem,
    setRecurrence: s.setRecurrence,
    sendToInbox: s.sendToInbox,
    sendToLater: s.sendToLater,
    setExpandedTask: s.setExpandedTask,
    setShowMoveModal: s.setShowMoveModal,
    setHashtagView: s.setHashtagView,
  })));
  const hasChildren = usePlannerStore((s) => selectChildItems(s.items, item.id).length > 0);
  const [isEditing, setIsEditing] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const lastKeyRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorPosRef = useRef(0);
  const pendingXRef = useRef<number | null>(null);

  // When this item becomes the focused item: either jump straight into edit
  // (if a pending x-position was stored by keyboard nav) or focus the container.
  useEffect(() => {
    if (!isFocused || isEditing) return;
    const x = consumePendingEditX();
    if (x !== null) {
      pendingXRef.current = x;
      setIsEditing(true);
    } else {
      containerRef.current?.focus();
    }
  }, [isFocused, isEditing]);

  // After the input renders: position the cursor.
  useEffect(() => {
    if (!isEditing || !inputRef.current) return;
    inputRef.current.focus();
    if (pendingXRef.current !== null) {
      const offset = getOffsetFromX(inputRef.current, pendingXRef.current);
      inputRef.current.setSelectionRange(offset, offset);
      pendingXRef.current = null;
    } else {
      inputRef.current.setSelectionRange(cursorPosRef.current, cursorPosRef.current);
    }
  }, [isEditing]);

  const commitEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) updateItem(item.id, { text: trimmed });
    else setEditText(item.text);
    setIsEditing(false);
  };

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditing) return;
    let offset = item.text.length;
    if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) offset = range.startOffset;
    } else if ('caretPositionFromPoint' in document) {
      const pos = (document as unknown as { caretPositionFromPoint: (x: number, y: number) => { offset: number } | null }).caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) offset = pos.offset;
    }
    cursorPosRef.current = offset;
    onSelect?.();
    setIsEditing(true);
  };

  // Keyboard handler for manipulating mode (only fires when container has DOM focus).
  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) return;

    // dd to delete (vim-style)
    if (e.key === 'd' && !e.shiftKey) {
      const now = Date.now();
      if (lastKeyRef.current.key === 'd' && now - lastKeyRef.current.time < 500) {
        e.preventDefault();
        promptDeleteItem(item.id);
        lastKeyRef.current = { key: '', time: 0 };
        return;
      }
      lastKeyRef.current = { key: 'd', time: now };
      return;
    }

    lastKeyRef.current = { key: '', time: 0 };

    // Shift+I → send to Inbox
    if (e.key === 'I' && e.shiftKey) {
      e.preventDefault();
      sendToInbox(item.id);
      onDeselect?.();
      return;
    }
    // Shift+E → send to Later Archive
    if (e.key === 'E' && e.shiftKey) {
      e.preventDefault();
      sendToLater(item.id);
      onDeselect?.();
      return;
    }

    switch (e.key) {
      case 'Delete':
      case 'Backspace': e.preventDefault(); promptDeleteItem(item.id); break;
      case 'j': e.preventDefault(); onMoveDown?.(); break;
      case 'k': e.preventDefault(); onMoveUp?.(); break;
      case 'ArrowUp':
        e.preventDefault();
        if (e.shiftKey) onShiftSelectPrev?.();
        else onSelectPrev?.();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (e.shiftKey) onShiftSelectNext?.();
        else onSelectNext?.();
        break;
      case 'm': e.preventDefault(); setShowMoveModal(true); break;
      case 'Enter':
        e.preventDefault();
        cursorPosRef.current = item.text.length;
        setIsEditing(true);
        break;
      case 'Escape': e.preventDefault(); onDeselect?.(); break;
    }
  };

  const isManipulating = isFocused && !isEditing;

  return (
    <div
      ref={containerRef}
      tabIndex={isManipulating ? 0 : -1}
      onKeyDown={handleContainerKeyDown}
      className={cn(
        'group flex items-start gap-2 px-3 py-2.5 rounded-lg outline-none',
        'transition-colors duration-100',
        isSelected && !isEditing
          ? 'bg-[var(--color-accent-tint)] ring-1 ring-[var(--color-accent)]/20'
          : 'hover:bg-[var(--color-surface)]',
        isDragging && 'opacity-50',
      )}
    >
      <button
        type="button"
        {...dragHandleProps}
        onClick={(e) => {
          e.stopPropagation();
          if (e.shiftKey) onExtendSelection?.();
          else onSelect?.();
        }}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] mt-0.5"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5.5" cy="3.5" r="1.5" />
          <circle cx="10.5" cy="3.5" r="1.5" />
          <circle cx="5.5" cy="8" r="1.5" />
          <circle cx="10.5" cy="8" r="1.5" />
          <circle cx="5.5" cy="12.5" r="1.5" />
          <circle cx="10.5" cy="12.5" r="1.5" />
        </svg>
      </button>

      <div className="mt-0.5">
        <Checkbox
          checked={item.completed}
          onChange={(checked) => updateItem(item.id, { completed: checked })}
        />
      </div>

      <div className="flex-1 min-w-0 cursor-text" onClick={handleContentClick}>
        {isEditing ? (
          <textarea
            ref={inputRef}
            value={editText}
            rows={Math.min(Math.max(editText.split('\n').length, 1), 10)}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const cursorPos = inputRef.current?.selectionStart ?? editText.length;
                const before = editText.slice(0, cursorPos);
                const after = editText.slice(cursorPos);
                if (!before.trim()) {
                  // Cursor at beginning: clear current item, move text to new line
                  updateItem(item.id, { text: '' });
                  setEditText('');
                } else {
                  const trimmedBefore = before.trim();
                  if (trimmedBefore !== item.text) updateItem(item.id, { text: trimmedBefore });
                  setEditText(trimmedBefore);
                }
                setIsEditing(false);
                onInsertAfter?.(after);
                return;
              }
              if ((e.key === 'Backspace' || e.key === 'Delete') && editText === '' && (inputRef.current?.selectionStart ?? 0) === 0) {
                e.preventDefault();
                // Convert blank task to note
                updateItem(item.id, { type: 'note', text: '' });
                setIsEditing(false);
                // Re-enter edit mode on the now-note item (clear then re-select to trigger effect)
                const store = usePlannerStore.getState();
                store.clearSelection();
                setPendingEditX(0);
                setTimeout(() => store.startSelection(item.id), 0);
                return;
              }
              if (e.key === 'Escape') { setEditText(item.text); setIsEditing(false); return; }
              if (e.key === 'ArrowUp' && !e.shiftKey) {
                const el = inputRef.current!;
                const pos = el.selectionStart ?? 0;
                const textBefore = editText.slice(0, pos);
                if (!textBefore.includes('\n')) {
                  e.preventDefault();
                  const x = getInputCursorX(el);
                  commitEdit();
                  onSelectPrev?.(x);
                }
                return;
              }
              if (e.key === 'ArrowDown' && !e.shiftKey) {
                const el = inputRef.current!;
                const pos = el.selectionStart ?? 0;
                const textAfter = editText.slice(pos);
                if (!textAfter.includes('\n')) {
                  e.preventDefault();
                  const x = getInputCursorX(el);
                  commitEdit();
                  onSelectNext?.(x);
                }
                return;
              }
            }}
            className="w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none resize-none"
          />
        ) : item.text === '' ? (
          <span className="text-sm">&nbsp;</span>
        ) : (
          <HashtagText
            text={item.text}
            onHashtagClick={setHashtagView}
            className={cn(
              'text-sm break-words',
              item.completed ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'
            )}
          />
        )}
      </div>

      <div className="relative flex-shrink-0">
        <IconButton
          label="Set recurrence"
          onClick={() => setShowRecurrence((v) => !v)}
          className={cn(
            'flex-shrink-0 opacity-0 group-hover:opacity-100',
            item.recurrence
              ? 'group-hover:text-[var(--color-accent)]'
              : ''
          )}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.49 9A9 9 0 005.64 5.64L4 4m16 16l-1.64-1.64A9 9 0 013.51 15" />
          </svg>
        </IconButton>
        {showRecurrence && (
          <RecurrencePopover
            recurrence={item.recurrence}
            dayKey={item.dayKey}
            taskName={item.text}
            onSave={(rec) => setRecurrence(item.id, rec)}
            onClear={() => setRecurrence(item.id, null)}
            onClose={() => setShowRecurrence(false)}
          />
        )}
      </div>

      <IconButton
        label="Task focus mode"
        onClick={() => setExpandedTask(item.id)}
        className={cn(
          'flex-shrink-0',
          hasChildren
            ? 'text-[var(--color-text-muted)] opacity-100'
            : 'opacity-0 group-hover:opacity-100'
        )}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6m0 0v6m0-6l-7 7M9 21H3m0 0v-6m0 6l7-7" />
        </svg>
      </IconButton>

      {item.isPriority && (
        <div className="p-1.5 flex-shrink-0">
          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-400 ring-1 ring-amber-400/30">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </span>
        </div>
      )}
      {item.isMediumPriority && !item.isPriority && (
        <div className="p-1.5 flex-shrink-0">
          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-400 ring-1 ring-slate-400/30">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </span>
        </div>
      )}

      <IconButton
        label="Delete task"
        onClick={() => promptDeleteItem(item.id)}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </IconButton>
    </div>
  );
}
