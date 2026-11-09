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
 * How far back the rollover reaches. Anything older than this is left exactly
 * where it is -- not moved, not escalated, not deduplicated.
 *
 * While the rollover is healthy nothing can age past this window: an overdue
 * task is moved to today every day, so it escalates to Later at four
 * consecutive moves long before it is a week old. The window therefore only
 * ever covers a backlog that accumulated while the rollover was NOT running,
 * and that is deliberate. This function was unreachable for roughly eight
 * months (pg_cron authenticated with a legacy service-role JWT that stopped
 * matching the runtime key), which left 265 users holding stale past-dated
 * rows -- thousands each, in the worst cases. Rolling that forward on the
 * first healthy run would dump a user's entire history onto today and discard
 * the original dates. Bounding the window keeps the fix from rewriting
 * history; clearing an old backlog is a separate, deliberate decision.
 */
const ROLLOVER_LOOKBACK_DAYS = 7;

/** Ids per delete request; `in()` travels in the query string. */
const DELETE_CHUNK_SIZE = 100;

/** YYYY-MM-DD for the oldest day the rollover will touch. */
function lookbackCutoff(todayKey: string): string {
  const d = new Date(`${todayKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ROLLOVER_LOOKBACK_DAYS);
  return d.toISOString().slice(0, 10);
}

/**
 * Run auto-move logic for a single user's items, returning DB operations.
 *
 * Every pass is bounded below by `cutoffKey` (see ROLLOVER_LOOKBACK_DAYS) and
 * above by `todayKey`.
 *
 * This runs on every invocation rather than once a day. The old
 * `last_auto_move_date` guard was stamped by whichever rollover ran first and
 * the web client's usually won, which meant the server then skipped the user's
 * unlinked rows for the rest of the day -- so a client with auto-advance
 * switched off left its overdue tasks rolled by nobody. Running ungated cannot
 * double-increment `consecutive_moves`: a move lands an item on today, where
 * the past-dated filter no longer selects it, so each item advances at most
 * once per day no matter how many runs there are.
 */
function computeAutoMove(items: ItemRow[], todayKey: string, cutoffKey: string) {
  const toDelete: string[] = [];
  const toUpdate: Partial<ItemRow & { id: string }>[] = [];
  const now = new Date().toISOString();

  // Build a lookup by id for child/parent queries
  const byId = new Map(items.map((i) => [i.id, i]));

  // --- Deduplicate recurring tasks on same day ---
  const seen = new Map<string, string>(); // "dayKey|text|recType|recInterval" → id
  for (const item of items) {
    if (!item.recurrence || !item.day_key || item.completed || item.parent_id) continue;
    if (item.is_archived) continue;
    // Today and future days are fair game; only the old backlog is off limits.
    if (item.day_key < cutoffKey) continue;
    const key = `${item.day_key}|${item.text}|${item.recurrence.type}|${item.recurrence.interval}`;
    if (seen.has(key)) {
      toDelete.push(item.id);
    } else {
      seen.set(key, item.id);
    }
  }

  // --- Clear stale priority flags from past days ---
  for (const item of items) {
    if (item.day_key && item.day_key >= cutoffKey && item.day_key < todayKey && !item.completed && !item.is_archived && (item.is_priority || item.is_medium_priority)) {
      toUpdate.push({ id: item.id, is_priority: false, is_medium_priority: false, updated_at: now });
    }
  }

  // Filter to items that need moving: past but within the lookback window,
  // incomplete, not Later, not children, not notes, not archived.
  //
  // is_archived matters as much as completed here. Every view filters archived
  // rows out, so rolling one forward is invisible work that silently rewrites
  // its day_key, climbs consecutive_moves, and eventually escalates a row the
  // user has already put away. The client-side rollover had the same gap and
  // had been dragging archived rows forward a day at a time.
  const pastIncomplete = items.filter(
    (i) =>
      i.day_key !== null &&
      i.day_key >= cutoffKey &&
      i.day_key < todayKey &&
      !i.completed &&
      !i.is_archived &&
      !i.is_later &&
      !i.parent_id &&
      i.type !== 'note' &&
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
  for (const item of items) {
    if (toDelete.includes(item.id)) continue;
    if (!item.recurrence || item.completed || item.parent_id) continue;
    if (item.is_archived) continue;
    const dk = finalDay.get(item.id);
    if (!dk || dk < cutoffKey) continue;
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

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Invocation is gated on a dedicated secret, not on a platform key. Holding
  // it allows exactly one thing -- running the rollover -- rather than full
  // read/write access to every table, and it is unaffected by the project's
  // migration from legacy JWT keys to sb_secret_ ones. Gating on the platform
  // key is what silently broke this function: pg_cron kept sending the legacy
  // service-role JWT it was created with, the runtime's
  // SUPABASE_SERVICE_ROLE_KEY became an sb_secret_ value, and every hourly run
  // returned 401 for months while the rollover quietly stopped. Fails closed:
  // if the secret is unset, nothing can authenticate.
  const invokeSecret = Deno.env.get('AUTO_MOVE_SECRET');
  const authHeader = req.headers.get('Authorization');
  if (!invokeSecret || authHeader !== `Bearer ${invokeSecret}`) {
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

      const cutoffKey = lookbackCutoff(todayKey);

      // Cheap existence probe, so an idle user costs one HEAD query instead of
      // a full paged read of their items. Mirrors the pastIncomplete filter in
      // computeAutoMove: a row with is_later set has a null day_key and is
      // excluded by the day_key bounds already. This is a cost optimisation
      // only -- correctness no longer depends on last_auto_move_date, which is
      // still stamped below because the web client reads it through prefs sync.
      const { count, error: probeError } = await supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .gte('day_key', cutoffKey)
        .lt('day_key', todayKey)
        .eq('completed', false)
        .is('parent_id', null)
        .neq('type', 'note');
      if (probeError) {
        console.error(`Rollover probe failed for user ${user_id}:`, probeError);
        continue;
      }
      if (!count) {
        if (last_auto_move_date !== todayKey) {
          await supabase
            .from('user_preferences')
            .update({ last_auto_move_date: todayKey })
            .eq('user_id', user_id);
        }
        continue;
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

      const { toDelete, toUpdate } = computeAutoMove(items, todayKey, cutoffKey);

      if (toDelete.length === 0 && toUpdate.length === 0) {
        // No changes needed, but still mark as processed
        if (last_auto_move_date !== todayKey) {
          await supabase
            .from('user_preferences')
            .update({ last_auto_move_date: todayKey })
            .eq('user_id', user_id);
        }
        continue;
      }

      // Execute deletes, chunked. `in('id', ids)` goes into the query string,
      // so a few hundred UUIDs overflow the request-line limit and PostgREST
      // answers "Bad Request" -- which this loop logged and swallowed, so a
      // user with a large duplicate set had every delete fail silently on every
      // run, forever.
      if (toDelete.length > 0) {
        for (let i = 0; i < toDelete.length; i += DELETE_CHUNK_SIZE) {
          const chunk = toDelete.slice(i, i + DELETE_CHUNK_SIZE);
          const { error: delError } = await supabase
            .from('items')
            .delete()
            .in('id', chunk);
          if (delError) console.error(`Delete error for user ${user_id}:`, delError);
          else itemsDeleted += chunk.length;
        }
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
      if (last_auto_move_date !== todayKey) {
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
