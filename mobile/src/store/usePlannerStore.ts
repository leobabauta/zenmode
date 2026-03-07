import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nanoid } from 'nanoid/non-secure';
import type { PlannerItem, ItemType, CustomList } from '../../../shared/types';
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

  // Actions
  addItem: (payload: { type: ItemType; text: string; dayKey: string | null; isLater?: boolean; listId?: string; isPriority?: boolean; isMediumPriority?: boolean; isPractice?: boolean }) => void;
  updateItem: (id: string, patch: Partial<Pick<PlannerItem, 'text' | 'completed' | 'type' | 'isPriority' | 'isMediumPriority' | 'isPractice'>>) => void;
  deleteItem: (id: string) => void;
  moveItem: (id: string, dayKey: string | null, isLater?: boolean) => void;
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
            isPractice: payload.isPractice,
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
  const prefKeys = ['theme', 'labelColors', 'customLists', 'activeListId',
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
export function selectItemsForDay(items: Record<string, PlannerItem>, dayKey: string) {
  return Object.values(items)
    .filter((i) => i.dayKey === dayKey && !i.parentId && !i.isArchived)
    .sort((a, b) => a.order - b.order);
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
