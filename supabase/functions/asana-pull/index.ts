import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { nanoid } from 'https://esm.sh/nanoid@5';

// Pull Asana tasks assigned to one user into Zenmode's `items` table.
// See docs/asana-sync.md. Scoped to a single user_id supplied as a secret, so
// no other user's rows are ever read or written.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASANA_WORKSPACE_GID = '1201750888567101';
const ASANA_USER_GID = '958796193196';
const ASANA_BASE = 'https://app.asana.com/api/1.0';
const FALLBACK_TZ = 'America/Los_Angeles';

// How far back to re-examine on each run. Asana's modified_since is exact, but
// a task modified during the previous run's own execution could be missed, so
// overlap the window rather than trusting the boundary.
const PULL_OVERLAP_MINUTES = 10;

// Reconcile is far more expensive than a pull (one request per open linked row),
// so it runs at most this often regardless of the pull cadence.
const RECONCILE_INTERVAL_MINUTES = 60;

const PAGE_SIZE = 1000;

interface ItemRow {
  id: string;
  user_id: string;
  type: string;
  text: string;
  completed: boolean;
  day_key: string | null;
  is_later: boolean | null;
  order: number;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
  is_archived: boolean | null;
  asana_gid: string | null;
  asana_permalink: string | null;
  asana_name: string | null;
  asana_due_on: string | null;
  asana_due_at: string | null;
  asana_completed: boolean | null;
  asana_day_key: string | null;
  asana_synced_at: string | null;
  asana_sync_error: string | null;
}

interface AsanaTask {
  gid: string;
  name: string;
  due_on: string | null;
  due_at: string | null;
  completed: boolean;
  completed_at: string | null;
  permalink_url: string | null;
  modified_at: string | null;
}

/**
 * Read every row matching a query, one page at a time.
 * PostgREST caps each response at `max_rows` (1000 on hosted Supabase) and
 * returns the truncated set WITHOUT an error, so any query that must see the
 * whole set has to page explicitly. Throws so callers never act on a partial read.
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

/** YYYY-MM-DD for "today" in an IANA timezone. */
function todayInTimezone(tz: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}

/** The local calendar date of an instant, in an IANA timezone. */
function localDateOf(iso: string, tz: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: tz });
}

// Asana names carry decoration that reads as noise in Zenmode: emoji, stars,
// diamonds. `•` and `|` are kept -- they're used as plain separators and read
// fine -- but any run of whitespace around a stripped glyph is collapsed, and
// separators left stranded at either end are trimmed.
const DECORATIVE = /[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}️‍★☆⋆✦✧◆◇▪▫]/gu;

function stripName(name: string): string {
  return name
    .replace(DECORATIVE, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s•|·,-]+/, '')
    .replace(/[\s•|·,-]+$/, '')
    .trim();
}

/**
 * Jaccard overlap of the two strings' word sets. Only used to flag probable
 * duplicates in the dry-run report -- linking is still decided by exact match
 * on the stripped text, so a near-miss never links anything on its own.
 */
function wordSimilarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean));
  const wb = new Set(b.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / (wa.size + wb.size - shared);
}

/** Convert a SQL ILIKE pattern into an anchored, case-insensitive RegExp. */
function ilikeToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i');
}

async function asanaFetch(pat: string, path: string): Promise<Response> {
  return await fetch(`${ASANA_BASE}${path}`, {
    headers: { Authorization: `Bearer ${pat}`, Accept: 'application/json' },
  });
}

/** Fetch every page of an Asana collection endpoint. */
let lastFetchPages = 0;

async function asanaFetchAll(pat: string, path: string): Promise<AsanaTask[]> {
  const out: AsanaTask[] = [];
  let next: string | null = path;
  lastFetchPages = 0;
  while (next) {
    lastFetchPages++;
    const res = await asanaFetch(pat, next);
    if (!res.ok) {
      throw new Error(`Asana ${res.status} on ${next.split('?')[0]}: ${await res.text()}`);
    }
    const body = await res.json();
    out.push(...(body.data ?? []));
    // Asana returns a full relative path in next_page.path, including the token.
    next = body.next_page?.path ?? null;
  }
  return out;
}

type Action =
  | {
      kind: 'insert';
      gid: string;
      name: string;
      dayKey: string;
      nearMiss?: { text: string; score: number; rows: number };
      row: Record<string, unknown>;
    }
  | { kind: 'link'; gid: string; name: string; itemId: string; itemText: string; patch: Record<string, unknown> }
  | { kind: 'update'; gid: string; itemId: string; reasons: string[]; patch: Record<string, unknown> }
  | { kind: 'ambiguous'; gid: string; name: string; candidateIds: string[] }
  | { kind: 'archive'; gid: string; itemId: string; reason: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Invocation is gated on a dedicated secret, not on a platform key. Holding
  // it allows exactly one thing -- running this sync -- rather than full
  // read/write access to every table, and it is unaffected by the project's
  // migration from legacy JWT keys to sb_secret_ ones. Fails closed: if the
  // secret is unset, nothing can authenticate.
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
  // Dry run is the default. Writing requires DRY_RUN to be set explicitly to
  // 'false', so a missing or misspelled variable can never start writing.
  const dryRun = Deno.env.get('DRY_RUN') !== 'false';

  // Name the missing secret: "one of these is unset" is hard to act on when
  // the usual cause is a single `secrets set` that didn't take.
  const missing = [
    !pat ? 'ASANA_PAT' : null,
    !userId ? 'ASANA_SYNC_USER_ID' : null,
  ].filter(Boolean);
  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ error: `Missing required secret(s): ${missing.join(', ')}` }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey);
  const actions: Action[] = [];
  const errors: string[] = [];

  try {
    // --- State, preferences, exclusions ---

    const { data: state } = await supabase
      .from('asana_sync_state')
      .select('last_pull_at, last_reconcile_at')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('timezone')
      .eq('user_id', userId)
      .maybeSingle();

    const tz = prefs?.timezone || FALLBACK_TZ;
    const todayKey = todayInTimezone(tz);

    const exclusionRows = await fetchAllRows<{ pattern: string }>((from, to) =>
      supabase
        .from('asana_sync_exclusions')
        .select('pattern')
        .eq('user_id', userId)
        .range(from, to),
    );
    const exclusions = exclusionRows.map((r) => ilikeToRegExp(r.pattern));

    // --- Fetch Asana tasks ---

    const fields = 'name,due_on,due_at,completed,completed_at,permalink_url,modified_at';
    let query = `/tasks?assignee=me&workspace=${ASANA_WORKSPACE_GID}&opt_fields=${fields}&limit=100`;

    if (state?.last_pull_at) {
      const since = new Date(
        new Date(state.last_pull_at).getTime() - PULL_OVERLAP_MINUTES * 60_000,
      ).toISOString();
      // completed_since returns incomplete tasks plus anything completed since
      // the timestamp; modified_since narrows to what actually changed.
      query += `&completed_since=${encodeURIComponent(since)}&modified_since=${encodeURIComponent(since)}`;
    } else {
      // First run: take every incomplete assigned task, however old.
      query += '&completed_since=now';
    }

    const tasks = await asanaFetchAll(pat, query);

    // --- Fetch this user's items once; needed for gid lookup, text matching
    // and order computation alike ---

    const items = await fetchAllRows<ItemRow>((from, to) =>
      supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .order('id', { ascending: true })
        .range(from, to),
    );

    const byGid = new Map<string, ItemRow>();
    for (const item of items) {
      if (item.asana_gid) byGid.set(item.asana_gid, item);
    }

    // Open, unlinked candidates for first-run text matching, grouped by
    // stripped text. A name matching more than one row is left alone: an
    // arbitrary link is worse than no link.
    const unlinkedByText = new Map<string, ItemRow[]>();
    for (const item of items) {
      if (item.asana_gid || item.completed || item.is_archived || item.parent_id) continue;
      if (item.type !== 'task') continue;
      const key = stripName(item.text).toLowerCase();
      if (!key) continue;
      const bucket = unlinkedByText.get(key);
      if (bucket) bucket.push(item);
      else unlinkedByText.set(key, [item]);
    }

    // Next order per day, seeded from existing rows so inserts land at the end
    // of a day rather than colliding at position 0.
    const nextOrder = new Map<string, number>();
    for (const item of items) {
      if (item.parent_id) continue;
      const key = item.day_key ?? '__later__';
      nextOrder.set(key, Math.max(nextOrder.get(key) ?? -1, item.order));
    }
    const takeOrder = (dayKey: string): number => {
      const next = (nextOrder.get(dayKey) ?? -1) + 1;
      nextOrder.set(dayKey, next);
      return next;
    };

    const now = new Date().toISOString();

    for (const task of tasks) {
      const stripped = stripName(task.name ?? '');
      if (exclusions.some((re) => re.test(task.name ?? ''))) continue;

      const existing = byGid.get(task.gid);

      if (!existing) {
        if (task.completed) continue; // Nothing to represent.

        const dayKey = task.due_on
          ?? (task.due_at ? localDateOf(task.due_at, tz) : todayKey);

        const mirrors = {
          asana_gid: task.gid,
          asana_permalink: task.permalink_url ?? null,
          asana_name: task.name ?? null,
          asana_due_on: task.due_on ?? null,
          asana_due_at: task.due_at ?? null,
          asana_completed: false,
          asana_day_key: dayKey,
          asana_synced_at: now,
          asana_sync_error: null,
        };

        const candidates = unlinkedByText.get(stripped.toLowerCase()) ?? [];
        if (candidates.length === 1) {
          const match = candidates[0];
          // Linking only sets mirrors. `text`, `notes` and `day_key` stay as
          // they are: the row is already where the user put it, and `notes` may
          // hold their own writing.
          actions.push({
            kind: 'link',
            gid: task.gid,
            name: stripped,
            itemId: match.id,
            itemText: match.text,
            patch: { ...mirrors, asana_day_key: match.day_key, updated_at: now },
          });
          unlinkedByText.delete(stripped.toLowerCase());
          continue;
        }
        if (candidates.length > 1) {
          actions.push({
            kind: 'ambiguous',
            gid: task.gid,
            name: stripped,
            candidateIds: candidates.map((c) => c.id),
          });
          continue;
        }

        let best: { text: string; score: number; count: number } | null = null;
        for (const [key, rows] of unlinkedByText) {
          const score = wordSimilarity(stripped, key);
          if (score > (best?.score ?? 0)) {
            best = { text: rows[0].text, score, count: rows.length };
          }
        }

        actions.push({
          kind: 'insert',
          gid: task.gid,
          name: stripped,
          dayKey,
          ...(best && best.score >= 0.6
            ? { nearMiss: { text: best.text, score: Number(best.score.toFixed(2)), rows: best.count } }
            : {}),
          row: {
            id: nanoid(),
            user_id: userId,
            type: 'task',
            text: stripped,
            completed: false,
            day_key: dayKey,
            is_later: false,
            order: takeOrder(dayKey),
            created_at: now,
            updated_at: now,
            recurrence: null, // Asana owns recurrence.
            ...mirrors,
          },
        });
        continue;
      }

      // --- Row exists: diff against the mirrors ---

      const patch: Record<string, unknown> = {};
      const reasons: string[] = [];
      // Only a change the user can see in Zenmode bumps updated_at. Mirror and
      // housekeeping writes must not, or every linked row looks remote-newer on
      // each run and the client's merge overwrites local state every 5 minutes.
      let userVisible = false;

      if (task.completed && !existing.completed) {
        patch.completed = true;
        patch.completed_at = task.completed_at ?? now;
        patch.asana_completed = true;
        reasons.push('completed in Asana');
        userVisible = true;
      } else if (!task.completed && existing.completed && existing.asana_completed === true) {
        patch.completed = false;
        patch.completed_at = null;
        patch.asana_completed = false;
        reasons.push('reopened in Asana');
        userVisible = true;
      }

      // Asana-side date changes are detected against asana_due_on/at, never
      // against asana_day_key -- a rollover legitimately moves asana_day_key
      // away from Asana's date.
      const dueOnChanged = (task.due_on ?? null) !== (existing.asana_due_on ?? null);
      const dueAtChanged = (task.due_at ?? null) !== (existing.asana_due_at ?? null);
      if (dueOnChanged || dueAtChanged) {
        const newDay = task.due_on
          ?? (task.due_at ? localDateOf(task.due_at, tz) : null);
        patch.asana_due_on = task.due_on ?? null;
        patch.asana_due_at = task.due_at ?? null;
        if (newDay) {
          patch.day_key = newDay;
          patch.is_later = false;
          patch.asana_day_key = newDay;
          reasons.push(`due date -> ${newDay}`);
          userVisible = true;
        } else {
          // Due date removed in Asana: leave the task where it sits.
          reasons.push('due date cleared in Asana (position kept)');
        }
      }

      // Rename, but only while the user hasn't edited the text themselves.
      const previousStripped = stripName(existing.asana_name ?? '');
      if (
        (task.name ?? '') !== (existing.asana_name ?? '')
        && existing.text === previousStripped
        && stripped
      ) {
        patch.text = stripped;
        reasons.push('renamed in Asana');
        userVisible = true;
      }
      if ((task.name ?? '') !== (existing.asana_name ?? '')) {
        patch.asana_name = task.name ?? null;
      }

      if ((task.permalink_url ?? null) !== (existing.asana_permalink ?? null)) {
        patch.asana_permalink = task.permalink_url ?? null;
      }

      patch.asana_synced_at = now;
      if (existing.asana_sync_error) {
        patch.asana_sync_error = null;
        userVisible = true; // The error badge disappears from the task.
      }
      if (userVisible) patch.updated_at = now;

      // Skip rows where only asana_synced_at would move: that write costs a
      // realtime notification on every client for no visible reason.
      const meaningful = Object.keys(patch).some(
        (k) => k !== 'asana_synced_at',
      );
      if (meaningful) {
        actions.push({ kind: 'update', gid: task.gid, itemId: existing.id, reasons, patch });
      }
    }

    // --- Reconcile: catch reassignment and deletion, which never appear in an
    // assignee=me query. Hourly, since it costs one request per open linked row.
    //
    // The other half of reconcile -- retrying pushes that failed -- lands with
    // asana-push, since there is nothing to retry until that function exists.

    const reconcileDue = !state?.last_reconcile_at
      || Date.now() - new Date(state.last_reconcile_at).getTime()
        >= RECONCILE_INTERVAL_MINUTES * 60_000;

    let reconciled = 0;
    if (reconcileDue) {
      const openLinked = items.filter(
        (i) => i.asana_gid && !i.completed && !i.is_archived,
      );
      for (const item of openLinked) {
        reconciled++;
        const res = await asanaFetch(pat, `/tasks/${item.asana_gid}?opt_fields=assignee,completed`);
        if (res.status === 404) {
          actions.push({
            kind: 'archive', gid: item.asana_gid!, itemId: item.id, reason: 'deleted in Asana',
          });
          continue;
        }
        if (!res.ok) {
          errors.push(`reconcile ${item.asana_gid}: ${res.status}`);
          continue;
        }
        const body = await res.json();
        const assignee = body.data?.assignee?.gid ?? null;
        if (assignee !== ASANA_USER_GID) {
          actions.push({
            kind: 'archive', gid: item.asana_gid!, itemId: item.id, reason: 'reassigned away',
          });
        }
      }
    }

    // --- Apply, or report ---

    let applied = 0;
    if (!dryRun) {
      for (const action of actions) {
        if (action.kind === 'ambiguous') continue;
        if (action.kind === 'insert') {
          const { error } = await supabase.from('items').insert([action.row]);
          if (error) errors.push(`insert ${action.gid}: ${error.message}`);
          else applied++;
        } else if (action.kind === 'archive') {
          const { error } = await supabase
            .from('items')
            .update({ is_archived: true, updated_at: new Date().toISOString() })
            .eq('id', action.itemId)
            .eq('user_id', userId);
          if (error) errors.push(`archive ${action.itemId}: ${error.message}`);
          else applied++;
        } else {
          const { error } = await supabase
            .from('items')
            .update(action.patch)
            .eq('id', action.itemId)
            .eq('user_id', userId);
          if (error) errors.push(`update ${action.itemId}: ${error.message}`);
          else applied++;
        }
      }

      await supabase.from('asana_sync_state').update({
        last_pull_at: now,
        ...(reconcileDue ? { last_reconcile_at: now } : {}),
        last_error: errors.length ? errors.slice(0, 5).join('; ') : null,
        updated_at: now,
      }).eq('user_id', userId);
    }

    const summary = {
      dry_run: dryRun,
      timezone: tz,
      today: todayKey,
      asana_tasks_seen: tasks.length,
      asana_pages_fetched: lastFetchPages,
      zenmode_rows_scanned: items.length,
      reconcile_ran: reconcileDue,
      reconcile_requests: reconciled,
      counts: {
        insert: actions.filter((a) => a.kind === 'insert').length,
        link: actions.filter((a) => a.kind === 'link').length,
        update: actions.filter((a) => a.kind === 'update').length,
        archive: actions.filter((a) => a.kind === 'archive').length,
        ambiguous: actions.filter((a) => a.kind === 'ambiguous').length,
      },
      applied,
      errors,
      // Full detail, so a dry run can be reviewed line by line.
      actions,
    };

    console.log(JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('asana-pull failed:', message);
    if (!dryRun) {
      await supabase
        .from('asana_sync_state')
        .update({ last_error: message, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }
    return new Response(JSON.stringify({ error: message, dry_run: dryRun }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
});
