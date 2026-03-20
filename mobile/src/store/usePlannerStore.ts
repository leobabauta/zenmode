import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nanoid } from 'nanoid/non-secure';
import type { PlannerItem, ItemType, Recurrence, CustomList } from '../../../shared/types';
import { toDayKey } from '../../../shared/lib/dates';
import { markChanged, markDeleted, pushPreferences } from '../../../shared/lib/sync';

interface PlannerState {
  items: Record<string, PlannerItem>;
  theme: 'light' | 'dark';
  customLists: CustomList[];
  activeListId: string | null;
  labelColors: Record<string, string>;
  // Ritual prefs
  planningRitualEnabled: boolean;
  planningRitualHour: number;
  reviewRitualEnabled: boolean;
  reviewRitualHour: number;
  lastRitualDate: string | null;
  lastReviewRitualDate: string | null;
  planningRitualSnoozedUntil: number | null;
  reviewRitualSnoozedUntil: number | null;
  // Weekly
  weeklyPlanningEnabled: boolean;
  weeklyPlanningDay: number;
  weeklyPlanningHour: number;
  weeklyReviewEnabled: boolean;
  weeklyReviewDay: number;
  weeklyReviewHour: number;
  weeklyReviewMinute: number;
  lastWeeklyPlanningDate: string | null;
  lastWeeklyReviewDate: string | null;
  // Misc prefs (for sync compat)
  view: string;
  activeHashtag: string | null;
  sidebarCollapsed: boolean;
  // Onboarding
  hasCompletedOnboarding: boolean;
  // Accent color theme
  accentColor: string | null;

  // Actions
  addItem: (payload: { type: ItemType; text: string; dayKey: string | null; isLater?: boolean; listId?: string; isPriority?: boolean; isMediumPriority?: boolean; reminderAt?: string }) => void;
  updateItem: (id: string, patch: Partial<Pick<PlannerItem, 'text' | 'completed' | 'type' | 'isPriority' | 'isMediumPriority' | 'notes'>>) => void;
  deleteItem: (id: string) => void;
  moveItem: (id: string, dayKey: string | null, isLater?: boolean) => void;
  reorderItems: (orderedIds: string[]) => void;
  setRecurrence: (id: string, recurrence: Recurrence | null) => void;
  toggleTheme: () => void;
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    immer((set, get) => ({
      items: {},
      theme: 'light',
      customLists: [],
      activeListId: null,
      labelColors: {},
      planningRitualEnabled: true,
      planningRitualHour: 6,
      reviewRitualEnabled: true,
      reviewRitualHour: 17,
      lastRitualDate: null,
      lastReviewRitualDate: null,
      planningRitualSnoozedUntil: null,
      reviewRitualSnoozedUntil: null,
      weeklyPlanningEnabled: false,
      weeklyPlanningDay: 1,
      weeklyPlanningHour: 9,
      weeklyReviewEnabled: false,
      weeklyReviewDay: 5,
      weeklyReviewHour: 17,
      weeklyReviewMinute: 0,
      lastWeeklyPlanningDate: null,
      lastWeeklyReviewDate: null,
      view: 'today',
      activeHashtag: null,
      sidebarCollapsed: false,
      hasCompletedOnboarding: false,
      accentColor: null,

      addItem: (payload) => {
        const id = nanoid();
        const now = new Date().toISOString();
        const items = get().items;
        const sameContext = Object.values(items).filter(
          (i) => i.dayKey === payload.dayKey && !i.parentId
        );
        const maxOrder = sameContext.length > 0
          ? Math.max(...sameContext.map((i) => i.order))
          : -1;

        set((state) => {
          state.items[id] = {
            id,
            type: payload.type,
            text: payload.text,
            completed: false,
            dayKey: payload.dayKey,
            isLater: payload.isLater,
            order: maxOrder + 1,
            createdAt: now,
            updatedAt: now,
            listId: payload.listId,
            isPriority: payload.isPriority,
            isMediumPriority: payload.isMediumPriority,
            reminderAt: payload.reminderAt,
          };
        });
      },

      updateItem: (id, patch) => {
        set((state) => {
          const item = state.items[id];
          if (!item) return;
          Object.assign(item, patch);
          item.updatedAt = new Date().toISOString();
          if (patch.completed !== undefined) {
            item.completedAt = patch.completed ? new Date().toISOString() : undefined;

            // Auto-sort: move completed items above incomplete (matches web app)
            const siblings = Object.values(state.items).filter((i) => {
              if (i.parentId || i.isArchived) return false;
              if (item.dayKey) return i.dayKey === item.dayKey;
              if (item.isLater) return i.dayKey === null && i.isLater === true;
              if (item.listId) return i.listId === item.listId && !i.isArchived;
              return i.dayKey === null && !i.isLater;
            }).sort((a, b) => a.order - b.order);

            const isReview = (i: PlannerItem) =>
              i.type === 'note' && (i.text.includes('#dailyreview') || i.text.includes('#weeklyreview'));
            const reviews = siblings.filter((i) => isReview(i));
            const completed = siblings.filter((i) => i.completed && !isReview(i));
            const incomplete = siblings.filter((i) => !i.completed && !isReview(i));
            const sorted = [...completed, ...incomplete, ...reviews];
            sorted.forEach((s, i) => {
              state.items[s.id].order = i;
            });
          }
        });
      },

      deleteItem: (id) => {
        set((state) => {
          delete state.items[id];
        });
      },

      moveItem: (id, dayKey, isLater) => {
        set((state) => {
          const item = state.items[id];
          if (!item) return;
          item.dayKey = dayKey;
          item.isLater = isLater;
          item.updatedAt = new Date().toISOString();
        });
      },

      reorderItems: (orderedIds) => {
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

      setRecurrence: (id, recurrence) => {
        set((state) => {
          const item = state.items[id];
          if (!item) return;
          const now = new Date().toISOString();

          if (recurrence) {
            item.recurrence = recurrence;
            item.updatedAt = now;

            if (item.dayKey) {
              const horizon = new Date();
              horizon.setDate(horizon.getDate() + 365);
              const horizonStr = `${horizon.getFullYear()}-${String(horizon.getMonth() + 1).padStart(2, '0')}-${String(horizon.getDate()).padStart(2, '0')}`;

              // Compute reminder time-of-day from source item
              let reminderHour: number | null = null;
              let reminderMinute: number | null = null;
              if (item.reminderAt) {
                const rd = new Date(item.reminderAt);
                reminderHour = rd.getHours();
                reminderMinute = rd.getMinutes();
              }

              const addOccurrence = (dayKey: string) => {
                const duplicate = Object.values(state.items).find(
                  (i) => i.dayKey === dayKey && i.text === item.text && i.recurrence &&
                    i.recurrence.type === recurrence.type && i.recurrence.interval === recurrence.interval
                );
                if (duplicate) return;

                const existingItems = Object.values(state.items).filter((i) => i.dayKey === dayKey);
                const maxOrder = existingItems.length > 0 ? Math.max(...existingItems.map((i) => i.order)) : -1;
                const newId = nanoid();

                let futureReminderAt: string | undefined;
                if (reminderHour !== null && reminderMinute !== null) {
                  const parts = dayKey.split('-');
                  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), reminderHour, reminderMinute, 0, 0);
                  futureReminderAt = d.toISOString();
                }

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
                  reminderAt: futureReminderAt,
                };
              };

              if (recurrence.type === 'weeks' && recurrence.weekdays?.length) {
                const weekdaySet = new Set(recurrence.weekdays);
                const start = new Date(item.dayKey + 'T00:00:00');
                const candidate = new Date(start);
                candidate.setDate(candidate.getDate() + 1);
                while (true) {
                  const dk = `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, '0')}-${String(candidate.getDate()).padStart(2, '0')}`;
                  if (dk > horizonStr) break;
                  if (weekdaySet.has(candidate.getDay())) addOccurrence(dk);
                  candidate.setDate(candidate.getDate() + 1);
                }
              } else if (recurrence.type === 'months' && recurrence.dayOfMonth) {
                // Iterate by interval months up to 24 months
                const intervalMonths = recurrence.interval || 1;
                const start = new Date(item.dayKey + 'T00:00:00');
                for (let m = intervalMonths; m <= 24; m += intervalMonths) {
                  const nextMonth = new Date(start.getFullYear(), start.getMonth() + m, 1);
                  const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
                  const clampedDay = Math.min(recurrence.dayOfMonth, lastDay);
                  const dk = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
                  if (dk > horizonStr) break;
                  addOccurrence(dk);
                }
              } else {
                // days or fallback: simple interval
                const start = new Date(item.dayKey + 'T00:00:00');
                const interval = recurrence.interval || 1;
                const candidate = new Date(start);
                candidate.setDate(candidate.getDate() + interval);
                while (true) {
                  const dk = `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, '0')}-${String(candidate.getDate()).padStart(2, '0')}`;
                  if (dk > horizonStr) break;
                  addOccurrence(dk);
                  candidate.setDate(candidate.getDate() + interval);
                }
              }
            }
          } else {
            // Remove recurrence and delete future copies
            if (item.dayKey && item.recurrence) {
              const rec = item.recurrence;
              Object.values(state.items).forEach((other) => {
                if (other.id !== id && other.text === item.text && other.dayKey && other.dayKey > item.dayKey! &&
                    !other.completed && other.recurrence && other.recurrence.type === rec.type && other.recurrence.interval === rec.interval) {
                  delete state.items[other.id];
                }
              });
            }
            delete item.recurrence;
            item.updatedAt = now;
          }
        });
      },

      toggleTheme: () => {
        set((state) => {
          state.theme = state.theme === 'light' ? 'dark' : 'light';
        });
      },
    })),
    {
      name: 'zenmode-mobile-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
        theme: state.theme,
        customLists: state.customLists,
        activeListId: state.activeListId,
        labelColors: state.labelColors,
        planningRitualEnabled: state.planningRitualEnabled,
        planningRitualHour: state.planningRitualHour,
        reviewRitualEnabled: state.reviewRitualEnabled,
        reviewRitualHour: state.reviewRitualHour,
        lastRitualDate: state.lastRitualDate,
        lastReviewRitualDate: state.lastReviewRitualDate,
        view: state.view,
        activeHashtag: state.activeHashtag,
        sidebarCollapsed: state.sidebarCollapsed,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        accentColor: state.accentColor,
      }),
    }
  )
);

// --- Sync subscriber ---
usePlannerStore.subscribe((state, prevState) => {
  const changedIds: string[] = [];
  for (const id of Object.keys(state.items)) {
    if (state.items[id] !== prevState.items[id]) {
      changedIds.push(id);
    }
  }
  if (changedIds.length > 0) markChanged(changedIds);

  const deletedIds: string[] = [];
  for (const id of Object.keys(prevState.items)) {
    if (!(id in state.items)) {
      deletedIds.push(id);
    }
  }
  if (deletedIds.length > 0) markDeleted(deletedIds);

  // Check pref changes
  const prefKeys = ['theme', 'accentColor', 'labelColors', 'customLists', 'activeListId',
    'lastRitualDate', 'planningRitualEnabled', 'planningRitualHour',
    'reviewRitualEnabled', 'reviewRitualHour', 'lastReviewRitualDate'] as const;
  for (const key of prefKeys) {
    if ((state as any)[key] !== (prevState as any)[key]) {
      pushPreferences();
      break;
    }
  }
});

// Selectors
export function isReminderPending(item: PlannerItem): boolean {
  return !!item.reminderAt && new Date(item.reminderAt) > new Date();
}

export function selectItemsForDay(items: Record<string, PlannerItem>, dayKey: string) {
  return Object.values(items)
    .filter((i) => i.dayKey === dayKey && !i.parentId && !i.isArchived && !isReminderPending(i))
    .sort((a, b) => a.order - b.order);
}

export function selectPendingRemindersForDay(items: Record<string, PlannerItem>, dayKey: string) {
  const now = new Date();
  return Object.values(items)
    .filter((i) => i.dayKey === dayKey && !i.parentId && !i.isArchived && i.reminderAt && new Date(i.reminderAt) > now)
    .sort((a, b) => new Date(a.reminderAt!).getTime() - new Date(b.reminderAt!).getTime());
}

export function selectInboxItems(items: Record<string, PlannerItem>) {
  return Object.values(items)
    .filter((i) => i.dayKey === null && !i.isLater && !i.parentId && !i.isArchived && !i.listId)
    .sort((a, b) => a.order - b.order);
}

export function selectLaterItems(items: Record<string, PlannerItem>) {
  return Object.values(items)
    .filter((i) => i.dayKey === null && i.isLater === true && !i.parentId && !i.isArchived)
    .sort((a, b) => a.order - b.order);
}
