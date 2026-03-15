import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { toDayKey, getWeekKey } from '../../lib/dates';
import { parseReminder } from '../../lib/reminderParser';
import { cn } from '../../lib/utils';

type PaletteItem =
  | { kind: 'command'; id: string; label: string; shortcut?: string; badge?: string }
  | { kind: 'nav'; id: string; label: string; icon: string; shortcut?: string }
  | { kind: 'hashtag'; id: string; tag: string }
  | { kind: 'task'; id: string; text: string };

interface Section {
  title: string;
  items: PaletteItem[];
}

const COMMAND_ITEMS: PaletteItem[] = [
  { kind: 'command', id: 'cmd-new-task', label: 'New task', shortcut: 'N' },
  { kind: 'command', id: 'cmd-delete', label: 'Delete task', shortcut: 'dd' },
  { kind: 'command', id: 'cmd-move', label: 'Move task to day', shortcut: 'M' },
  { kind: 'command', id: 'cmd-inbox', label: 'Send to Inbox', shortcut: '⇧I' },
  { kind: 'command', id: 'cmd-later', label: 'Send to Later', shortcut: '⇧E' },
  { kind: 'command', id: 'cmd-toggle-sidebar', label: 'Toggle sidebar', shortcut: 'S' },
];

const RITUAL_ITEMS: PaletteItem[] = [
  { kind: 'command', id: 'ritual-daily-planning', label: 'Daily Planning Ritual' },
  { kind: 'command', id: 'ritual-daily-review', label: 'Daily Review Ritual' },
  { kind: 'command', id: 'ritual-weekly-planning', label: 'Weekly Planning Ritual' },
  { kind: 'command', id: 'ritual-weekly-review', label: 'Weekly Review Ritual' },
];

const NAV_ITEMS: PaletteItem[] = [
  { kind: 'nav', id: 'nav-today', label: 'Today', icon: '📅', shortcut: 'T' },
  { kind: 'nav', id: 'nav-timeline', label: 'Home', icon: '🏠', shortcut: 'H' },
  { kind: 'nav', id: 'nav-inbox', label: 'Inbox', icon: '📥', shortcut: 'I' },
  { kind: 'nav', id: 'nav-later', label: 'Later', icon: '📦', shortcut: 'L' },
  { kind: 'nav', id: 'nav-archive', label: 'Archive', icon: '🗄️', shortcut: 'A' },
  { kind: 'nav', id: 'nav-stats', label: 'Stats', icon: '📊' },
  { kind: 'nav', id: 'nav-settings', label: 'Settings', icon: '⚙️' },
];

interface CommandPaletteProps {
  addTaskMode?: boolean;
  onClose: () => void;
}

export function CommandPalette({ addTaskMode = false, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [isAddTask] = useState(addTaskMode);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items = usePlannerStore((s) => s.items);
  const lastRitualDate = usePlannerStore((s) => s.lastRitualDate);
  const lastReviewRitualDate = usePlannerStore((s) => s.lastReviewRitualDate);
  const lastWeeklyPlanningDate = usePlannerStore((s) => s.lastWeeklyPlanningDate);
  const lastWeeklyReviewDate = usePlannerStore((s) => s.lastWeeklyReviewDate);

  const todayKey = toDayKey(new Date());
  const weekKey = getWeekKey(new Date());

  // Check which rituals are already completed
  const ritualDone = {
    'ritual-daily-planning': lastRitualDate === todayKey,
    'ritual-daily-review': lastReviewRitualDate === todayKey,
    'ritual-weekly-planning': lastWeeklyPlanningDate === weekKey,
    'ritual-weekly-review': lastWeeklyReviewDate === weekKey,
  };

  // Add "Done" badges to ritual items
  const ritualItemsWithBadges: PaletteItem[] = RITUAL_ITEMS.map((item) => ({
    ...item,
    badge: (item.kind === 'command' && ritualDone[item.id as keyof typeof ritualDone]) ? 'Done' : undefined,
  }));

  // Extract unique hashtags from all items
  const allHashtags = useMemo(() => {
    const tagSet = new Set<string>();
    Object.values(items).forEach((item) => {
      const matches = item.text.match(/(#[\w-]+)/g);
      if (matches) {
        matches.forEach((m) => tagSet.add(m.toLowerCase()));
      }
    });
    return Array.from(tagSet).sort();
  }, [items]);

  // Build sections based on query (only used in search mode)
  const sections = useMemo((): Section[] => {
    if (isAddTask) return [];

    const q = query.trim().toLowerCase();

    if (!q) {
      const result: Section[] = [
        { title: 'Commands', items: [...COMMAND_ITEMS] },
        { title: 'Rituals', items: ritualItemsWithBadges },
        { title: 'Navigation', items: [...NAV_ITEMS] },
      ];
      if (allHashtags.length > 0) {
        result.push({
          title: 'Labels',
          items: allHashtags.map((tag) => ({ kind: 'hashtag' as const, id: `hashtag-${tag}`, tag })),
        });
      }
      return result;
    }

    const result: Section[] = [];

    // Filter commands
    const matchedCommands = COMMAND_ITEMS.filter((c) => c.kind === 'command' && c.label.toLowerCase().includes(q));
    if (matchedCommands.length > 0) {
      result.push({ title: 'Commands', items: matchedCommands });
    }

    // Filter ritual items
    const matchedRituals = ritualItemsWithBadges.filter((r) => r.kind === 'command' && r.label.toLowerCase().includes(q));
    if (matchedRituals.length > 0) {
      result.push({ title: 'Rituals', items: matchedRituals });
    }

    // Filter nav items
    const matchedNav = NAV_ITEMS.filter((n) => n.kind === 'nav' && n.label.toLowerCase().includes(q));
    if (matchedNav.length > 0) {
      result.push({ title: 'Navigation', items: matchedNav });
    }

    // Filter hashtags
    const qWithout = q.startsWith('#') ? q.slice(1) : q;
    const matchedTags = allHashtags
      .filter((tag) => tag.includes(q) || tag.slice(1).includes(qWithout))
      .map((tag) => ({ kind: 'hashtag' as const, id: `hashtag-${tag}`, tag }));
    if (matchedTags.length > 0) {
      result.push({ title: 'Labels', items: matchedTags });
    }

    // Search tasks (exclude children, limit 10)
    const matchedTasks = Object.values(items)
      .filter((item) => !item.parentId && item.text.toLowerCase().includes(q))
      .slice(0, 10)
      .map((item) => ({ kind: 'task' as const, id: item.id, text: item.text }));
    if (matchedTasks.length > 0) {
      result.push({ title: 'Tasks', items: matchedTasks });
    }

    return result;
  }, [query, items, allHashtags, isAddTask, ritualItemsWithBadges]);

  // Flat list for keyboard indexing
  const flatItems = useMemo(
    () => sections.flatMap((s) => s.items),
    [sections],
  );

  // Reset highlight when query changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  // Auto-focus input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-highlighted="true"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const handleSelect = useCallback((item: PaletteItem) => {
    const store = usePlannerStore.getState();

    switch (item.kind) {
      case 'command':
        if (item.id === 'cmd-new-task') {
          store.setCommandPaletteAddTask(true);
          onClose();
          // Re-open in add task mode after closing
          setTimeout(() => {
            store.setShowCommandPalette(true);
          }, 0);
          return;
        }
        if (item.id === 'cmd-delete') {
          const focusedId = store.selectionFocusId;
          if (focusedId && store.items[focusedId]) {
            store.promptDeleteItem(focusedId);
          }
        }
        if (item.id === 'cmd-toggle-sidebar') {
          store.toggleSidebar();
        }
        // Ritual commands
        if (item.id === 'ritual-daily-planning') {
          if (ritualDone['ritual-daily-planning']) {
            // Already done today — restart so they can view/edit
            store.setView('ritual');
          } else {
            store.setView('ritual');
          }
        }
        if (item.id === 'ritual-daily-review') {
          if (ritualDone['ritual-daily-review']) {
            store.setView('review');
          } else {
            store.setView('review');
          }
        }
        if (item.id === 'ritual-weekly-planning') {
          if (ritualDone['ritual-weekly-planning']) {
            // Already done this week — show results page
            store.setView('weekPlan');
          } else {
            store.setView('weeklyPlanning');
          }
        }
        if (item.id === 'ritual-weekly-review') {
          if (ritualDone['ritual-weekly-review']) {
            // Already done this week — show results page
            store.setView('weekReviewPage');
          } else {
            store.setView('weeklyReview');
          }
        }
        // Other commands are contextual (need selected task) — just close
        break;
      case 'nav':
        if (item.id === 'nav-today') {
          store.setView('today');
        } else if (item.id === 'nav-timeline') {
          store.setView('timeline');
        } else if (item.id === 'nav-inbox') {
          store.setView('inbox');
        } else if (item.id === 'nav-later') {
          store.setView('later');
        } else if (item.id === 'nav-archive') {
          store.setView('archive');
        } else if (item.id === 'nav-stats') {
          store.setView('stats');
        } else if (item.id === 'nav-settings') {
          store.setShowSettings(true);
        }
        break;
      case 'hashtag':
        store.setHashtagView(item.tag);
        break;
      case 'task':
        store.setExpandedTask(item.id);
        break;
    }

    onClose();
  }, [onClose, ritualDone]);

  const handleAddTask = useCallback((toToday: boolean) => {
    const text = query.trim();
    if (!text) return;

    const store = usePlannerStore.getState();
    const reminder = parseReminder(text);

    if (reminder) {
      const reminderDate = new Date(reminder.reminderAt);
      const dayKey = toDayKey(reminderDate);
      store.addItem({ type: 'task', text: reminder.cleanText, dayKey, reminderAt: reminder.reminderAt });
      const timeStr = reminderDate.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      usePlannerStore.setState({ reminderToast: `Reminder set for ${timeStr}` });
    } else if (toToday) {
      store.addItem({ type: 'task', text, dayKey: toDayKey(new Date()) });
    } else {
      store.addItem({ type: 'task', text, dayKey: null });
    }
    setQuery('');
    onClose();
  }, [query, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (isAddTask) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAddTask(false); // Add to Inbox
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        handleAddTask(true); // Add to Today
      }
      return;
    }

    // Search mode
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[highlightIndex]) {
        handleSelect(flatItems[highlightIndex]);
      }
    }
  };

  let itemCounter = -1;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-[500px] z-50 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-[0_0_30px_rgba(234,179,8,0.2)] overflow-hidden flex flex-col max-h-[60vh]">
        {/* Search/add input */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <svg className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAddTask ? 'Add a task...' : 'Type a command...'}
            className="flex-1 text-sm bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
          />
          <kbd className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[var(--color-text-muted)] shrink-0">
            {isAddTask ? 'N' : '⌘K'}
          </kbd>
        </div>

        <div className="border-t border-[var(--color-border)]" />

        {/* Add task hint */}
        {isAddTask && (
          <div className="px-4 py-3 text-[11px] text-[var(--color-text-muted)]">
            <span className="font-medium">Enter</span> to add to Inbox · <span className="font-medium">Shift+Enter</span> to add to Today · Use <span className="font-medium">@3pm</span> or <span className="font-medium">@tomorrow 2pm</span> for reminders
          </div>
        )}

        {/* Results (search mode only) */}
        {!isAddTask && (
          <div ref={listRef} className="overflow-y-auto flex-1">
            {flatItems.length === 0 && query.trim() ? (
              <div className="px-4 py-6 text-sm text-[var(--color-text-muted)] text-center">
                No results found
              </div>
            ) : (
              sections.map((section) => (
                <div key={section.title}>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {section.title}
                  </div>
                  {section.items.map((item) => {
                    itemCounter++;
                    const idx = itemCounter;
                    const isHighlighted = idx === highlightIndex;
                    const shortcut = item.kind === 'command' || item.kind === 'nav' ? item.shortcut : undefined;
                    const badge = item.kind === 'command' ? item.badge : undefined;

                    return (
                      <button
                        key={item.kind + '-' + item.id}
                        data-highlighted={isHighlighted}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        className={cn(
                          'w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors',
                          'hover:bg-[var(--color-surface)]',
                          isHighlighted && 'bg-[var(--color-accent-tint)]',
                        )}
                      >
                        {item.kind === 'nav' && (
                          <span className="w-5 text-center">{item.icon}</span>
                        )}
                        <span className={cn(
                          'flex-1 truncate',
                          item.kind === 'nav' || item.kind === 'command' ? 'font-medium' : '',
                          isHighlighted ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]',
                        )}>
                          {item.kind === 'hashtag' ? item.tag : item.kind === 'task' ? item.text : item.label}
                        </span>
                        {badge && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 flex-shrink-0">
                            {badge}
                          </span>
                        )}
                        {shortcut && (
                          <kbd className="ml-auto text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[var(--color-text-muted)] font-mono flex-shrink-0">
                            {shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer hints */}
        {!isAddTask && (
          <div className="border-t border-[var(--color-border)] px-4 py-2 flex items-center gap-4 text-[10px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <kbd className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5">esc</kbd>
              Close
            </span>
          </div>
        )}
      </div>
    </>
  );
}
