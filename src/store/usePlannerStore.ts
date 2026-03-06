import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { PlannerItem, ItemType, Recurrence, CustomList, WeeklyPlan, WeeklyReview } from '../types';
import { computeNextOccurrence } from '../lib/recurrence';
import { toDayKey, getWeekKey } from '../lib/dates';

export const LABEL_PALETTE = [
  '#D20000', '#F65353', '#EA7D70', '#FD5E00', '#F58553',
  '#F59A23', '#FCB55C', '#CE8540', '#EEB649', '#F7CE15',
  '#BCC07B', '#91CA57', '#669E63', '#007355', '#007D75',
  '#75B39C', '#7CCED2', '#1EB0E6', '#03468F', '#7D8BE0',
  '#9A81B0', '#7851A5', '#B19F9A', '#8E715B', '#4F3F3E',
];

interface PlannerState {
  items: Record<string, PlannerItem>;
  theme: 'light' | 'dark';
  view: 'timeline' | 'today' | 'hashtag' | 'inbox' | 'later' | 'ritual' | 'review' | 'list' | 'stats' | 'weeklyPlanning' | 'weeklyReview' | 'weekPlan' | 'weekReviewPage' | 'archive';
  activeHashtag: string | null;
  customLists: CustomList[];
  activeListId: string | null;
  lastRitualDate: string | null;
  planningRitualEnabled: boolean;
  planningRitualHour: number;
  reviewRitualEnabled: boolean;
  reviewRitualHour: number;
  lastReviewRitualDate: string | null;
  showRitualPrompt: boolean;
  showRitual: boolean;
  showReviewRitualPrompt: boolean;
  planningRitualSnoozedUntil: number | null;
  reviewRitualSnoozedUntil: number | null;
  // Weekly rituals
  weeklyPlans: Record<string, WeeklyPlan>;
  weeklyReviews: Record<string, WeeklyReview>;
  weeklyPlanningEnabled: boolean;
  weeklyPlanningDay: number;       // 0=Sun..6=Sat, default 1=Mon
  weeklyPlanningHour: number;
  weeklyReviewEnabled: boolean;
  weeklyReviewDay: number;         // 0=Sun..6=Sat, default 5=Fri
  weeklyReviewHour: number;
  weeklyReviewMinute: number;      // 0 or 30, for half-hour support
  lastWeeklyPlanningDate: string | null;  // weekKey of last completed planning
  lastWeeklyReviewDate: string | null;    // weekKey of last completed review
  showWeeklyPlanningPrompt: boolean;
  showWeeklyReviewPrompt: boolean;
  weeklyPlanningSnoozedUntil: number | null;
  weeklyReviewSnoozedUntil: number | null;
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
  labelColors: Record<string, string>;
  deleteConfirmItemId: string | null;
  navOrder: string[];
  labelOrder: string[];

  getLabelColor: (tag: string) => string;
  setLabelColor: (tag: string, color: string) => void;
  addItem: (payload: { type: ItemType; text: string; dayKey: string | null; isLater?: boolean; parentId?: string; isPriority?: boolean; isMediumPriority?: boolean; isPractice?: boolean; listId?: string }) => void;
  insertItemAfter: (afterId: string, text: string) => string;
  setExpandedTask: (id: string | null) => void;
  setExpandedTaskFullScreen: (full: boolean) => void;
  updateItem: (id: string, patch: Partial<Pick<PlannerItem, 'text' | 'completed' | 'type' | 'isPriority' | 'isMediumPriority' | 'isPractice'>>) => void;
  addTimerSession: (taskId: string, session: { startedAt: string; duration: number }) => void;
  deleteItem: (id: string) => void;
  promptDeleteItem: (id: string) => void;
  confirmDeleteSingle: (id: string) => void;
  confirmDeleteAllFuture: (id: string) => void;
  cancelDelete: () => void;
  moveItem: (id: string, targetDayKey: string | null, targetOrder: number) => void;
  reorderItems: (dayKey: string | null, orderedIds: string[]) => void;
  setRecurrence: (id: string, recurrence: Recurrence | null) => void;
  autoMoveIncompleteItems: () => void;
  sendToInbox: (id: string) => void;
  sendToLater: (id: string) => void;
  toggleTheme: () => void;
  setView: (view: PlannerState['view']) => void;
  setShowRitualPrompt: (show: boolean) => void;
  setShowRitual: (show: boolean) => void;
  completeRitual: () => void;
  setShowReviewRitualPrompt: (show: boolean) => void;
  completeReviewRitual: () => void;
  snoozePlanningRitual: () => void;
  snoozeReviewRitual: () => void;
  setPlanningRitualEnabled: (v: boolean) => void;
  setPlanningRitualHour: (h: number) => void;
  setReviewRitualEnabled: (v: boolean) => void;
  setReviewRitualHour: (h: number) => void;
  // Weekly ritual actions
  setShowWeeklyPlanningPrompt: (show: boolean) => void;
  setShowWeeklyReviewPrompt: (show: boolean) => void;
  snoozeWeeklyPlanning: () => void;
  snoozeWeeklyReview: () => void;
  saveWeeklyPlan: (plan: WeeklyPlan) => void;
  completeWeeklyPlanning: () => void;
  saveWeeklyReview: (review: WeeklyReview) => void;
  completeWeeklyReview: () => void;
  setWeeklyPlanningEnabled: (v: boolean) => void;
  setWeeklyPlanningDay: (d: number) => void;
  setWeeklyPlanningHour: (h: number) => void;
  setWeeklyReviewEnabled: (v: boolean) => void;
  setWeeklyReviewDay: (d: number) => void;
  setWeeklyReviewHour: (h: number) => void;
  setWeeklyReviewMinute: (m: number) => void;
  setHashtagView: (tag: string) => void;
  addCustomList: (name: string) => void;
  renameCustomList: (id: string, name: string) => void;
  deleteCustomList: (id: string) => void;
  setActiveListId: (id: string | null) => void;
  sendToList: (itemId: string, listId: string) => void;
  toggleSidebar: () => void;
  setShowMoveModal: (show: boolean) => void;
  setShowCommandPalette: (show: boolean) => void;
  setCommandPaletteAddTask: (v: boolean) => void;
  setShowSettings: (show: boolean) => void;
  scrollToTodayRequested: number;
  requestScrollToToday: () => void;
  setLaterExpanded: (expanded: boolean) => void;
  sortCompletedToTop: (context: { dayKey?: string; isLater?: boolean; listId?: string; hashtag?: string }) => void;
  archiveCompleted: (context: { isLater?: boolean; listId?: string; hashtag?: string }) => void;
  unarchiveItem: (id: string) => void;
  reorderNav: (orderedIds: string[]) => void;
  reorderLabels: (orderedTags: string[]) => void;
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
      customLists: [],
      activeListId: null,
      lastRitualDate: null,
      planningRitualEnabled: true,
      planningRitualHour: 6,
      reviewRitualEnabled: true,
      reviewRitualHour: 17,
      lastReviewRitualDate: null,
      showRitualPrompt: false,
      showRitual: false,
      showReviewRitualPrompt: false,
      planningRitualSnoozedUntil: null,
      reviewRitualSnoozedUntil: null,
      // Weekly rituals
      weeklyPlans: {},
      weeklyReviews: {},
      weeklyPlanningEnabled: false,
      weeklyPlanningDay: 1,       // Monday
      weeklyPlanningHour: 8,
      weeklyReviewEnabled: false,
      weeklyReviewDay: 5,         // Friday
      weeklyReviewHour: 17,
      weeklyReviewMinute: 30,
      lastWeeklyPlanningDate: null,
      lastWeeklyReviewDate: null,
      showWeeklyPlanningPrompt: false,
      showWeeklyReviewPrompt: false,
      weeklyPlanningSnoozedUntil: null,
      weeklyReviewSnoozedUntil: null,
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
      labelColors: {},
      deleteConfirmItemId: null,
      navOrder: ['timeline', 'inbox', 'today', 'later', 'weekPlan', 'weekReviewPage', 'archive'],
      labelOrder: [],

      getLabelColor: (tag: string) => {
        const key = tag.toLowerCase();
        const existing = get().labelColors[key];
        if (existing) return existing;
        const color = LABEL_PALETTE[Math.floor(Math.random() * LABEL_PALETTE.length)];
        set((state) => { state.labelColors[key] = color; });
        return color;
      },

      setLabelColor: (tag, color) => {
        set((state) => { state.labelColors[tag.toLowerCase()] = color; });
      },

      addItem: ({ type, text, dayKey, isLater = false, parentId, isPriority, isMediumPriority, isPractice, listId }) => {
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
            isPriority,
            isMediumPriority,
            isPractice,
            listId,
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
            type: after.type,
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

          // Track completion timestamp
          if (patch.completed === true && !item.completedAt) {
            item.completedAt = new Date().toISOString();
          } else if (patch.completed === false) {
            delete item.completedAt;
          }

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

      addTimerSession: (taskId, session) => {
        set((state) => {
          const item = state.items[taskId];
          if (!item) return;
          if (!item.timerSessions) item.timerSessions = [];
          item.timerSessions.push(session);
          item.updatedAt = new Date().toISOString();
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

      promptDeleteItem: (id) => {
        const item = get().items[id];
        if (!item) return;
        if (item.recurrence) {
          set((state) => { state.deleteConfirmItemId = id; });
        } else {
          get().deleteItem(id);
        }
      },

      confirmDeleteSingle: (id) => {
        get().deleteItem(id);
        set((state) => { state.deleteConfirmItemId = null; });
      },

      confirmDeleteAllFuture: (id) => {
        set((state) => {
          const item = state.items[id];
          if (item && item.recurrence && item.dayKey) {
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
          // Delete the item itself and its children
          if (state.items[id]) {
            Object.values(state.items).forEach((child) => {
              if (child.parentId === id) delete state.items[child.id];
            });
            delete state.items[id];
          }
          state.deleteConfirmItemId = null;
        });
      },

      cancelDelete: () => {
        set((state) => { state.deleteConfirmItemId = null; });
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

          // Clear stale priority/practice flags from past days (keep on completed items for stats)
          Object.values(state.items).forEach((item) => {
            if (item.dayKey && item.dayKey !== todayKey && !item.completed && (item.isPriority || item.isMediumPriority || item.isPractice)) {
              delete item.isPriority;
              delete item.isMediumPriority;
              delete item.isPractice;
            }
          });

          const pastIncomplete = Object.values(state.items).filter(
            (i) =>
              i.dayKey !== null &&
              i.dayKey < todayKey &&
              !i.completed &&
              !i.isLater &&
              !i.parentId &&
              i.type !== 'note'
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

      setShowRitualPrompt: (show) => {
        set((state) => { state.showRitualPrompt = show; });
      },

      setShowRitual: (show) => {
        set((state) => { state.showRitual = show; });
      },

      completeRitual: () => {
        set((state) => {
          state.lastRitualDate = toDayKey(new Date());
          state.showRitual = false;
          state.showRitualPrompt = false;
          state.planningRitualSnoozedUntil = null;
          state.view = 'today';
        });
      },

      setShowReviewRitualPrompt: (show) => {
        set((state) => { state.showReviewRitualPrompt = show; });
      },

      completeReviewRitual: () => {
        set((state) => {
          state.lastReviewRitualDate = toDayKey(new Date());
          state.showReviewRitualPrompt = false;
          state.reviewRitualSnoozedUntil = null;
          state.view = 'today';
        });
      },

      snoozePlanningRitual: () => {
        set((state) => {
          state.showRitualPrompt = false;
          state.planningRitualSnoozedUntil = Date.now() + 60 * 60 * 1000;
        });
      },

      snoozeReviewRitual: () => {
        set((state) => {
          state.showReviewRitualPrompt = false;
          state.reviewRitualSnoozedUntil = Date.now() + 60 * 60 * 1000;
        });
      },

      setPlanningRitualEnabled: (v) => {
        set((state) => { state.planningRitualEnabled = v; });
      },
      setPlanningRitualHour: (h) => {
        set((state) => { state.planningRitualHour = h; });
      },
      setReviewRitualEnabled: (v) => {
        set((state) => { state.reviewRitualEnabled = v; });
      },
      setReviewRitualHour: (h) => {
        set((state) => { state.reviewRitualHour = h; });
      },

      // Weekly ritual actions
      setShowWeeklyPlanningPrompt: (show) => {
        set((state) => { state.showWeeklyPlanningPrompt = show; });
      },
      setShowWeeklyReviewPrompt: (show) => {
        set((state) => { state.showWeeklyReviewPrompt = show; });
      },
      snoozeWeeklyPlanning: () => {
        set((state) => {
          state.showWeeklyPlanningPrompt = false;
          state.weeklyPlanningSnoozedUntil = Date.now() + 60 * 60 * 1000;
        });
      },
      snoozeWeeklyReview: () => {
        set((state) => {
          state.showWeeklyReviewPrompt = false;
          state.weeklyReviewSnoozedUntil = Date.now() + 60 * 60 * 1000;
        });
      },
      saveWeeklyPlan: (plan) => {
        set((state) => {
          state.weeklyPlans[plan.weekKey] = plan;
        });
      },
      completeWeeklyPlanning: () => {
        set((state) => {
          state.lastWeeklyPlanningDate = getWeekKey(new Date());
          state.showWeeklyPlanningPrompt = false;
          state.weeklyPlanningSnoozedUntil = null;
          state.view = 'weekPlan';
        });
      },
      saveWeeklyReview: (review) => {
        set((state) => {
          state.weeklyReviews[review.weekKey] = review;
        });
      },
      completeWeeklyReview: () => {
        set((state) => {
          state.lastWeeklyReviewDate = getWeekKey(new Date());
          state.showWeeklyReviewPrompt = false;
          state.weeklyReviewSnoozedUntil = null;
          state.view = 'weekReviewPage';
        });
      },
      setWeeklyPlanningEnabled: (v) => {
        set((state) => { state.weeklyPlanningEnabled = v; });
      },
      setWeeklyPlanningDay: (d) => {
        set((state) => { state.weeklyPlanningDay = d; });
      },
      setWeeklyPlanningHour: (h) => {
        set((state) => { state.weeklyPlanningHour = h; });
      },
      setWeeklyReviewEnabled: (v) => {
        set((state) => { state.weeklyReviewEnabled = v; });
      },
      setWeeklyReviewDay: (d) => {
        set((state) => { state.weeklyReviewDay = d; });
      },
      setWeeklyReviewHour: (h) => {
        set((state) => { state.weeklyReviewHour = h; });
      },
      setWeeklyReviewMinute: (m) => {
        set((state) => { state.weeklyReviewMinute = m; });
      },

      setHashtagView: (tag) => {
        set((state) => { state.view = 'hashtag'; state.activeHashtag = tag; state.expandedTaskId = null; });
      },

      addCustomList: (name) => {
        set((state) => {
          const id = nanoid();
          const maxOrder = state.customLists.length > 0
            ? Math.max(...state.customLists.map((l) => l.order))
            : -1;
          state.customLists.push({ id, name, order: maxOrder + 1 });
        });
      },

      renameCustomList: (id, name) => {
        set((state) => {
          const list = state.customLists.find((l) => l.id === id);
          if (list) list.name = name;
        });
      },

      deleteCustomList: (id) => {
        set((state) => {
          state.customLists = state.customLists.filter((l) => l.id !== id);
          // Clear listId from items that were in this list
          Object.values(state.items).forEach((item) => {
            if (item.listId === id) delete item.listId;
          });
          if (state.activeListId === id) {
            state.activeListId = null;
            state.view = 'timeline';
          }
        });
      },

      setActiveListId: (id) => {
        set((state) => { state.activeListId = id; });
      },

      sendToList: (itemId, listId) => {
        set((state) => {
          const item = state.items[itemId];
          if (!item) return;
          item.listId = listId;
          item.dayKey = null;
          item.isLater = false;
          item.updatedAt = new Date().toISOString();
        });
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
      sortCompletedToTop: (context) => {
        const state = get();
        let itemList: PlannerItem[];
        if (context.hashtag) {
          itemList = selectItemsForHashtag(state.items, context.hashtag);
        } else if (context.listId) {
          itemList = selectCustomListItems(state.items, context.listId);
        } else if (context.isLater) {
          itemList = selectLaterItems(state.items);
        } else if (context.dayKey) {
          itemList = selectItemsForDay(state.items, context.dayKey);
        } else {
          itemList = selectInboxItems(state.items);
        }
        const completed = itemList.filter((i) => i.completed);
        const incomplete = itemList.filter((i) => !i.completed);
        const orderedIds = [...completed, ...incomplete].map((i) => i.id);
        state.reorderItems(null, orderedIds);
      },

      archiveCompleted: (context) => {
        set((state) => {
          let itemList: PlannerItem[];
          if (context.hashtag) {
            const lower = context.hashtag.toLowerCase();
            itemList = Object.values(state.items).filter(
              (i) => !i.parentId && !i.isArchived && i.text.toLowerCase().includes(lower)
            );
          } else if (context.listId) {
            itemList = Object.values(state.items).filter(
              (i) => i.listId === context.listId && !i.parentId && !i.isArchived
            );
          } else if (context.isLater) {
            itemList = Object.values(state.items).filter(
              (i) => i.dayKey === null && i.isLater === true && !i.parentId && !i.isArchived
            );
          } else {
            itemList = Object.values(state.items).filter(
              (i) => i.dayKey === null && !i.isLater && !i.parentId && !i.isArchived
            );
          }
          const now = new Date().toISOString();
          for (const item of itemList) {
            if (item.completed) {
              state.items[item.id].isArchived = true;
              state.items[item.id].dayKey = null;
              state.items[item.id].updatedAt = now;
            }
          }
        });
      },

      unarchiveItem: (id) => {
        set((state) => {
          const item = state.items[id];
          if (!item) return;
          const inboxItems = Object.values(state.items).filter(
            (i) => i.dayKey === null && !i.isLater && !i.isArchived && !i.parentId
          );
          const maxOrder = inboxItems.length > 0
            ? Math.max(...inboxItems.map((i) => i.order))
            : -1;
          item.isArchived = false;
          item.dayKey = null;
          item.isLater = false;
          item.listId = undefined;
          item.order = maxOrder + 1;
          item.updatedAt = new Date().toISOString();
        });
      },

      reorderNav: (orderedIds) => {
        set((state) => { state.navOrder = orderedIds; });
      },
      reorderLabels: (orderedTags) => {
        set((state) => { state.labelOrder = orderedTags; });
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
      partialize: (state) => ({ items: state.items, theme: state.theme, view: state.view, activeHashtag: state.activeHashtag, sidebarCollapsed: state.sidebarCollapsed, labelColors: state.labelColors, lastRitualDate: state.lastRitualDate, planningRitualEnabled: state.planningRitualEnabled, planningRitualHour: state.planningRitualHour, reviewRitualEnabled: state.reviewRitualEnabled, reviewRitualHour: state.reviewRitualHour, lastReviewRitualDate: state.lastReviewRitualDate, customLists: state.customLists, activeListId: state.activeListId, weeklyPlans: state.weeklyPlans, weeklyReviews: state.weeklyReviews, weeklyPlanningEnabled: state.weeklyPlanningEnabled, weeklyPlanningDay: state.weeklyPlanningDay, weeklyPlanningHour: state.weeklyPlanningHour, weeklyReviewEnabled: state.weeklyReviewEnabled, weeklyReviewDay: state.weeklyReviewDay, weeklyReviewHour: state.weeklyReviewHour, weeklyReviewMinute: state.weeklyReviewMinute, lastWeeklyPlanningDate: state.lastWeeklyPlanningDate, lastWeeklyReviewDate: state.lastWeeklyReviewDate, navOrder: state.navOrder, labelOrder: state.labelOrder }),
    }
  )
);

// --- Sync subscriber: detect item changes/deletes and preference changes ---
import { markChanged, markDeleted, pushPreferences } from '../lib/sync';

const PREF_KEYS = ['theme', 'view', 'activeHashtag', 'sidebarCollapsed', 'labelColors', 'lastRitualDate', 'planningRitualEnabled', 'planningRitualHour', 'reviewRitualEnabled', 'reviewRitualHour', 'lastReviewRitualDate', 'customLists', 'activeListId', 'weeklyPlans', 'weeklyReviews', 'weeklyPlanningEnabled', 'weeklyPlanningDay', 'weeklyPlanningHour', 'weeklyReviewEnabled', 'weeklyReviewDay', 'weeklyReviewHour', 'weeklyReviewMinute', 'lastWeeklyPlanningDate', 'lastWeeklyReviewDate', 'navOrder', 'labelOrder'] as const;

usePlannerStore.subscribe((state, prevState) => {
  // Detect changed items
  const changedIds: string[] = [];
  for (const id of Object.keys(state.items)) {
    if (state.items[id] !== prevState.items[id]) {
      changedIds.push(id);
    }
  }
  if (changedIds.length > 0) markChanged(changedIds);

  // Detect deleted items
  const deletedIds: string[] = [];
  for (const id of Object.keys(prevState.items)) {
    if (!(id in state.items)) {
      deletedIds.push(id);
    }
  }
  if (deletedIds.length > 0) markDeleted(deletedIds);

  // Detect preference changes
  for (const key of PREF_KEYS) {
    if (state[key] !== prevState[key]) {
      pushPreferences();
      break;
    }
  }
});

// Selectors
export function selectItemsForDay(items: Record<string, PlannerItem>, dayKey: string) {
  return Object.values(items)
    .filter((i) => i.dayKey === dayKey && !i.parentId && !i.isArchived)
    .sort((a, b) => a.order - b.order);
}

export function selectInboxItems(items: Record<string, PlannerItem>) {
  return Object.values(items)
    .filter((i) => i.dayKey === null && !i.isLater && !i.parentId && !i.isArchived)
    .sort((a, b) => a.order - b.order);
}

export function selectLaterItems(items: Record<string, PlannerItem>) {
  return Object.values(items)
    .filter((i) => i.dayKey === null && i.isLater === true && !i.parentId && !i.isArchived)
    .sort((a, b) => a.order - b.order);
}

export function selectChildItems(items: Record<string, PlannerItem>, parentId: string) {
  return Object.values(items)
    .filter((i) => i.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

export function selectCustomListItems(items: Record<string, PlannerItem>, listId: string) {
  return Object.values(items)
    .filter((i) => i.listId === listId && !i.parentId && !i.isArchived)
    .sort((a, b) => a.order - b.order);
}

export function selectItemsForHashtag(items: Record<string, PlannerItem>, hashtag: string) {
  const lower = hashtag.toLowerCase();
  return Object.values(items)
    .filter((i) => !i.parentId && !i.isArchived && i.text.toLowerCase().includes(lower))
    .sort((a, b) => (b.dayKey ?? '').localeCompare(a.dayKey ?? ''));
}

export function selectArchivedItems(items: Record<string, PlannerItem>) {
  return Object.values(items)
    .filter((i) => i.isArchived && !i.parentId)
    .sort((a, b) => a.order - b.order);
}
