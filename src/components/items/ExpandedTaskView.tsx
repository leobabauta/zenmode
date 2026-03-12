import { useState, useRef, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlannerStore, selectChildItems } from '../../store/usePlannerStore';
import { Checkbox } from '../ui/Checkbox';
import { IconButton } from '../ui/IconButton';
import { HashtagText } from '../ui/HashtagText';
import { FocusTimer } from '../ui/FocusTimer';
import { cn } from '../../lib/utils';
import { describeRecurrence } from '../../lib/recurrence';
import { SimpleMarkdown } from '../ui/SimpleMarkdown';
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
  const { expandedTaskId, items, setExpandedTask, addItem, deleteItem, updateItem, expandedTaskFullScreen, setExpandedTaskFullScreen, addTimerSession } = usePlannerStore(useShallow((s) => ({
    expandedTaskId: s.expandedTaskId,
    items: s.items,
    setExpandedTask: s.setExpandedTask,
    addItem: s.addItem,
    deleteItem: s.deleteItem,
    updateItem: s.updateItem,
    expandedTaskFullScreen: s.expandedTaskFullScreen,
    setExpandedTaskFullScreen: s.setExpandedTaskFullScreen,
    addTimerSession: s.addTimerSession,
  })));

  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const timerStartRef = useRef<string>(new Date().toISOString());
  // editRequest: { index, tick } — index is the child to edit (-1 = new last child), tick always increments
  const [editRequest, setEditRequest] = useState<{ index: number; tick: number } | null>(null);
  const tickRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const task = expandedTaskId ? items[expandedTaskId] : null;
  const children = expandedTaskId ? selectChildItems(items, expandedTaskId) : [];

  // Sync notes text when task changes
  useEffect(() => {
    setNotesText(task?.notes || '');
    setIsEditingNotes(false);
  }, [expandedTaskId]);

  const focusTextarea = useCallback(() => {
    // Small delay to let React finish re-rendering after item deletion
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const submitLine = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !task) return;
    addItem({ type: 'task', text: trimmed, dayKey: task.dayKey, parentId: task.id });
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

      {/* Modal / Task Focus view */}
      <div
        className={cn(
          expandedTaskFullScreen
            ? 'flex-1 w-full h-full bg-[var(--color-surface)] flex items-start justify-center'
            : ''
        )}
        onClick={expandedTaskFullScreen ? (e) => { if (e.target === e.currentTarget) closeAndSave(); } : undefined}
      >
      <div className={cn(
        'bg-[var(--color-bg)] flex flex-col overflow-hidden rounded-xl relative',
        expandedTaskFullScreen
          ? 'w-[40%] h-[80%] mt-[5%] border-2 border-[var(--color-border)] shadow-[0_0_20px_rgba(234,179,8,0.15)]'
          : 'fixed left-1/2 -translate-x-1/2 top-[10%] w-[50%] h-[80%] border border-[var(--color-border)] shadow-2xl z-50'
      )}>
        {/* Header */}
        <div className={cn(
          'flex items-start justify-between pt-5 pb-3',
          expandedTaskFullScreen ? 'max-w-2xl mx-auto w-full px-6' : 'px-5'
        )}>
          <div className="flex-1 min-w-0 flex items-start gap-2.5">
            <div className="mt-1 flex-shrink-0">
              <Checkbox
                checked={task.completed}
                onChange={(checked) => updateItem(task.id, { completed: checked })}
              />
            </div>
            <div className="flex-1 min-w-0">
            <h2 className={cn(
              'text-lg font-semibold break-words',
              task.completed ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'
            )}>
              {task.text}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Created on {createdDate}
            </p>
            {task.recurrence && (
              <p className="text-xs text-[var(--color-accent)] mt-0.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.49 9A9 9 0 005.64 5.64L4 4m16 16l-1.64-1.64A9 9 0 013.51 15" />
                </svg>
                {describeRecurrence(task.recurrence)}
              </p>
            )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <button
              onClick={() => setShowTimer(!showTimer)}
              className={cn(
                'text-xs px-4 py-1.5 rounded-full transition-colors',
                showTimer
                  ? 'bg-violet-500/20 text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.3)] hover:bg-violet-500/30'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] shadow-[0_0_8px_rgba(139,92,246,0.15)] hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]'
              )}
            >
              Focus Timer
            </button>
            {!expandedTaskFullScreen && (
              <IconButton
                label="Task Focus mode"
                onClick={() => setExpandedTaskFullScreen(true)}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6m0 0v6m0-6l-7 7M9 21H3m0 0v-6m0 6l7-7" />
                </svg>
              </IconButton>
            )}
            <IconButton
              label="Close"
              title="Close (Esc)"
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
            <FocusTimer
              onSessionComplete={(duration) => {
                if (expandedTaskId) {
                  addTimerSession(expandedTaskId, { startedAt: timerStartRef.current, duration });
                }
                timerStartRef.current = new Date().toISOString();
              }}
              onComplete={() => {
                if (expandedTaskId) {
                  updateItem(expandedTaskId, { completed: true });
                  setShowConfetti(true);
                  setTimeout(() => setShowConfetti(false), 3000);
                }
              }}
            />
          </div>
        )}

        {/* Notes field */}
        <div className={cn(
          'py-3',
          expandedTaskFullScreen ? 'max-w-2xl mx-auto w-full px-6' : 'px-5'
        )}>
          {isEditingNotes ? (
            <textarea
              ref={notesRef}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              onBlur={() => {
                const trimmed = notesText.trim();
                if (trimmed !== (task?.notes || '')) {
                  updateItem(expandedTaskId!, { notes: trimmed || undefined });
                }
                setIsEditingNotes(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setNotesText(task?.notes || '');
                  setIsEditingNotes(false);
                }
              }}
              rows={Math.max(notesText.split('\n').length, 3)}
              placeholder="Add notes..."
              className="w-full bg-transparent text-sm text-[var(--color-text-secondary)] outline-none resize-none"
              autoFocus
            />
          ) : (
            <div
              onClick={() => setIsEditingNotes(true)}
              className="cursor-text min-h-[20px]"
            >
              {task?.notes ? (
                <SimpleMarkdown text={task.notes} />
              ) : (
                <p className="text-sm text-[var(--color-text-muted)] italic">Add notes...</p>
              )}
            </div>
          )}
        </div>

        {/* Sub-tasks area + textarea input */}
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
                Add a sub-task...
              </span>
            )}
            <textarea
              ref={textareaRef}
              value={inputText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => setInputText(e.target.value)}
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

        {/* Confetti overlay inside the modal */}
        {showConfetti && (
          <>
            <style>{`
              @keyframes modal-confetti-fall {
                0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
                100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
              }
            `}</style>
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
              {Array.from({ length: 50 }, (_, i) => {
                const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F7DC6F', '#BB8FCE'];
                const color = colors[Math.floor(Math.random() * colors.length)];
                const x = Math.random() * 100;
                const size = 4 + Math.random() * 6;
                const delay = Math.random() * 1;
                const duration = 2 + Math.random() * 2;
                const isCircle = Math.random() > 0.5;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${x}%`,
                      top: 0,
                      width: size,
                      height: size,
                      backgroundColor: color,
                      borderRadius: isCircle ? '50%' : '2px',
                      animation: `modal-confetti-fall ${duration}s ease-in ${delay}s forwards`,
                    }}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
      </div>
    </>
  );
}
