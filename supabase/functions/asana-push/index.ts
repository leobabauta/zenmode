import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Push a single Zenmode item's completion or date change to Asana.
// Called by the items_asana_push trigger with { item_id }. See docs/asana-sync.md.
//
// This function mutates state Leo's team sees, so it defaults to dry run:
// writing to Asana requires PUSH_DRY_RUN to be exactly 'false'. Every attempt,
// dry or real, writes a row to asana_push_log.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASANA_BASE = 'https://app.asana.com/api/1.0';
const FALLBACK_TZ = 'America/Los_Angeles';

interface ItemRow {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  day_key: string | null;
  is_later: boolean | null;
  asana_gid: string;
  asana_due_on: string | null;
  asana_due_at: string | null;
  asana_completed: boolean | null;
  asana_day_key: string | null;
  completion_note: string | null;
  completion_note_posted_at: string | null;
  asana_sync_error: string | null;
}

/** Offset of `tz` from UTC, in minutes, at a given instant. */
function tzOffsetMinutes(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at).filter((p) => p.type !== 'literal');
  const v = Object.fromEntries(parts.map((p) => [p.type, Number(p.value)])) as Record<string, number>;
  // Intl can render hour 24 for midnight; normalise before reassembling.
  const asIfUtc = Date.UTC(v.year, v.month - 1, v.day, v.hour % 24, v.minute, v.second);
  return (asIfUtc - at.getTime()) / 60000;
}

/** The wall-clock time of an instant, as seen in `tz`. */
function localTimeOf(iso: string, tz: string): { h: number; m: number; s: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(iso)).filter((p) => p.type !== 'literal');
  const v = Object.fromEntries(parts.map((p) => [p.type, Number(p.value)])) as Record<string, number>;
  return { h: v.hour % 24, m: v.minute, s: v.second };
}

/**
 * The UTC instant at which `tz` reads dayKey at h:m:s.
 *
 * Resolved by iteration rather than arithmetic because the offset depends on
 * the answer: the target date may sit on the other side of a DST boundary from
 * the first guess. Two passes settle it for every real zone.
 */
function zonedToUtc(dayKey: string, h: number, m: number, s: number, tz: string): string {
  const [Y, M, D] = dayKey.split('-').map(Number);
  const wall = Date.UTC(Y, M - 1, D, h, m, s);
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    guess = wall - tzOffsetMinutes(new Date(guess), tz) * 60000;
  }
  return new Date(guess).toISOString();
}

type PushAttempt = {
  action: string;
  payload: Record<string, unknown> | null;
  status: 'ok' | 'error' | 'skipped';
  error?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const invokeSecret = Deno.env.get('ASANA_SYNC_SECRET');
  const authHeader = req.headers.get('Authorization');
  if (!invokeSecret || authHeader !== `Bearer ${invokeSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const pat = Deno.env.get('ASANA_PAT');
  const userId = Deno.env.get('ASANA_SYNC_USER_ID');
  const missing = [!pat ? 'ASANA_PAT' : null, !userId ? 'ASANA_SYNC_USER_ID' : null].filter(Boolean);
  if (missing.length > 0) {
    return new Response(JSON.stringify({ error: `Missing required secret(s): ${missing.join(', ')}` }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  // Dry run unless explicitly turned off, same as asana-pull.
  const dryRun = Deno.env.get('PUSH_DRY_RUN') !== 'false';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let itemId: string | null = null;
  try {
    const body = await req.json();
    itemId = body?.item_id ?? null;
  } catch {
    // fall through to the 400 below
  }
  if (!itemId) {
    return new Response(JSON.stringify({ error: 'item_id required' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const attempts: PushAttempt[] = [];

  const logAttempt = async (row: ItemRow | null, a: PushAttempt) => {
    attempts.push(a);
    await supabase.from('asana_push_log').insert([{
      user_id: userId,
      item_id: itemId,
      asana_gid: row?.asana_gid ?? null,
      action: a.action,
      payload: a.payload,
      dry_run: dryRun,
      status: a.status,
      error: a.error ?? null,
    }]);
  };

  try {
    // Always re-read: the trigger fires on a row that may have changed again
    // while this call was queued, and only the current state should be pushed.
    const { data: row, error: readError } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .eq('user_id', userId)
      .not('asana_gid', 'is', null)
      .maybeSingle<ItemRow>();

    if (readError) throw readError;
    if (!row) {
      // Not Leo's row, not linked, or deleted since the trigger fired.
      return new Response(JSON.stringify({ skipped: 'no matching linked row', item_id: itemId }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('timezone')
      .eq('user_id', userId)
      .maybeSingle();
    const tz = prefs?.timezone || FALLBACK_TZ;

    const nowIso = new Date().toISOString();
    const mirrors: Record<string, unknown> = {};
    let hadError = false;

    const asanaPut = async (data: Record<string, unknown>): Promise<void> => {
      const res = await fetch(`${ASANA_BASE}/tasks/${row.asana_gid}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${pat}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) throw new Error(`Asana PUT ${res.status}: ${await res.text()}`);
    };

    // --- Completion ---------------------------------------------------------

    if (row.completed && row.asana_completed !== true) {
      // The note goes up before the completion so Diana and Amanda see them
      // together, and it is claimed before it is sent: two trigger calls can
      // overlap, and a story posted twice cannot be unposted.
      if (row.completion_note && row.completion_note.trim() && !row.completion_note_posted_at) {
        if (dryRun) {
          await logAttempt(row, {
            action: 'post_note', payload: { text: row.completion_note }, status: 'skipped',
          });
        } else {
          const { data: claimed, error: claimError } = await supabase
            .from('items')
            .update({ completion_note_posted_at: nowIso })
            .eq('id', row.id)
            .is('completion_note_posted_at', null)
            .select('id');

          if (claimError) throw claimError;
          if (claimed && claimed.length === 1) {
            try {
              const res = await fetch(`${ASANA_BASE}/tasks/${row.asana_gid}/stories`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${pat}`,
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                },
                body: JSON.stringify({ data: { text: row.completion_note } }),
              });
              if (!res.ok) throw new Error(`Asana POST story ${res.status}: ${await res.text()}`);
              await logAttempt(row, {
                action: 'post_note', payload: { text: row.completion_note }, status: 'ok',
              });
            } catch (noteErr) {
              // Release the claim so the note is not silently lost; reconcile
              // will try again.
              await supabase.from('items')
                .update({ completion_note_posted_at: null })
                .eq('id', row.id);
              throw noteErr;
            }
          }
          // claimed.length === 0 means another invocation already owns the note.
        }
      }

      if (dryRun) {
        await logAttempt(row, { action: 'complete', payload: { completed: true }, status: 'skipped' });
      } else {
        await asanaPut({ completed: true });
        mirrors.asana_completed = true;
        await logAttempt(row, { action: 'complete', payload: { completed: true }, status: 'ok' });
      }
    } else if (!row.completed && row.asana_completed === true) {
      if (dryRun) {
        await logAttempt(row, { action: 'reopen', payload: { completed: false }, status: 'skipped' });
      } else {
        await asanaPut({ completed: false });
        mirrors.asana_completed = false;
        await logAttempt(row, { action: 'reopen', payload: { completed: false }, status: 'ok' });
      }
    }

    // --- Date -------------------------------------------------------------
    //
    // day_key <> asana_day_key is the signal that Leo moved the task himself:
    // rollover advances both in one UPDATE, and the pull sets both when Asana's
    // own date changes. is_later suppresses the push entirely -- sending a task
    // to Later is deliberately invisible to Asana.

    if (!row.is_later && row.day_key && row.day_key !== row.asana_day_key) {
      const payload: Record<string, unknown> = row.asana_due_at
        ? (() => {
            // Timed task: keep the same wall-clock time on the new date.
            const { h, m, s } = localTimeOf(row.asana_due_at, tz);
            return { due_at: zonedToUtc(row.day_key!, h, m, s, tz) };
          })()
        : { due_on: row.day_key };

      if (dryRun) {
        await logAttempt(row, { action: 'reschedule', payload, status: 'skipped' });
      } else {
        await asanaPut(payload);
        mirrors.asana_day_key = row.day_key;
        if ('due_at' in payload) {
          mirrors.asana_due_at = payload.due_at;
          mirrors.asana_due_on = row.day_key;
        } else {
          mirrors.asana_due_on = row.day_key;
          mirrors.asana_due_at = null;
        }
        await logAttempt(row, { action: 'reschedule', payload, status: 'ok' });
      }
    }

    // --- Read back what Asana now holds -------------------------------------
    //
    // Logging the payload we sent only proves what we intended. One GET after a
    // successful write records what Asana actually stored, which is the thing
    // worth having in an audit trail of changes to someone else's deadlines --
    // and it is how a real push gets verified without reading the function's
    // own optimism back to ourselves.

    if (!dryRun && attempts.some((a) => a.status === 'ok')) {
      try {
        const res = await fetch(
          `${ASANA_BASE}/tasks/${row.asana_gid}?opt_fields=due_on,due_at,completed`,
          { headers: { Authorization: `Bearer ${pat}`, Accept: 'application/json' } },
        );
        if (res.ok) {
          const body = await res.json();
          await logAttempt(row, {
            action: 'verify',
            payload: {
              due_on: body.data?.due_on ?? null,
              due_at: body.data?.due_at ?? null,
              completed: body.data?.completed ?? null,
            },
            status: 'ok',
          });
        } else {
          await logAttempt(row, {
            action: 'verify', payload: null, status: 'error',
            error: `Asana GET ${res.status}`,
          });
        }
      } catch (verifyErr) {
        // A failed read-back says nothing about whether the write landed, so it
        // is recorded and otherwise ignored.
        await logAttempt(row, {
          action: 'verify', payload: null, status: 'error',
          error: verifyErr instanceof Error ? verifyErr.message : String(verifyErr),
        });
      }
    }

    // Nothing was outstanding, yet the row still carries an error from an
    // earlier attempt. It is stale -- the divergence that caused it is gone --
    // and leaving it would keep a warning badge on the task indefinitely. The
    // block below turns this into the clearing write, updated_at included.
    if (!dryRun && attempts.length === 0 && row.asana_sync_error) {
      mirrors.asana_sync_error = null;
    }

    // --- Persist mirrors ----------------------------------------------------

    if (!dryRun && Object.keys(mirrors).length > 0) {
      mirrors.asana_synced_at = nowIso;
      if (row.asana_sync_error) {
        mirrors.asana_sync_error = null;
        // The error badge disappearing is visible, so this one does bump
        // updated_at. Mirror-only writes never do -- see docs/asana-sync.md.
        mirrors.updated_at = nowIso;
      }
      const { error: writeError } = await supabase
        .from('items').update(mirrors).eq('id', row.id).eq('user_id', userId);
      if (writeError) throw writeError;
    }

    return new Response(JSON.stringify({
      item_id: row.id,
      text: row.text,
      dry_run: dryRun,
      attempts,
      mirrors_written: dryRun ? {} : mirrors,
    }, null, 2), { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`asana-push failed for item ${itemId}:`, message);
    // Mirrors are left untouched on purpose: the divergence that triggered this
    // push stays, so the hourly reconcile picks the row up and retries.
    await supabase.from('items')
      .update({ asana_sync_error: message.slice(0, 500) })
      .eq('id', itemId)
      .eq('user_id', userId);
    await supabase.from('asana_push_log').insert([{
      user_id: userId, item_id: itemId, action: 'error',
      payload: null, dry_run: dryRun, status: 'error', error: message.slice(0, 500),
    }]);
    return new Response(JSON.stringify({ error: message, item_id: itemId }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
});
