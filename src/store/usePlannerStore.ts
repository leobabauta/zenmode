import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { PlannerItem, ItemType, Recurrence } from '../types';
import { computeNextOccurrence } from '../lib/recurrence';
import { toDayKey } from '../lib/dates';

interface PlannerState {
  items: Record<string, PlannerItem>;
  theme: 'light' | 'dark';
  view: 'timeline' | 'today' | 'hashtag' | 'inbox' | 'later';
  activeHashtag: string | null;
  sidebarCollapsed: boolean;
  selectionAnchorId: string | null;
  selectionFocusId: string | null;
  expandedTaskId: string | null;
  expandedTaskFullScreen: boolean;
  showMoveModal: boolean;
  showCommandPalette: boolean;
  commandPaletteAddTask: boolean;
  showSettings: boolean;
  laterExpanded: boolean;

  addItem: (payload: { type: ItemType; text: string; dayKey: string | null; isLater?: boolean; parentId?: string }) => void;
  insertItemAfter: (afterId: string, text: string) => string;
  setExpandedTask: (id: string | null) => void;
  setExpandedTaskFullScreen: (full: boolean) => void;
  updateItem: (id: string, patch: Partial<Pick<PlannerItem, 'text' | 'completed' | 'type'>>) => void;
  deleteItem: (id: string) => void;
  moveItem: (id: string, targetDayKey: string | null, targetOrder: number) => void;
  reorderItems: (dayKey: string | null, orderedIds: string[]) => void;
  setRecurrence: (id: string, recurrence: Recurrence | null) => void;
  autoMoveIncompleteItems: () => void;
  sendToInbox: (id: string) => void;
  sendToLater: (id: string) => void;
  toggleTheme: () => void;
  setView: (view: 'timeline' | 'today' | 'hashtag' | 'inbox' | 'later') => void;
  setHashtagView: (tag: string) => void;
  toggleSidebar: () => void;
  setShowMoveModal: (show: boolean) => void;
  setShowCommandPalette: (show: boolean) => void;
  setCommandPaletteAddTask: (v: boolean) => void;
  setShowSettings: (show: boolean) => void;
  scrollToTodayRequested: number;
  requestScrollToToday: () => void;
  setLaterExpanded: (expanded: boolean) => void;
  startSelection: (id: string | null) => void;
  moveFocus: (id: string | null) => void;
  clearSelection: () => void;
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    immer((set, get) => ({
      items: {},
      theme: 'light',
      view: 'timeline' as const,
      activeHashtag: null,
      sidebarCollapsed: false,
      scrollToTodayRequested: 0,
      selectionAnchorId: null,
      selectionFocusId: null,
      expandedTaskId: null,
      expandedTaskFullScreen: false,
      showMoveModal: false,
      showCommandPalette: false,
      commandPaletteAddTask: false,
      showSettings: false,
      laterExpanded: true,

      addItem: ({ type, text, dayKey, isLater = false, parentId }) => {
        set((state) => {
          let existingItems: PlannerItem[];
          if (parentId) {
            existingItems = Object.values(state.items).filter(
              (i) => i.parentId === parentId
            );
          } else {
            existingItems = Object.values(state.items).filter(
              (i) => i.dayKey === dayKey && Boolean(i.isLater) === isLater && !i.parentId
            );
          }
          const maxOrder = existingItems.length > 0
            ? Math.max(...existingItems.map((i) => i.order))
            : -1;
          const id = nanoid();
          const now = new Date().toISOString();
          state.items[id] = {
            id,
            type,
            text,
            completed: false,
            dayKey,
            isLater,
            order: maxOrder + 1,
            createdAt: now,
            updatedAt: now,
            parentId,
          };
        });
      },

      insertItemAfter: (afterId, text) => {
        const newId = nanoid();
        set((state) => {
          const after = state.items[afterId];
          if (!after) return;
          // Shift all sibling items with order > after.order
          const siblings = Object.values(state.items).filter((i) => {
            if (after.parentId) return i.parentId === after.parentId;
            return i.dayKey === after.dayKey && Boolean(i.isLater) === Boolean(after.isLater) && !i.parentId;
          });
          for (const sib of siblings) {
            if (sib.order > after.order) sib.order += 1;
          }
          const now = new Date().toISOString();
          state.items[newId] = {
            id: newId,
            type: 'task',
            text,
            completed: false,
            dayKey: after.dayKey,
            isLater: after.isLater,
            order: after.order + 1,
            createdAt: now,
            updatedAt: now,
            parentId: after.parentId,
          };
        });
        return newId;
      },

      setExpandedTask: (id) => {
        set((state) => { state.expandedTaskId = id; });
      },

      setExpandedTaskFullScreen: (full) => {
        set((state) => { state.expandedTaskFullScreen = full; });
      },

      updateItem: (id, patch) => {
        set((state) => {
          const item = state.items[id];
          if (!item) return;
          Object.assign(item, patch, { updatedAt: new Date().toISOString() });

          // Auto-create next occurrence when completing a recurring item
          if (patch.completed === true && item.recurrence && item.dayKey) {
            const nextDayKey = computeNextOccurrence(item.dayKey, item.recurrence);
            const nextItems = Object.values(state.items).filter(
              (i) => i.dayKey === nextDayKey
            );
            const maxOrder = nextItems.length > 0
              ? Math.max(...nextItems.map((i) => i.order))
              : -1;
            const newId = nanoid();
            const now = new Date().toISOString();
            state.items[newId] = {
              id: newId,
              type: item.type,
              text: item.text,
              completed: false,
              dayKey: nextDayKey,
              order: maxOrder + 1,
              createdAt: now,
              updatedAt: now,
              recurrence: item.recurrence,
            };
          }
        });
      },

      setRecurrence: (id, recurrence) => {
        set((state) => {
          const item = state.items[id];
          if (!item) return;
          const now = new Date().toISOString();

          if (recurrence) {
            item.recurrence = recurrence;
            item.updatedAt = now;

            // Generate future occurrences
            if (item.dayKey) {
              const horizon = new Date();
              horizon.setDate(horizon.getDate() + 365);
              const horizonStr = `${horizon.getFullYear()}-${String(horizon.getMonth() + 1).padStart(2, '0')}-${String(horizon.getDate()).padStart(2, '0')}`;

              const addOccurrence = (dayKey: string) => {
                const existingItems = Object.values(state.items).filter(
                  (i) => i.dayKey === dayKey
                );
                const maxOrder = existingItems.length > 0
                  ? Math.max(...existingItems.map((i) => i.order))
                  : -1;
                const newId = nanoid();
                state.items[newId] = {
                  id: newId,
                  type: item.type,
                  text: item.text,
                  completed: false,
                  dayKey,
                  order: maxOrder + 1,
                  createdAt: now,
                  updatedAt: now,
                  recurrence,
                };
              };

              if (recurrence.type === 'weeks' && recurrence.weekdays?.length) {
                // Iterate day-by-day, generate on matching weekdays
                const weekdaySet = new Set(recurrence.weekdays);
                const start = new Date(item.dayKey + 'T00:00:00');
                const candidate = new Date(start);
                candidate.setDate(candidate.getDate() + 1);
                while (true) {
                  const dk = `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, '0')}-${String(candidate.getDate()).padStart(2, '0')}`;
                  if (dk > horizonStr) break;
                  if (weekdaySet.has(candidate.getDay())) {
                    addOccurrence(dk);
                  }
                  candidate.setDate(candidate.getDate() + 1);
                }
              } else if (recurrence.type === 'months' && recurrence.dayOfMonth) {
                // Iterate month-by-month for 12 months
                const start = new Date(item.dayKey + 'T00:00:00');
                for (let m = 1; m <= 12; m++) {
                  const nextMonth = new Date(start.getFullYear(), start.getMonth() + m, 1);
                  const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
                  const clampedDay = Math.min(recurrence.dayOfMonth, lastDay);
                  const dk = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
                  if (dk > horizonStr) break;
                  addOccurrence(dk);
                }
              } else {
                // days, weekday (legacy), or fallback
                let nextDayKey = computeNextOccurrence(item.dayKey, recurrence);
                while (nextDayKey <= horizonStr) {
                  addOccurrence(nextDayKey);
                  nextDayKey = computeNextOccurrence(nextDayKey, recurrence);
                }
              }
            }
          } else {
            // Delete all future recurring copies with the same text
            if (item.dayKey && item.recurrence) {
              const rec = item.recurrence;
              const recWeekdaysStr = rec.weekdays ? JSON.stringify([...rec.weekdays].sort()) : '';
              Object.values(state.items).forEach((other) => {
                if (
                  other.id !== id &&
                  other.text === item.text &&
                  other.dayKey &&
                  other.dayKey > item.dayKey! &&
                  !other.completed &&
                  other.recurrence &&
                  other.recurrence.type === rec.type &&
                  other.recurrence.interval === rec.interval
                ) {
                  // Match weekdays arrays or legacy weekday
                  const otherWeekdaysStr = other.recurrence.weekdays ? JSON.stringify([...other.recurrence.weekdays].sort()) : '';
                  if (
                    otherWeekdaysStr === recWeekdaysStr &&
                    other.recurrence.weekday === rec.weekday &&
                    other.recurrence.dayOfMonth === rec.dayOfMonth
                  ) {
                    delete state.items[other.id];
                  }
                }
              });
            }
            delete item.recurrence;
            item.updatedAt = now;
          }
        });
      },

      deleteItem: (id) => {
        set((state) => {
          // Also delete child items
          Object.values(state.items).forEach((item) => {
            if (item.parentId === id) delete state.items[item.id];
          });
          delete state.items[id];
        });
      },

      moveItem: (id, targetDayKey, targetOrder) => {
        set((state) => {
          if (!state.items[id]) return;
          const now = new Date().toISOString();

          // Shift items in target to make room
          Object.values(state.items).forEach((item) => {
            if (item.id !== id && item.dayKey === targetDayKey && item.order >= targetOrder) {
              item.order += 1;
            }
          });

          state.items[id].dayKey = targetDayKey;
          state.items[id].isLater = false;
          state.items[id].order = targetOrder;
          state.items[id].consecutiveMoves = 0;
          state.items[id].updatedAt = now;
        });

        // Re-normalize order in target to keep things clean
        const { reorderItems } = get();
        const targetItems = Object.values(get().items)
          .filter((i) => i.dayKey === targetDayKey)
          .sort((a, b) => a.order - b.order);
        reorderItems(targetDayKey, targetItems.map((i) => i.id));
      },

      reorderItems: (_dayKey, orderedIds) => {
        set((state) => {
          const now = new Date().toISOString();
          orderedIds.forEach((id, index) => {
            if (state.items[id]) {
              state.items[id].order = index;
              state.items[id].updatedAt = now;
            }
          });
        });
      },

      autoMoveIncompleteItems: () => {
        set((state) => {
          const todayKey = toDayKey(new Date());
          const now = new Date().toISOString();
          const pastIncomplete = Object.values(state.items).filter(
            (i) =>
              i.dayKey !== null &&
              i.dayKey < todayKey &&
              !i.completed &&
              !i.isLater &&
              !i.parentId
          );

          // Get existing today items to determine order offset
          const todayItems = Object.values(state.items).filter(
            (i) => i.dayKey === todayKey && !i.parentId
          );
          let maxOrder = todayItems.length > 0
            ? Math.max(...todayItems.map((i) => i.order))
            : -1;

          for (const item of pastIncomplete) {
            const moves = (item.consecutiveMoves ?? 0) + 1;
            if (moves >= 4) {
              // Send to Later Archive
              const laterItems = Object.values(state.items).filter(
                (i) => i.dayKey === null && i.isLater === true
              );
              const laterMax = laterItems.length > 0
                ? Math.max(...laterItems.map((i) => i.order))
                : -1;
              item.dayKey = null;
              item.isLater = true;
              item.order = laterMax + 1;
              item.consecutiveMoves = moves;
            } else {
              // Move to today
              maxOrder += 1;
              item.dayKey = todayKey;
              item.order = maxOrder;
              item.consecutiveMoves = moves;
            }
            item.updatedAt = now;
          }
        });
      },

      sendToInbox: (id) => {
        set((state) => {
          if (!state.items[id]) return;
          const inboxItems = Object.values(state.items).filter(
            (i) => i.dayKey === null && !i.isLater
          );
          const maxOrder = inboxItems.length > 0
            ? Math.max(...inboxItems.map((i) => i.order))
            : -1;
          state.items[id].dayKey = null;
          state.items[id].isLater = false;
          state.items[id].order = maxOrder + 1;
          state.items[id].updatedAt = new Date().toISOString();
        });
      },

      sendToLater: (id) => {
        set((state) => {
          if (!state.items[id]) return;
          const laterItems = Object.values(state.items).filter(
            (i) => i.dayKey === null && i.isLater === true
          );
          const maxOrder = laterItems.length > 0
            ? Math.max(...laterItems.map((i) => i.order))
            : -1;
          state.items[id].dayKey = null;
          state.items[id].isLater = true;
          state.items[id].order = maxOrder + 1;
          state.items[id].updatedAt = new Date().toISOString();
        });
      },

      toggleTheme: () => {
        set((state) => {
          state.theme = state.theme === 'light' ? 'dark' : 'light';
        });
      },

      setView: (view) => {
        set((state) => { state.view = view; state.activeHashtag = null; });
      },

      setHashtagView: (tag) => {
        set((state) => { state.view = 'hashtag'; state.activeHashtag = tag; state.expandedTaskId = null; });
      },

      toggleSidebar: () => {
        set((state) => { state.sidebarCollapsed = !state.sidebarCollapsed; });
      },

      requestScrollToToday: () => {
        set((state) => { state.scrollToTodayRequested = state.scrollToTodayRequested + 1; });
      },

      setShowMoveModal: (show) => {
        set((state) => { state.showMoveModal = show; });
      },
      setShowCommandPalette: (show) => {
        set((state) => { state.showCommandPalette = show; });
      },
      setCommandPaletteAddTask: (v) => {
        set((state) => { state.commandPaletteAddTask = v; });
      },
      setShowSettings: (show) => {
        set((state) => { state.showSettings = show; });
      },
      setLaterExpanded: (expanded) => {
        set((state) => { state.laterExpanded = expanded; });
      },
      startSelection: (id) => {
        set((state) => { state.selectionAnchorId = id; state.selectionFocusId = id; });
      },
      moveFocus: (id) => {
        set((state) => { state.selectionFocusId = id; });
      },
      clearSelection: () => {
        set((state) => { state.selectionAnchorId = null; state.selectionFocusId = null; });
      },
    })),
    {
      name: 'paso-planner-v1',
      partialize: (state) => ({ items: state.items, theme: state.theme, view: state.view, activeHashtag: state.activeHashtag, sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);

// Selectors
export function selectItemsForDay(items: Record<string, PlannerItem>, dayKey: string) {
  return Object.values(items)
    .filter((i) => i.dayKey === dayKey && !i.parentId)
    .sort((a, b) => a.order - b.order);
}

export function selectInboxItems(items: Record<string, PlannerItem>) {
  return Object.values(items)
    .filter((i) => i.dayKey === null && !i.isLater && !i.parentId)
    .sort((a, b) => a.order - b.order);
}

export function selectLaterItems(items: Record<string, PlannerItem>) {
  return Object.values(items)
    .filter((i) => i.dayKey === null && i.isLater === true && !i.parentId)
    .sort((a, b) => a.order - b.order);
}

export function selectChildItems(items: Record<string, PlannerItem>, parentId: string) {
  return Object.values(items)
    .filter((i) => i.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

export function selectItemsForHashtag(items: Record<string, PlannerItem>, hashtag: string) {
  const lower = hashtag.toLowerCase();
  return Object.values(items)
    .filter((i) => !i.parentId && i.text.toLowerCase().includes(lower))
    .sort((a, b) => (b.dayKey ?? '').localeCompare(a.dayKey ?? ''));
}
