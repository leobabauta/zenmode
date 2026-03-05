import { useState, useRef, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlannerStore, selectChildItems } from '../../store/usePlannerStore';
import { Checkbox } from '../ui/Checkbox';
import { IconButton } from '../ui/IconButton';
import { HashtagText } from '../ui/HashtagText';
import { FocusTimer } from '../ui/FocusTimer';
import { cn } from '../../lib/utils';
import type { PlannerItem } from '../../types';

interface ChildItemProps {
  item: PlannerItem;
  editTrigger?: number;  // incrementing tick to trigger edit mode
  onFocusPrev: () => void;
  onFocusNext: () => void;
}

function ChildItem({ item, editTrigger, onFocusPrev, onFocusNext }: ChildItemProps) {
  const { updateItem, deleteItem, promptDeleteItem, setHashtagView } = usePlannerStore(useShallow((s) => ({
    updateItem: s.updateItem,
    deleteItem: s.deleteItem,
    promptDeleteItem: s.promptDeleteItem,
    setHashtagView: s.setHashtagView,
  })));
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  // Enter edit mode when triggered by parent
  useEffect(() => {
    if (editTrigger) {
      setEditText(item.text);
      setIsEditing(true);
    }
  }, [editTrigger]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [isEditing]);

  const commitEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed && !item.text) {
      deleteItem(item.id);
      onFocusPrev();
      return;
    }
    if (trimmed && trimmed !== item.text) updateItem(item.id, { text: trimmed });
    else setEditText(item.text);
    setIsEditing(false);
  };

  return (
    <div className="group flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--color-surface)] transition-colors">
      {item.type === 'task' && (
        <div className="mt-0.5">
          <Checkbox
            checked={item.completed}
            onChange={(checked) => updateItem(item.id, { completed: checked })}
          />
        </div>
      )}
      <div
        className="flex-1 min-w-0 cursor-text"
        onClick={() => { if (!isEditing) setIsEditing(true); }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editText}
            onChange={(e) => {
              const val = e.target.value;
              // "[] " at start converts note to task
              if (item.type === 'note' && val.startsWith('[] ')) {
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
              if (e.key === 'Enter') {
                e.preventDefault();
                commitEdit();
                onFocusNext();
              }
              if (e.key === 'Backspace' && editText === '') {
                e.preventDefault();
                deleteItem(item.id);
                onFocusPrev();
              }
              if (e.key === 'Escape') { setEditText(item.text); setIsEditing(false); }
            }}
            className="w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none"
          />
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
      <IconButton
        label="Delete"
        onClick={() => promptDeleteItem(item.id)}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </IconButton>
    </div>
  );
}

export function ExpandedTaskView() {
  const { expandedTaskId, items, setExpandedTask, addItem, deleteItem, expandedTaskFullScreen, setExpandedTaskFullScreen } = usePlannerStore(useShallow((s) => ({
    expandedTaskId: s.expandedTaskId,
    items: s.items,
    setExpandedTask: s.setExpandedTask,
    addItem: s.addItem,
    deleteItem: s.deleteItem,
    expandedTaskFullScreen: s.expandedTaskFullScreen,
    setExpandedTaskFullScreen: s.setExpandedTaskFullScreen,
  })));

  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  // editRequest: { index, tick } — index is the child to edit (-1 = new last child), tick always increments
  const [editRequest, setEditRequest] = useState<{ index: number; tick: number } | null>(null);
  const tickRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const task = expandedTaskId ? items[expandedTaskId] : null;
  const children = expandedTaskId ? selectChildItems(items, expandedTaskId) : [];

  const focusTextarea = useCallback(() => {
    // Small delay to let React finish re-rendering after item deletion
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const submitLine = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !task) return;
    if (trimmed.startsWith('[] ') && trimmed.length > 3) {
      addItem({ type: 'task', text: trimmed.slice(3).trim(), dayKey: task.dayKey, parentId: task.id });
    } else {
      addItem({ type: 'note', text: trimmed, dayKey: task.dayKey, parentId: task.id });
    }
  };

  const closeAndSave = () => {
    submitLine(inputText);
    setInputText('');
    setExpandedTaskFullScreen(false);
    setExpandedTask(null);
  };

  const closeAndSaveRef = useRef(closeAndSave);
  closeAndSaveRef.current = closeAndSave;

  const requestEditAt = useCallback((index: number) => {
    tickRef.current += 1;
    setEditRequest({ index, tick: tickRef.current });
  }, []);

  // Keyboard shortcuts for modal
  useEffect(() => {
    if (!expandedTaskId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAndSaveRef.current();
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        e.stopPropagation();
        setExpandedTaskFullScreen(!expandedTaskFullScreen);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [expandedTaskId, expandedTaskFullScreen, setExpandedTaskFullScreen]);

  if (!task) return null;

  const createdDate = new Date(task.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      {/* Backdrop (non-fullscreen only) */}
      {!expandedTaskFullScreen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={closeAndSave}
        />
      )}

      {/* Modal / Full-screen view */}
      <div className={cn(
        'bg-[var(--color-bg)] flex flex-col overflow-hidden',
        expandedTaskFullScreen
          ? 'fixed inset-x-0 bottom-0 top-[41px] w-full h-auto z-30'
          : 'fixed left-1/2 -translate-x-1/2 top-[10%] w-[50%] h-[80%] rounded-xl border border-[var(--color-border)] shadow-2xl z-50'
      )}>
        {/* Header */}
        <div className={cn(
          'flex items-start justify-between pt-5 pb-3',
          expandedTaskFullScreen ? 'max-w-2xl mx-auto w-full px-6' : 'px-5'
        )}>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] break-words">
              {task.text}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Created on {createdDate}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <IconButton
              label="Focus timer"
              onClick={() => setShowTimer(!showTimer)}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 6v6l4 2" />
              </svg>
            </IconButton>
            <IconButton
              label={expandedTaskFullScreen ? 'Exit full screen' : 'Full screen'}
              onClick={() => setExpandedTaskFullScreen(!expandedTaskFullScreen)}
            >
              {expandedTaskFullScreen ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H3m0 0v-6m0 6l7-7M15 3h6m0 0v6m0-6l-7 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6m0 0v6m0-6l-7 7M9 21H3m0 0v-6m0 6l7-7" />
                </svg>
              )}
            </IconButton>
            <IconButton
              label="Close"
              onClick={closeAndSave}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </IconButton>
          </div>
        </div>

        {/* Divider */}
        <div className={cn(
          'border-b border-[var(--color-border)]',
          expandedTaskFullScreen ? 'max-w-2xl mx-auto w-full px-6' : 'mx-5'
        )} />

        {/* Focus Timer */}
        {showTimer && (
          <div className={cn(
            'flex justify-center',
            expandedTaskFullScreen ? 'max-w-2xl mx-auto w-full px-6' : 'px-5'
          )}>
            <FocusTimer />
          </div>
        )}

        {/* Notes / sub-tasks area + textarea input */}
        <div className={cn(
          'flex-1 overflow-y-auto py-3 flex flex-col',
          expandedTaskFullScreen ? 'max-w-2xl mx-auto w-full px-6' : 'px-5'
        )}>
          {children.map((child, i) => {
            const isTarget = editRequest && (
              (editRequest.index === -1 && i === children.length - 1) ||
              (editRequest.index === i)
            );
            return (
              <ChildItem
                key={child.id}
                item={child}
                editTrigger={isTarget ? editRequest.tick : undefined}
                onFocusPrev={() => {
                  if (i > 0) {
                    requestEditAt(i - 1);
                  } else {
                    focusTextarea();
                  }
                }}
                onFocusNext={focusTextarea}
              />
            );
          })}
          <div className="relative flex-1 min-h-[80px]">
            {isFocused && !inputText && (
              <span className="absolute top-0 left-0 text-sm text-[var(--color-text-muted)] pointer-events-none">
                Note ([] to create a task)
              </span>
            )}
            <textarea
              ref={textareaRef}
              value={inputText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '[] ' && task) {
                  addItem({ type: 'task', text: '', dayKey: task.dayKey, parentId: task.id });
                  setInputText('');
                  requestEditAt(-1);  // -1 = last child
                  return;
                }
                setInputText(val);
              }}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (pasted.includes('\n')) {
                  e.preventDefault();
                  const lines = (inputText + pasted).split('\n');
                  lines.forEach((line) => submitLine(line));
                  setInputText('');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitLine(inputText);
                  setInputText('');
                }
                if (e.key === 'Backspace' && inputText === '' && children.length > 0) {
                  e.preventDefault();
                  const lastChild = children[children.length - 1];
                  if (!lastChild.text) {
                    deleteItem(lastChild.id);
                    if (children.length > 1) {
                      requestEditAt(children.length - 2);
                    }
                  } else {
                    requestEditAt(children.length - 1);
                  }
                }
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  closeAndSave();
                }
              }}
              className={cn(
                'absolute inset-0 bg-transparent text-sm text-[var(--color-text-primary)]',
                'outline-none resize-none',
              )}
            />
          </div>
        </div>
      </div>
    </>
  );
}
