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
}

/** Compute YYYY-MM-DD for "today" in a given IANA timezone */
function todayInTimezone(tz: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}

/** Run auto-move logic for a single user's items, returning DB operations */
function computeAutoMove(items: ItemRow[], todayKey: string) {
  const toDelete: string[] = [];
  const toUpdate: Partial<ItemRow & { id: string }>[] = [];
  const now = new Date().toISOString();

  // Build a lookup by id for child/parent queries
  const byId = new Map(items.map((i) => [i.id, i]));

  // --- Deduplicate recurring tasks on same day ---
  const seen = new Map<string, string>(); // "dayKey|text|recType|recInterval" → id
  for (const item of items) {
    if (!item.recurrence || !item.day_key || item.completed || item.parent_id) continue;
    const key = `${item.day_key}|${item.text}|${item.recurrence.type}|${item.recurrence.interval}`;
    if (seen.has(key)) {
      toDelete.push(item.id);
    } else {
      seen.set(key, item.id);
    }
  }

  // --- Clear stale priority flags from past days ---
  for (const item of items) {
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
    // Fetch all users who have a timezone set
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('user_id, timezone, last_auto_move_date')
      .not('timezone', 'is', null);

    if (prefsError) {
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

      // Skip if already processed today
      if (last_auto_move_date === todayKey) continue;

      // Fetch this user's items
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user_id);

      if (itemsError) {
        console.error(`Error fetching items for user ${user_id}:`, itemsError);
        continue;
      }

      const { toDelete, toUpdate } = computeAutoMove(items as ItemRow[], todayKey);

      if (toDelete.length === 0 && toUpdate.length === 0) {
        // No changes needed, but still mark as processed
        await supabase
          .from('user_preferences')
          .update({ last_auto_move_date: todayKey })
          .eq('user_id', user_id);
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
      await supabase
        .from('user_preferences')
        .update({ last_auto_move_date: todayKey })
        .eq('user_id', user_id);

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
