import { supabase } from './supabase';
import { usePlannerStore } from '../store/usePlannerStore';
import type { PlannerItem } from '../types';

// Track IDs confirmed to exist on remote (seen during pull or successfully pushed).
// Local-only items NOT in this set are new/unpushed and must never be auto-deleted.
const knownRemoteIds = new Set<string>();

// --- Row <-> Item transforms ---

interface ItemRow {
  id: string;
  user_id: string;
  type: string;
  text: string;
  completed: boolean;
  day_key: string | null;
  is_later: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  recurrence: unknown;
  parent_id: string | null;
  consecutive_moves: number;
  is_priority: boolean;
  is_medium_priority: boolean;
  is_practice: boolean;
  list_id: string | null;
  completed_at: string | null;
  timer_sessions: unknown;
  is_archived: boolean;
}

export function itemToRow(item: PlannerItem, userId: string): ItemRow {
  return {
    id: item.id,
    user_id: userId,
    type: item.type,
    text: item.text,
    completed: item.completed,
    day_key: item.dayKey,
    is_later: item.isLater ?? false,
    order: item.order,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    recurrence: item.recurrence ?? null,
    parent_id: item.parentId ?? null,
    consecutive_moves: item.consecutiveMoves ?? 0,
    is_priority: item.isPriority ?? false,
    is_medium_priority: item.isMediumPriority ?? false,
    is_practice: item.isPractice ?? false,
    list_id: item.listId ?? null,
    completed_at: item.completedAt ?? null,
    timer_sessions: item.timerSessions ?? null,
    is_archived: item.isArchived ?? false,
  };
}

export function rowToItem(row: ItemRow): PlannerItem {
  return {
    id: row.id,
    type: row.type as PlannerItem['type'],
    text: row.text,
    completed: row.completed,
    dayKey: row.day_key,
    isLater: row.is_later || undefined,
    order: row.order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    recurrence: row.recurrence as PlannerItem['recurrence'],
    parentId: row.parent_id ?? undefined,
    consecutiveMoves: row.consecutive_moves || undefined,
    isPriority: row.is_priority || undefined,
    isMediumPriority: row.is_medium_priority || undefined,
    isPractice: row.is_practice || undefined,
    listId: row.list_id ?? undefined,
    completedAt: row.completed_at ?? undefined,
    timerSessions: (row.timer_sessions as PlannerItem['timerSessions']) ?? undefined,
    isArchived: row.is_archived || undefined,
  };
}

// --- Pull from Supabase ---

let pullInProgress = false;

export async function pullFromSupabase(): Promise<void> {
  if (!supabase) return;
  if (pullInProgress) return; // Prevent concurrent pulls
  pullInProgress = true;

  try {
    // Flush any pending local changes FIRST so remote has our latest data.
    // This prevents the pull from seeing stale remote state and overwriting
    // changes the user just made.
    await flushChanged();
    await flushDeleted();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rows, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('pullFromSupabase error:', error);
      return;
    }

    const remoteItems = (rows as ItemRow[]).map(rowToItem);

    // Re-read local items AFTER the network call completes.
    // This ensures we merge against the freshest local state, not a stale
    // snapshot from before the fetch (which would overwrite any changes
    // the user made during the network round-trip).
    const localItems = usePlannerStore.getState().items;
    const merged: Record<string, PlannerItem> = { ...localItems };
    const localNewer: PlannerItem[] = [];

    // Items with pending local changes should never be overwritten by remote
    const pendingLocalIds = new Set(changedIds);

    for (const remote of remoteItems) {
      const local = localItems[remote.id];
      if (!local) {
        // Remote-only: take it
        merged[remote.id] = remote;
      } else if (pendingLocalIds.has(remote.id)) {
        // Item was modified locally during the pull — always keep local
        localNewer.push(local);
      } else if (new Date(remote.updatedAt) > new Date(local.updatedAt)) {
        // Remote is newer
        merged[remote.id] = remote;
      } else if (new Date(local.updatedAt) > new Date(remote.updatedAt)) {
        // Local is newer — push back later
        localNewer.push(local);
      }
      // If equal timestamps, keep local (already in merged)
    }

    // Record all remote IDs so we know what exists on the server.
    const remoteIds = new Set(remoteItems.map((r) => r.id));
    for (const id of remoteIds) knownRemoteIds.add(id);

    // Handle local items that don't exist remotely.
    for (const id of Object.keys(localItems)) {
      if (!remoteIds.has(id)) {
        if (pendingLocalIds.has(id)) {
          // Item was just created/modified locally — keep it
          localNewer.push(localItems[id]);
        } else if (knownRemoteIds.has(id)) {
          // Was on remote before but now gone — deleted on another device
          delete merged[id];
          knownRemoteIds.delete(id);
        } else {
          // Never seen on remote — new local item, keep and push
          localNewer.push(localItems[id]);
        }
      }
    }

    // Apply merged items to store
    usePlannerStore.setState({ items: merged });

    // Push local-newer items to Supabase
    if (localNewer.length > 0) {
      const rows = localNewer.map((item) => itemToRow(item, user.id));
      const { error: upsertError } = await supabase
        .from('items')
        .upsert(rows, { onConflict: 'id' });
      if (upsertError) {
        console.error('push local-newer error:', upsertError);
      } else {
        for (const item of localNewer) knownRemoteIds.add(item.id);
      }
    }
  } finally {
    pullInProgress = false;
  }
}

// --- Debounced push for changed items ---

let changedIds = new Set<string>();
let changeTimer: ReturnType<typeof setTimeout> | null = null;

export function markChanged(ids: string[]): void {
  if (!supabase) return;
  for (const id of ids) changedIds.add(id);
  if (changeTimer) clearTimeout(changeTimer);
  changeTimer = setTimeout(flushChanged, 500);
}

async function flushChanged(): Promise<void> {
  if (!supabase || changedIds.size === 0) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const ids = [...changedIds];
  changedIds = new Set();
  changeTimer = null;

  const items = usePlannerStore.getState().items;
  const rows = ids
    .filter((id) => items[id])
    .map((id) => itemToRow(items[id], user.id));

  if (rows.length > 0) {
    const { error } = await supabase.from('items').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('pushChanged error:', error);
      // Re-queue failed IDs for retry
      for (const id of ids) changedIds.add(id);
    } else {
      // Mark as confirmed on remote so pull won't delete them
      for (const id of ids) knownRemoteIds.add(id);
    }
  }
}

export function flushChangedNow(): void {
  if (changeTimer) {
    clearTimeout(changeTimer);
    changeTimer = null;
  }
  flushChanged();
}

export function flushDeletedNow(): void {
  if (deleteTimer) {
    clearTimeout(deleteTimer);
    deleteTimer = null;
  }
  flushDeleted();
}

// --- Debounced push for deleted items ---

let deletedIds = new Set<string>();
let deleteTimer: ReturnType<typeof setTimeout> | null = null;

export function markDeleted(ids: string[]): void {
  if (!supabase) return;
  for (const id of ids) deletedIds.add(id);
  if (deleteTimer) clearTimeout(deleteTimer);
  deleteTimer = setTimeout(flushDeleted, 500);
}

async function flushDeleted(): Promise<void> {
  if (!supabase || deletedIds.size === 0) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const ids = [...deletedIds];
  deletedIds = new Set();
  deleteTimer = null;

  const { error } = await supabase.from('items').delete().in('id', ids);
  if (error) console.error('pushDeleted error:', error);
}

// --- Preferences sync ---

interface PrefsRow {
  user_id: string;
  theme: string;
  view: string;
  active_hashtag: string | null;
  sidebar_collapsed: boolean;
  label_colors: Record<string, string>;
  last_ritual_date: string | null;
  planning_ritual_enabled: boolean;
  planning_ritual_hour: number;
  review_ritual_enabled: boolean;
  review_ritual_hour: number;
  last_review_ritual_date: string | null;
  custom_lists: unknown[];
  active_list_id: string | null;
  updated_at: string;
}

export async function pullPreferences(): Promise<void> {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('pullPreferences error:', error);
    return;
  }

  if (data) {
    const row = data as PrefsRow;
    const local = usePlannerStore.getState();
    // For ritual dates, keep whichever is more recent (local or remote) to avoid
    // stale Supabase values re-triggering already-completed rituals on reload.
    const bestRitualDate = [local.lastRitualDate, row.last_ritual_date]
      .filter(Boolean).sort().pop() ?? null;
    const bestReviewDate = [local.lastReviewRitualDate, row.last_review_ritual_date]
      .filter(Boolean).sort().pop() ?? null;

    // Merge custom lists: union of local and remote by id
    const remoteLists = (row.custom_lists as ReturnType<typeof usePlannerStore.getState>['customLists']) ?? [];
    const localLists = local.customLists ?? [];
    const listById = new Map(localLists.map((l) => [l.id, l]));
    for (const rl of remoteLists) {
      if (!listById.has(rl.id)) listById.set(rl.id, rl);
    }
    const mergedLists = [...listById.values()].sort((a, b) => a.order - b.order);

    // Don't overwrite transient UI state (view, sidebarCollapsed, activeHashtag, activeListId)
    // — these are session-local and already persisted via zustand local storage.
    usePlannerStore.setState({
      theme: row.theme as 'light' | 'dark',
      labelColors: row.label_colors,
      lastRitualDate: bestRitualDate,
      planningRitualEnabled: row.planning_ritual_enabled ?? true,
      planningRitualHour: row.planning_ritual_hour ?? 6,
      reviewRitualEnabled: row.review_ritual_enabled ?? true,
      reviewRitualHour: row.review_ritual_hour ?? 17,
      lastReviewRitualDate: bestReviewDate,
      customLists: mergedLists,
    });
  }
}

let prefsTimer: ReturnType<typeof setTimeout> | null = null;

export function pushPreferences(): void {
  if (!supabase) return;
  if (prefsTimer) clearTimeout(prefsTimer);
  prefsTimer = setTimeout(flushPreferences, 300);
}

export function flushPreferencesNow(): void {
  if (prefsTimer) {
    clearTimeout(prefsTimer);
    prefsTimer = null;
  }
  flushPreferences();
}

async function flushPreferences(): Promise<void> {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  prefsTimer = null;
  const s = usePlannerStore.getState();
  const row: PrefsRow = {
    user_id: user.id,
    theme: s.theme,
    view: s.view,
    active_hashtag: s.activeHashtag,
    sidebar_collapsed: s.sidebarCollapsed,
    label_colors: s.labelColors,
    last_ritual_date: s.lastRitualDate,
    planning_ritual_enabled: s.planningRitualEnabled,
    planning_ritual_hour: s.planningRitualHour,
    review_ritual_enabled: s.reviewRitualEnabled,
    review_ritual_hour: s.reviewRitualHour,
    last_review_ritual_date: s.lastReviewRitualDate,
    custom_lists: s.customLists,
    active_list_id: s.activeListId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('user_preferences')
    .upsert(row, { onConflict: 'user_id' });
  if (error) console.error('pushPreferences error:', error);
}
