import { useState, useRef, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { addDays, subDays, nextSaturday, nextMonday, format, startOfDay, parse, isValid } from 'date-fns';
import { usePlannerStore } from '../../store/usePlannerStore';
import { toDayKey } from '../../lib/dates';
import { cn } from '../../lib/utils';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

interface Preset {
  label: string;
  date: Date;
  dayKey: string;
}

function buildPresets(): Preset[] {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const laterThisWeek = addDays(today, 3);
  const weekend = nextSaturday(today);
  const monday = nextMonday(today);

  return [
    { label: 'Tomorrow', date: tomorrow, dayKey: toDayKey(tomorrow) },
    { label: 'Later this week', date: laterThisWeek, dayKey: toDayKey(laterThisWeek) },
    { label: 'This weekend', date: weekend, dayKey: toDayKey(weekend) },
    { label: 'Next week', date: monday, dayKey: toDayKey(monday) },
  ];
}

function parseNaturalDate(input: string): Date | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  const today = startOfDay(new Date());

  if ('tomorrow'.startsWith(text) && text.length >= 2) return addDays(today, 1);
  if ('yesterday'.startsWith(text) && text.length >= 1) return subDays(today, 1);
  if ('today'.startsWith(text) && text.length >= 2) return today;

  // Relative past: "N days ago", "2 days ago"
  const daysAgoMatch = text.match(/^(\d+)\s*days?\s*ago$/);
  if (daysAgoMatch) return subDays(today, parseInt(daysAgoMatch[1], 10));

  // "last <day>" → most recent past occurrence (e.g. "last wed", "last tuesday")
  const lastDayMatch = text.match(/^last\s+(.+)$/);
  if (lastDayMatch) {
    const dayText = lastDayMatch[1].trim();
    const dayIdx = DAY_NAMES.findIndex((name) => name.startsWith(dayText));
    if (dayIdx >= 0) {
      const currentDay = today.getDay();
      const daysBack = (currentDay - dayIdx + 7) % 7 || 7;
      return subDays(today, daysBack);
    }
    // "last week <day>" e.g. "last week tues"
    const lastWeekMatch = dayText.match(/^week\s+(.+)$/);
    if (lastWeekMatch) {
      const weekDayText = lastWeekMatch[1].trim();
      const weekDayIdx = DAY_NAMES.findIndex((name) => name.startsWith(weekDayText));
      if (weekDayIdx >= 0) {
        const currentDay = today.getDay();
        const daysBack = (currentDay - weekDayIdx + 7) % 7 + 7;
        return subDays(today, daysBack);
      }
    }
  }

  // Day names → next occurrence (prefix match: "w" → wednesday, "th" → thursday)
  const dayMatch = DAY_NAMES.findIndex((name) => name.startsWith(text));
  if (dayMatch >= 0) {
    const currentDay = today.getDay();
    const daysAhead = (dayMatch - currentDay + 7) % 7 || 7;
    return addDays(today, daysAhead);
  }

  // Try formats with explicit year first (e.g. "3/15/2025", "march 15 2025")
  for (const fmt of ['M/d/yyyy', 'M-d-yyyy', 'MMMM d yyyy', 'MMM d yyyy', 'MMMM d, yyyy', 'MMM d, yyyy']) {
    const withYear = parse(text, fmt, new Date());
    if (isValid(withYear)) return startOfDay(withYear);
  }

  // Try "month day" format (e.g. "march 15", "mar 15") — defaults to nearest future
  const monthDay = parse(text, 'MMMM d', new Date());
  if (isValid(monthDay)) {
    const result = startOfDay(monthDay);
    if (result < today) result.setFullYear(result.getFullYear() + 1);
    return result;
  }
  const monthDayShort = parse(text, 'MMM d', new Date());
  if (isValid(monthDayShort)) {
    const result = startOfDay(monthDayShort);
    if (result < today) result.setFullYear(result.getFullYear() + 1);
    return result;
  }

  // Try "M/d" format (e.g. "3/15") — defaults to nearest future
  const slashDate = parse(text, 'M/d', new Date());
  if (isValid(slashDate)) {
    const result = startOfDay(slashDate);
    if (result < today) result.setFullYear(result.getFullYear() + 1);
    return result;
  }

  // Try "M-d" format — defaults to nearest future
  const dashDate = parse(text, 'M-d', new Date());
  if (isValid(dashDate)) {
    const result = startOfDay(dashDate);
    if (result < today) result.setFullYear(result.getFullYear() + 1);
    return result;
  }

  return null;
}

function getSelectedItemIds(
  items: Record<string, { id: string; dayKey: string | null; isLater?: boolean; order: number; parentId?: string }>,
  anchorId: string | null,
  focusId: string | null,
): string[] {
  if (!focusId) return [];

  const focusItem = items[focusId];
  if (!focusItem) return [focusId];

  // Build ordered list of items in the same container
  const containerItems = Object.values(items)
    .filter((i) => {
      if (i.parentId) return false;
      if (focusItem.dayKey !== null) return i.dayKey === focusItem.dayKey && Boolean(i.isLater) === Boolean(focusItem.isLater);
      return i.dayKey === null && Boolean(i.isLater) === Boolean(focusItem.isLater);
    })
    .sort((a, b) => a.order - b.order);

  const ids = containerItems.map((i) => i.id);
  const focusIdx = ids.indexOf(focusId);
  const anchorIdx = anchorId ? ids.indexOf(anchorId) : -1;

  if (focusIdx < 0) return [focusId];

  const lo = anchorIdx >= 0 ? Math.min(anchorIdx, focusIdx) : focusIdx;
  const hi = anchorIdx >= 0 ? Math.max(anchorIdx, focusIdx) : focusIdx;
  return ids.slice(lo, hi + 1);
}

export function MoveModal() {
  const { items, showMoveModal, setShowMoveModal, moveItem, sendToInbox, sendToLater, sendToList, selectionAnchorId, selectionFocusId, clearSelection, customLists } =
    usePlannerStore(useShallow((s) => ({
      items: s.items,
      showMoveModal: s.showMoveModal,
      setShowMoveModal: s.setShowMoveModal,
      moveItem: s.moveItem,
      sendToInbox: s.sendToInbox,
      sendToLater: s.sendToLater,
      sendToList: s.sendToList,
      selectionAnchorId: s.selectionAnchorId,
      selectionFocusId: s.selectionFocusId,
      clearSelection: s.clearSelection,
      customLists: s.customLists,
    })));

  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const presets = useMemo(() => buildPresets(), []);

  useEffect(() => {
    if (showMoveModal) {
      setInputValue('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [showMoveModal]);

  if (!showMoveModal) return null;

  const parsedDate = parseNaturalDate(inputValue);
  const inputLower = inputValue.trim().toLowerCase();
  const matchingPresetIdx = inputLower
    ? presets.findIndex((p) => p.label.toLowerCase().startsWith(inputLower))
    : -1;
  const matchInbox = inputLower ? 'inbox'.startsWith(inputLower) : false;
  const matchArchive = inputLower ? 'archive'.startsWith(inputLower) : false;

  const handleMove = (targetDayKey: string) => {
    const selectedIds = getSelectedItemIds(items, selectionAnchorId, selectionFocusId);
    for (const id of selectedIds) {
      const targetItems = Object.values(items).filter((i) => i.dayKey === targetDayKey && !i.parentId);
      const maxOrder = targetItems.length > 0 ? Math.max(...targetItems.map((i) => i.order)) + 1 : 0;
      moveItem(id, targetDayKey, maxOrder);
    }
    clearSelection();
    setShowMoveModal(false);
  };

  const handleMoveToInbox = () => {
    const selectedIds = getSelectedItemIds(items, selectionAnchorId, selectionFocusId);
    for (const id of selectedIds) sendToInbox(id);
    clearSelection();
    setShowMoveModal(false);
  };

  const handleMoveToArchive = () => {
    const selectedIds = getSelectedItemIds(items, selectionAnchorId, selectionFocusId);
    for (const id of selectedIds) sendToLater(id);
    clearSelection();
    setShowMoveModal(false);
  };

  const handleMoveToList = (listId: string) => {
    const selectedIds = getSelectedItemIds(items, selectionAnchorId, selectionFocusId);
    for (const id of selectedIds) sendToList(id, listId);
    clearSelection();
    setShowMoveModal(false);
  };

  const handleSubmit = () => {
    if (matchInbox) { handleMoveToInbox(); return; }
    if (matchArchive) { handleMoveToArchive(); return; }
    if (matchingPresetIdx >= 0) {
      handleMove(presets[matchingPresetIdx].dayKey);
      return;
    }
    if (parsedDate) {
      handleMove(toDayKey(parsedDate));
      return;
    }
  };

  const close = () => {
    setShowMoveModal(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={close} />

      {/* Modal */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-[360px] z-50 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Move to</h3>
        </div>

        {/* Input */}
        <div className="px-4 pb-3">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
              if (e.key === 'Escape') { e.preventDefault(); close(); }
            }}
            placeholder="e.g. monday, yesterday, 3/15, last wed, 2 days ago"
            className="w-full px-3 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]/30"
          />
          {inputValue.trim() && (() => {
            let hint: string | null = null;
            if (matchInbox) hint = 'Move to Inbox';
            else if (matchArchive) hint = 'Move to Archive (Later)';
            else if (matchingPresetIdx >= 0) hint = `Move to ${presets[matchingPresetIdx].label} — ${format(presets[matchingPresetIdx].date, 'EEE, MMM d')}`;
            else if (parsedDate) hint = `Move to ${format(parsedDate, 'EEEE, MMM d, yyyy')}`;
            return hint ? (
              <p className="text-xs text-[var(--color-text-muted)] mt-1 px-1">
                {hint} — press Enter
              </p>
            ) : null;
          })()}
        </div>

        {/* Presets */}
        <div className="border-t border-[var(--color-border)]">
          {presets.map((preset, idx) => {
            const isHighlighted = matchingPresetIdx === idx;
            return (
              <button
                key={preset.label}
                onClick={() => handleMove(preset.dayKey)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                  'hover:bg-[var(--color-surface)]',
                  isHighlighted && 'bg-[var(--color-accent-tint)]',
                )}
              >
                <span className={cn(
                  'font-medium',
                  isHighlighted ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]',
                )}>
                  {preset.label}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {format(preset.date, 'EEE, MMM d')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Inbox & Archive */}
        <div className="border-t border-[var(--color-border)]">
          <button
            onClick={handleMoveToInbox}
            className={cn(
              'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
              'hover:bg-[var(--color-surface)]',
              matchInbox && 'bg-[var(--color-accent-tint)]',
            )}
          >
            <span className={cn(
              'font-medium',
              matchInbox ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]',
            )}>Inbox</span>
          </button>
          <button
            onClick={handleMoveToArchive}
            className={cn(
              'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
              'hover:bg-[var(--color-surface)]',
              matchArchive && 'bg-[var(--color-accent-tint)]',
            )}
          >
            <span className={cn(
              'font-medium',
              matchArchive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]',
            )}>Archive (Later)</span>
          </button>
        </div>

        {/* Custom Lists */}
        {customLists.length > 0 && (
          <div className="border-t border-[var(--color-border)]">
            {[...customLists].sort((a, b) => a.order - b.order).map((list) => (
              <button
                key={list.id}
                onClick={() => handleMoveToList(list.id)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                  'hover:bg-[var(--color-surface)]',
                )}
              >
                <span className="font-medium text-[var(--color-text-primary)]">
                  {list.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
