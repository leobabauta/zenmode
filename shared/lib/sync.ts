import { getSupabase } from './supabase';
import type { PlannerItem, CustomList } from '../types';

// Track IDs confirmed to exist on remote (seen during pull or successfully pushed).
// Local-only items NOT in this set are new/unpushed and must never be auto-deleted.
const knownRemoteIds = new Set<string>();

// --- Store accessor ---
// The platform (web/mobile) must register its store accessor at startup.
let _getItems: () => Record<string, PlannerItem> = () => ({});
let _setItems: (items: Record<string, PlannerItem>) => void = () => {};
let _getPrefs: () => any = () => ({});
let _setPrefs: (prefs: any) => void = () => {};

export function registerStoreAccessors(accessors: {
  getItems: () => Record<string, PlannerItem>;
  setItems: (items: Record<string, PlannerItem>) => void;
  getPrefs: () => any;
  setPrefs: (prefs: any) => void;
}) {
  _getItems = accessors.getItems;
  _setItems = accessors.setItems;
  _getPrefs = accessors.getPrefs;
  _setPrefs = accessors.setPrefs;
}

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
  notes: string | null;
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
    is_practice: false,
    list_id: item.listId ?? null,
    completed_at: item.completedAt ?? null,
    timer_sessions: item.timerSessions ?? null,
    is_archived: item.isArchived ?? false,
    notes: item.notes ?? null,
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
    listId: row.list_id ?? undefined,
    completedAt: row.completed_at ?? undefined,
    timerSessions: (row.timer_sessions as PlannerItem['timerSessions']) ?? undefined,
    isArchived: row.is_archived || undefined,
    notes: row.notes ?? undefined,
  };
}

// --- Pull from Supabase ---

let pullInProgress = false;

export async function pullFromSupabase(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  if (pullInProgress) return;
  pullInProgress = true;

  try {
    // Flush any pending local changes FIRST so remote has our latest
    await flushChanged();
    await flushDeleted();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rows, error } = await supabase
      .from('items')
      .select('id, user_id, type, text, completed, day_key, is_later, order, created_at, updated_at, recurrence, parent_id, consecutive_moves, is_priority, is_medium_priority, is_practice, list_id, completed_at, timer_sessions, is_archived, notes')
      .eq('user_id', user.id);

    if (error) {
      console.error('pullFromSupabase error:', error, JSON.stringify(error));
      return;
    }
    const remoteItems = (rows as ItemRow[]).map(rowToItem);

    // Re-read local items AFTER the network call to get the freshest state.
    // This prevents overwriting changes the user made during the fetch.
    const localItems = _getItems();
    const merged: Record<string, PlannerItem> = { ...localItems };
    const localNewer: PlannerItem[] = [];

    // Track which local items were modified during the pull (have pending changes)
    const pendingLocalIds = new Set(changedIds);

    for (const remote of remoteItems) {
      const local = localItems[remote.id];
      if (!local) {
        merged[remote.id] = remote;
      } else if (pendingLocalIds.has(remote.id)) {
        // Item was modified locally during the pull — keep local version
        localNewer.push(local);
      } else if (new Date(remote.updatedAt) > new Date(local.updatedAt)) {
        merged[remote.id] = remote;
      } else if (new Date(local.updatedAt) > new Date(remote.updatedAt)) {
        localNewer.push(local);
      }
    }

    const remoteIds = new Set(remoteItems.map((r) => r.id));
    for (const id of remoteIds) knownRemoteIds.add(id);

    for (const id of Object.keys(localItems)) {
      if (!remoteIds.has(id)) {
        if (pendingLocalIds.has(id)) {
          // Item was just created/modified locally — keep it
          localNewer.push(localItems[id]);
        } else if (knownRemoteIds.has(id)) {
          delete merged[id];
          knownRemoteIds.delete(id);
        } else {
          localNewer.push(localItems[id]);
        }
      }
    }

    _setItems(merged);

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
  const supabase = getSupabase();
  if (!supabase) return;
  for (const id of ids) changedIds.add(id);
  if (changeTimer) clearTimeout(changeTimer);
  changeTimer = setTimeout(flushChanged, 500);
}

async function flushChanged(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || changedIds.size === 0) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const ids = [...changedIds];
  changedIds = new Set();
  changeTimer = null;

  const items = _getItems();
  const rows = ids
    .filter((id) => items[id])
    .map((id) => itemToRow(items[id], user.id));

  if (rows.length > 0) {
    const { error } = await supabase.from('items').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('pushChanged error:', error);
      for (const id of ids) changedIds.add(id);
    } else {
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

// --- Debounced push for deleted items ---

let deletedIds = new Set<string>();
let deleteTimer: ReturnType<typeof setTimeout> | null = null;

export function markDeleted(ids: string[]): void {
  const supabase = getSupabase();
  if (!supabase) return;
  for (const id of ids) deletedIds.add(id);
  if (deleteTimer) clearTimeout(deleteTimer);
  deleteTimer = setTimeout(flushDeleted, 500);
}

async function flushDeleted(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || deletedIds.size === 0) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const ids = [...deletedIds];
  deletedIds = new Set();
  deleteTimer = null;

  const { error } = await supabase.from('items').delete().in('id', ids);
  if (error) console.error('pushDeleted error:', error);
}

export function flushDeletedNow(): void {
  if (deleteTimer) {
    clearTimeout(deleteTimer);
    deleteTimer = null;
  }
  flushDeleted();
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
  const supabase = getSupabase();
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
    const local = _getPrefs();
    const bestRitualDate = [local.lastRitualDate, row.last_ritual_date]
      .filter(Boolean).sort().pop() ?? null;
    const bestReviewDate = [local.lastReviewRitualDate, row.last_review_ritual_date]
      .filter(Boolean).sort().pop() ?? null;

    const remoteLists = (row.custom_lists as CustomList[]) ?? [];
    const localLists = local.customLists ?? [];
    const listById = new Map(localLists.map((l: CustomList) => [l.id, l]));
    for (const rl of remoteLists) {
      if (!listById.has(rl.id)) listById.set(rl.id, rl);
    }
    const mergedLists = [...listById.values()].sort((a: CustomList, b: CustomList) => a.order - b.order);

    _setPrefs({
      theme: row.theme,
      view: row.view,
      activeHashtag: row.active_hashtag,
      sidebarCollapsed: row.sidebar_collapsed,
      labelColors: row.label_colors,
      lastRitualDate: bestRitualDate,
      planningRitualEnabled: row.planning_ritual_enabled ?? true,
      planningRitualHour: row.planning_ritual_hour ?? 6,
      reviewRitualEnabled: row.review_ritual_enabled ?? true,
      reviewRitualHour: row.review_ritual_hour ?? 17,
      lastReviewRitualDate: bestReviewDate,
      customLists: mergedLists,
      activeListId: row.active_list_id ?? null,
    });
  }
}

let prefsTimer: ReturnType<typeof setTimeout> | null = null;

export function pushPreferences(): void {
  const supabase = getSupabase();
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
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  prefsTimer = null;
  const s = _getPrefs();
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
