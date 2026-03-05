import { useState, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlannerStore } from '../../store/usePlannerStore';
import { consumePendingEditX, getInputCursorX, getOffsetFromX } from '../../lib/editNavigation';
import { IconButton } from '../ui/IconButton';
import { HashtagText } from '../ui/HashtagText';
import { cn } from '../../lib/utils';
import type { PlannerItem } from '../../types';

interface NoteItemProps {
  item: PlannerItem;
  isDragging?: boolean;
  isSelected?: boolean;
  isFocused?: boolean;
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
  onDeleteAndFocusPrev?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function NoteItem({
  item, isDragging, isSelected, isFocused,
  onSelect, onExtendSelection, onDeselect, onSelectPrev, onSelectNext,
  onShiftSelectPrev, onShiftSelectNext, onMoveUp, onMoveDown,
  onInsertAfter, onDeleteAndFocusPrev, dragHandleProps,
}: NoteItemProps) {
  const { updateItem, deleteItem, promptDeleteItem, sendToInbox, sendToLater, setShowMoveModal, setHashtagView } = usePlannerStore(useShallow((s) => ({
    updateItem: s.updateItem,
    deleteItem: s.deleteItem,
    promptDeleteItem: s.promptDeleteItem,
    sendToInbox: s.sendToInbox,
    sendToLater: s.sendToLater,
    setShowMoveModal: s.setShowMoveModal,
    setHashtagView: s.setHashtagView,
  })));
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const lastKeyRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorPosRef = useRef(0);
  const pendingXRef = useRef<number | null>(null);

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
  const isEmpty = item.text === '';

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

      <div className="flex-1 min-w-0 cursor-text" onClick={handleContentClick}>
        {isEditing ? (
          <input
            ref={inputRef}
            value={editText}
            onChange={(e) => {
              const val = e.target.value;
              // "[] " at start converts note to task
              if (val.startsWith('[] ')) {
                const rest = val.slice(3);
                updateItem(item.id, { type: 'task', text: rest || item.text });
                setEditText(rest || item.text);
                setIsEditing(false);
                return;
              }
              setEditText(val);
            }}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if ((e.key === 'Backspace' || e.key === 'Delete') && editText === '' && (inputRef.current?.selectionStart ?? 0) === 0) {
                e.preventDefault();
                // Delete blank note and focus previous item
                deleteItem(item.id);
                onDeleteAndFocusPrev?.();
                return;
              }
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
              if (e.key === 'Escape') { setEditText(item.text); setIsEditing(false); return; }
              if (e.key === 'ArrowUp' && !e.shiftKey) {
                e.preventDefault();
                const x = getInputCursorX(inputRef.current!);
                commitEdit();
                onSelectPrev?.(x);
                return;
              }
              if (e.key === 'ArrowDown' && !e.shiftKey) {
                e.preventDefault();
                const x = getInputCursorX(inputRef.current!);
                commitEdit();
                onSelectNext?.(x);
                return;
              }
            }}
            className="w-full bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
          />
        ) : isEmpty ? (
          <span className="text-sm">&nbsp;</span>
        ) : (
          <HashtagText
            text={item.text}
            onHashtagClick={setHashtagView}
            className="text-sm break-words text-[var(--color-text-primary)] whitespace-pre-line"
          />
        )}
      </div>

      <IconButton
        label="Delete note"
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
