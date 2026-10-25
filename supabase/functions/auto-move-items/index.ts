import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  recurrence: { type: string; interval: number } | null;
  parent_id: string | null;
  consecutive_moves: number;
  is_priority: boolean;
  is_medium_priority: boolean;
  asana_gid: string | null;
  asana_day_key: string | null;
}

// PostgREST caps every response at `max_rows` (1000 on hosted Supabase) and
// returns the truncated set without an error. Any query that must see ALL
// matching rows has to page explicitly, or it silently processes a slice.
const PAGE_SIZE = 1000;

/**
 * Read every row matching a query, one page at a time.
 * `build` receives the page bounds and returns the ranged query.
 * Throws on error so callers never act on a partial result set.
 */
async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) return all;
  }
}

/** Compute YYYY-MM-DD for "today" in a given IANA timezone */
function todayInTimezone(tz: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}

/**
 * Run auto-move logic for a single user's items, returning DB operations.
 *
 * `onlyLinked` restricts the move to Asana-linked rows and skips the
 * housekeeping passes. It exists because the daily `last_auto_move_date` guard
 * is stamped by whichever rollover runs first, and the web client's own
 * rollover usually wins -- which would otherwise leave linked rows rolled by
 * nobody on any day the user opens the web app. Linked rows therefore roll on
 * every run, ungated, and the client-side rollover skips them so it never has
 * to write an asana_* mirror. See docs/asana-sync.md.
 */
function computeAutoMove(items: ItemRow[], todayKey: string, onlyLinked = false) {
  const toDelete: string[] = [];
  const toUpdate: Partial<ItemRow & { id: string }>[] = [];
  const now = new Date().toISOString();

  // Build a lookup by id for child/parent queries
  const byId = new Map(items.map((i) => [i.id, i]));

  // --- Deduplicate recurring tasks on same day ---
  const seen = new Map<string, string>(); // "dayKey|text|recType|recInterval" → id
  for (const item of onlyLinked ? [] : items) {
    if (!item.recurrence || !item.day_key || item.completed || item.parent_id) continue;
    const key = `${item.day_key}|${item.text}|${item.recurrence.type}|${item.recurrence.interval}`;
    if (seen.has(key)) {
      toDelete.push(item.id);
    } else {
      seen.set(key, item.id);
    }
  }

  // --- Clear stale priority flags from past days ---
  for (const item of onlyLinked ? [] : items) {
    if (item.day_key && item.day_key < todayKey && !item.completed && (item.is_priority || item.is_medium_priority)) {
      toUpdate.push({ id: item.id, is_priority: false, is_medium_priority: false, updated_at: now });
    }
  }

  // Filter to items that need moving: past, incomplete, not Later, not children, not notes
  const pastIncomplete = items.filter(
    (i) =>
      i.day_key !== null &&
      i.day_key < todayKey &&
      !i.completed &&
      !i.is_later &&
      !i.parent_id &&
      i.type !== 'note' &&
      (!onlyLinked || i.asana_gid !== null) &&
      !toDelete.includes(i.id)
  );

  // Compute max order among existing today items
  const todayItems = items.filter((i) => i.day_key === todayKey && !i.parent_id);
  let maxOrder = todayItems.length > 0
    ? Math.max(...todayItems.map((i) => i.order))
    : -1;

  // Compute max order among existing Later items (for escalation)
  const laterItems = items.filter((i) => i.day_key === null && i.is_later === true);
  let laterMax = laterItems.length > 0
    ? Math.max(...laterItems.map((i) => i.order))
    : -1;

  for (const item of pastIncomplete) {
    // Recurring: if a future instance already exists, delete the stale past copy
    if (item.recurrence) {
      const hasFutureInstance = items.some(
        (other) =>
          other.id !== item.id &&
          other.day_key !== null &&
          other.day_key >= todayKey &&
          other.text === item.text &&
          !other.completed &&
          other.recurrence &&
          other.recurrence.type === item.recurrence!.type &&
          other.recurrence.interval === item.recurrence!.interval
      );
      if (hasFutureInstance) {
        // Delete stale copy and its children
        toDelete.push(item.id);
        for (const child of items) {
          if (child.parent_id === item.id) toDelete.push(child.id);
        }
        continue;
      }
    }

    const moves = (item.consecutive_moves ?? 0) + 1;
    if (moves >= 4) {
      // Escalate to Later
      laterMax += 1;
      toUpdate.push({
        id: item.id,
        day_key: null,
        is_later: true,
        order: laterMax,
        consecutive_moves: moves,
        updated_at: now,
        // Keep the mirror level with day_key so this never looks like a user
        // move. is_later already suppresses the push, but the two must not drift.
        ...(item.asana_gid ? { asana_day_key: null } : {}),
      });
    } else {
      // Move to today
      maxOrder += 1;
      toUpdate.push({
        id: item.id,
        day_key: todayKey,
        order: maxOrder,
        consecutive_moves: moves,
        updated_at: now,
        // A rollover is not a user move: advance the mirror in the same UPDATE
        // so day_key and asana_day_key never diverge and asana-push stays quiet.
        ...(item.asana_gid ? { asana_day_key: todayKey } : {}),
      });
    }

    // Also move children to follow the parent
    for (const child of items) {
      if (child.parent_id === item.id && child.day_key !== todayKey) {
        toUpdate.push({
          id: child.id,
          day_key: moves >= 4 ? null : todayKey,
          is_later: moves >= 4 ? true : child.is_later,
          updated_at: now,
        });
      }
    }
  }

  // Second dedup pass: after moves, check for recurring items that will
  // end up on the same day.  Build a virtual view of final day_key per item.
  const finalDay = new Map<string, string | null>();
  for (const item of items) finalDay.set(item.id, item.day_key);
  for (const u of toUpdate) finalDay.set(u.id!, u.day_key ?? finalDay.get(u.id!) ?? null);

  const seen2 = new Map<string, string>();
  for (const item of onlyLinked ? [] : items) {
    if (toDelete.includes(item.id)) continue;
    if (!item.recurrence || item.completed || item.parent_id) continue;
    const dk = finalDay.get(item.id);
    if (!dk) continue;
    const key = `${dk}|${item.text}|${item.recurrence.type}|${item.recurrence.interval}`;
    if (seen2.has(key)) {
      toDelete.push(item.id);
    } else {
      seen2.set(key, item.id);
    }
  }

  return { toDelete, toUpdate };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Verify authorization — accept service role key as bearer token
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Fetch all users who have a timezone set (paged — see fetchAllRows)
    let prefs: { user_id: string; timezone: string | null; last_auto_move_date: string | null }[];
    try {
      prefs = await fetchAllRows((from, to) =>
        supabase
          .from('user_preferences')
          .select('user_id, timezone, last_auto_move_date')
          .not('timezone', 'is', null)
          .order('user_id', { ascending: true })
          .range(from, to),
      );
    } catch (prefsError) {
      console.error('Error fetching preferences:', prefsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch preferences' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let usersProcessed = 0;
    let itemsMoved = 0;
    let itemsDeleted = 0;

    for (const pref of (prefs ?? [])) {
      const { user_id, timezone, last_auto_move_date } = pref;
      if (!timezone) continue;

      // Compute today in the user's timezone
      let todayKey: string;
      try {
        todayKey = todayInTimezone(timezone);
      } catch {
        console.warn(`Invalid timezone "${timezone}" for user ${user_id}, skipping`);
        continue;
      }

      // The daily guard belongs to the general rollover only. Asana-linked rows
      // roll on every run, because this guard is stamped by whichever rollover
      // ran first and that is usually the web client's -- see computeAutoMove.
      const alreadyProcessed = last_auto_move_date === todayKey;
      if (alreadyProcessed) {
        // Cheap existence probe so an already-processed user costs one HEAD
        // query instead of a full paged read of their items. Mirrors the
        // pastIncomplete filter in computeAutoMove: a row with is_later set has
        // a null day_key and is excluded by the day_key bound already.
        const { count, error: probeError } = await supabase
          .from('items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user_id)
          .not('asana_gid', 'is', null)
          .lt('day_key', todayKey)
          .eq('completed', false)
          .is('parent_id', null)
          .neq('type', 'note');
        if (probeError) {
          console.error(`Linked-row probe failed for user ${user_id}:`, probeError);
          continue;
        }
        if (!count) continue;
      }

      // Fetch this user's items (paged — auto-move reasons over the whole set,
      // so a truncated read would skip forwarding items past the cap)
      let items: ItemRow[];
      try {
        items = await fetchAllRows<ItemRow>((from, to) =>
          supabase
            .from('items')
            .select('*')
            .eq('user_id', user_id)
            .order('id', { ascending: true })
            .range(from, to),
        );
      } catch (itemsError) {
        console.error(`Error fetching items for user ${user_id}:`, itemsError);
        continue;
      }

      const { toDelete, toUpdate } = computeAutoMove(items, todayKey, alreadyProcessed);

      if (toDelete.length === 0 && toUpdate.length === 0) {
        // No changes needed, but still mark as processed
        if (!alreadyProcessed) {
          await supabase
            .from('user_preferences')
            .update({ last_auto_move_date: todayKey })
            .eq('user_id', user_id);
        }
        continue;
      }

      // Execute deletes
      if (toDelete.length > 0) {
        const { error: delError } = await supabase
          .from('items')
          .delete()
          .in('id', toDelete);
        if (delError) console.error(`Delete error for user ${user_id}:`, delError);
        else itemsDeleted += toDelete.length;
      }

      // Execute updates — batch by identical field sets where possible
      if (toUpdate.length > 0) {
        // Group items moving to the same day_key with same is_later value
        // to reduce number of queries. Items with unique order values
        // still need individual updates.
        for (const update of toUpdate) {
          const { id, ...fields } = update;
          const { error: updError } = await supabase
            .from('items')
            .update(fields)
            .eq('id', id);
          if (updError) console.error(`Update error for item ${id}:`, updError);
          else itemsMoved++;
        }
      }

      // Mark this user as processed for today
      if (!alreadyProcessed) {
        await supabase
          .from('user_preferences')
          .update({ last_auto_move_date: todayKey })
          .eq('user_id', user_id);
      }

      usersProcessed++;
    }

    console.log(`Auto-move complete: ${usersProcessed} users, ${itemsMoved} items moved, ${itemsDeleted} items deleted`);

    return new Response(JSON.stringify({
      success: true,
      users_processed: usersProcessed,
      items_moved: itemsMoved,
      items_deleted: itemsDeleted,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('auto-move-items error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
