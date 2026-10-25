# Two-way Asana ↔ Zenmode sync

Implementation plan. Revised after reading the code; supersedes the original
handoff. Changes from that draft are marked **[revised]** with the reason.

## Goal

All of Leo's tasks live in Zenmode. Work tasks also live in Asana, where his
team (Diana, Amanda) assigns and tracks them.

- A task assigned to Leo in Asana appears in Zenmode on its due date, or today if undated.
- Checking it off in Zenmode completes it in Asana. Unchecking reopens it.
- Moving it to another day in Zenmode moves its Asana due date.
- Checking off a synced task with a note posts the note to Asana as a comment, then completes the task.
- Changes in Asana (completion, due date, rename, reassignment, deletion) flow back to Zenmode.

## The constraint that shapes everything

**Zenmode is local-first.** The Zustand store in `src/store/usePlannerStore.ts`
is authoritative. `src/lib/sync.ts` merges by comparing `updatedAt` and pushes
whole rows through `itemToRow`. Supabase is a replication target, not the system
of record.

Three consequences:

1. **A column the app needs must be plumbed through the client.** `rowToItem`
   (`src/lib/sync.ts:96`) builds `PlannerItem` from a fixed field list; anything
   absent from it does not exist as far as the UI is concerned.
2. **The client cannot be relied on to write a field it doesn't know about.** A
   client upsert leaves unknown columns at whatever the last server write set
   them to. Any design where the client must set a flag for the server to read
   fails silently unless that field is in `itemToRow`.
3. **Every write that bumps `updated_at` costs a round of client overwrites.**
   `subscribeToRealtime` (`src/lib/sync.ts:550`) pulls on each remote write, and
   the merge takes the remote row whenever it is newer.

Columns the client **writes** (added to `PlannerItem`, `ItemRow`, `itemToRow`,
`rowToItem`): `completion_note`.
Columns the client **reads only** (added to `ItemRow`, `rowToItem`, and
`PlannerItem`, but never emitted by `itemToRow`): `asana_gid`,
`asana_permalink`, `asana_sync_error`.
Columns the client never sees: all other `asana_*` mirrors.

Leaving the mirrors out of `itemToRow` is what keeps them safe. PostgREST builds
`ON CONFLICT DO UPDATE SET` only from the keys present in the payload, and
`itemToRow` emits a uniform key set that never includes them, so client upserts
cannot null them. **Verify this with one test row before trusting it** — it is
load-bearing.

## Scope: Leo only

No feature flag. The gate is data:

- New columns are nullable; every other user's rows stay `NULL`.
- Edge functions use the service role but filter every query to one `user_id`.
- New tables get RLS (service role + owner only), keyed by `user_id`.
- Every UI addition renders only when `item.asanaGid` is set. No other user will
  ever have a non-null `asana_gid`, so the app is behaviourally identical for them.

**Do not put Leo's identity in the client.** The repo and the deployed bundle
are both public. Resolve his `user_id` once in a migration; pass it to the edge
functions as a secret (`ASANA_SYNC_USER_ID`) rather than committing an
`auth.users` email lookup. Same reasoning as the bug-report pipeline keeping
emails out of public issues.

**[revised] Web only.** Mobile needs no code changes at all. It has no
client-side rollover (`shared/lib/sync.ts` + `mobile/src/store/usePlannerStore.ts`),
so a move made on the phone pushes `day_key` and nothing else — which is exactly
the signal the push path wants. Mobile simply won't show the note field, the
Asana indicator, or the error badge.

## Decisions

1. No due date in Asana → the task goes on today in Zenmode. Leo moves it if needed.
2. Rescheduling in Zenmode updates the Asana due date.
3. The daily checkin ("What did you work on today?") **is** included in the sync.
4. An Asana-side complete→reopen inside one pull window reads as unchanged. Accepted.
5. Renames are one-way until Leo edits the text locally, after which Asana
   renames stop landing. Zenmode never pushes names to Asana — the team owns the
   wording. Completion still syncs regardless.
6. Escalation to Later writes nothing to Asana.
7. **[revised]** The "was this a user move?" signal is `day_key <> asana_day_key`,
   not a `day_key_changed_by` column. See Rollover.
8. The daily/weekly skills stop inserting Asana tasks into Zenmode once the sync
   is live. See Skills.

## Verified before writing this

- `pg_cron` 1.6.4 and `pg_net` 0.19.5 are both installed. No extension work needed.
- The live `items` schema matches the 22 columns the original handoff listed.
- The exclusion seed list matches the standing exclusions in `weekly-zenmode-sync`.
  The other two entries on that list are calendar events, not Asana tasks.
- `items` RLS is not defined in `supabase/migrations/` — it was set in the
  dashboard. Run `get_advisors` after migrating.

## 1. Migration (additive only)

Add to `items`:

| Column | Type | Purpose |
|---|---|---|
| `asana_gid` | text | Linked Asana task. Partial unique index on `(user_id, asana_gid) WHERE asana_gid IS NOT NULL` |
| `asana_permalink` | text | Link shown in the UI |
| `asana_name` | text | Last synced Asana name, raw, for rename detection |
| `asana_due_on` | date | Last known Asana due date |
| `asana_due_at` | timestamptz | Last known Asana due time, if the task is timed |
| `asana_completed` | boolean | Last known Asana completion state |
| `asana_day_key` | text | The day Zenmode last placed the task *without user intent* |
| `completion_note` | text | Note to post to Asana on check-off |
| `completion_note_posted_at` | timestamptz | Prevents posting the same note twice |
| `asana_sync_error` | text | Last push/pull error for this row, shown in the UI |
| `asana_synced_at` | timestamptz | Last successful sync for this row |

**[revised] `day_key_changed_by` is dropped.** The original design had the client
set it to `'user'` on every move. The client pushes whole rows through
`itemToRow`, so unless the column were added there it would keep whatever the
last *server* write left — `'rollover'` or `'sync'` — and every genuine user move
would read as a rollover. The stated fail-safe ("when unsure, don't push") would
have become "date sync never works."

**[revised] `asana_day_key` is not "the day both systems agreed on."** Once a
rollover advances it, Zenmode's placement and Asana's `due_on` legitimately
differ. It means "where Zenmode put this on its own." The pull therefore detects
an Asana-side date change by comparing against `asana_due_on` / `asana_due_at`,
never against `asana_day_key`.

New tables (RLS enabled, service role + owner only):

- `asana_sync_state`: `user_id`, `last_pull_at`, `last_reconcile_at`, `last_error`.
  The skills check `last_pull_at` to see whether the sync is running.
- `asana_sync_exclusions`: `user_id`, `pattern` (case-insensitive `ILIKE` on the
  Asana name). Seed, **not** including the daily checkin:
  - `What will you be working on this week?`
  - `%FMP Weekly Call%`
  - `%Post Friday victories thread%`

## 2. Pull: `asana-pull` edge function, every 5 minutes

1. Fetch tasks changed since `last_pull_at` minus a 10-minute buffer:
   `GET /tasks?assignee=me&workspace=1201750888567101&completed_since=<ts>&modified_since=<ts>&opt_fields=name,due_on,due_at,completed,completed_at,permalink_url,modified_at&limit=100`,
   paginating. Verify both parameters against current Asana docs.
2. Skip tasks matching `asana_sync_exclusions`.
3. For each task, find the Zenmode row by `asana_gid`.

   **No row, task incomplete.** First look for an open, unlinked row of Leo's
   whose emoji-stripped text matches the stripped Asana name, case-insensitive
   and trimmed. **[revised] If more than one row matches, link none of them and
   report the ambiguity.** With ~1,000 rows and names like "FMP Weekly Call,"
   collisions are likely, and an arbitrary link is worse than no link.

   **Linking leaves the row where it is**, with one exception: a row sitting in
   Later while the Asana task has a real due date is placed on that date, with
   `is_later` cleared and `consecutive_moves` reset to 0 — without the reset the
   first rollover afterwards escalates it straight back. It fires at **link time
   only**; applying it to rows that are already linked would make Later unusable
   for a synced task, because the next pull would drag it back out, and decision
   6 says moving a task to Later is a legitimate thing to do. Added after the
   first backfill, where the single text-matched row turned out to be sitting in
   Later at 4 consecutive moves while Asana showed it due 2026-10-30.

   Otherwise insert, setting explicitly:
   - `id` — same format the client generates
   - `type` — `'task'`
   - `order` — **[revised]** computed as `max(order) + 1` among existing rows for
     that `day_key`. The original omitted this; without it every inserted task
     lands at the same position.
   - `text` — stripped name. Strip emojis and decorative characters (`★`, `🟡`,
     `🔷`, `⋆`); keep `•` and `|` only where they read as plain separators.
   - `day_key` — `due_on`, else the LA-local date of `due_at`, else today (LA)
   - `asana_day_key = day_key`, `asana_completed = false`, mirrors set
   - `recurrence = NULL` — Asana owns recurrence
   - **[revised] `notes` is left alone.** The original wrote the permalink into
     it. `notes` is a user-facing field that may already hold Leo's own text,
     especially on the link-to-existing path. The permalink lives only in
     `asana_permalink`.

   **No row, task completed.** Skip.

   **Row exists.**
   - Asana completed, Zenmode not → `completed = true`, `completed_at` from
     Asana, `asana_completed = true`.
   - Asana reopened, Zenmode completed and `asana_completed = true` → reopen,
     `asana_completed = false`.
   - Asana due date changed (against `asana_due_on` / `asana_due_at`) → set
     `day_key`, `asana_day_key`, and the mirrors to the new date. If the due date
     was removed, leave `day_key` where it is.
   - Asana name changed and Zenmode `text` still equals the stripped old
     `asana_name` → update `text`. If Leo edited it locally, leave it (decision 5).

4. **[revised] `updated_at = NOW()` only when `text`, `completed`, or `day_key`
   actually changes.** The original bumped it on every write, including the
   per-row `asana_synced_at` / `asana_sync_error` housekeeping. Combined with the
   5-minute schedule that marks every linked row remote-newer every 5 minutes;
   the realtime subscription then pulls on each write and the merge overwrites
   local state, eating any edit in flight. Metadata-only writes must not bump it.
5. Update `asana_sync_state.last_pull_at`.

**Recurring Asana tasks** (the daily checkin is one): completing creates a new
task with a new gid, which the next pull picks up as new. No special handling.

## 3. Reconcile: hourly, inside `asana-pull`

Reassignment and deletion don't appear in the `assignee=me` query, so check open
linked rows directly.

- For each open row with an `asana_gid`: `GET /tasks/{gid}?opt_fields=assignee,completed,due_on,due_at`.
- 404, or assignee no longer Leo → `is_archived = true`. **Verify that a trashed
  Asana task actually 404s** rather than returning the task with a flag.
- Retry pending pushes: rows where `completed <> asana_completed`, or
  `day_key <> asana_day_key`, or `asana_sync_error` is set. This makes the
  trigger path non-critical — a failed call gets caught within the hour.
- Update `last_reconcile_at`.

## 4. Push: `asana-push` edge function, called by a database trigger

Trigger on `items` UPDATE,
`WHEN (NEW.asana_gid IS NOT NULL AND (OLD.completed IS DISTINCT FROM NEW.completed OR OLD.day_key IS DISTINCT FROM NEW.day_key))`.
Call via `pg_net`.

**[revised] Auth is a dedicated secret, read from Vault.** An earlier draft
reused the service role key, as `auto-move-items` does. Both functions now check
`ASANA_SYNC_SECRET` instead, so triggering a sync does not require the
credential that can read and write every table for every user, and nothing
breaks when the project finishes moving off legacy JWT keys. The trigger reads
the token from `vault.decrypted_secrets`, not inlined into the function body
where anyone who can read `pg_catalog` would see it.

`asana_push_trigger()` must be `SECURITY DEFINER` to read Vault, which also
exposed it at `/rest/v1/rpc/asana_push_trigger`. `EXECUTE` is revoked from
`anon` and `authenticated`; the trigger still fires, because PostgreSQL checks
that privilege when a trigger is created rather than each time it runs.

**[revised] Dry run by default, and every attempt is logged.** `PUSH_DRY_RUN`
must be exactly `'false'` to let anything reach Asana. Each attempt writes to
`asana_push_log` either way — this is the one part of the sync that mutates
state Leo's team depends on, so there is a record of what was sent, separate
from the per-row `asana_sync_error`.

**[revised] The completion note is claimed before it is sent.** Two trigger
invocations can overlap, and a story posted twice to Asana cannot be unposted.
The function sets `completion_note_posted_at` with
`... WHERE completion_note_posted_at IS NULL RETURNING id` and only posts if it
got the row. If the post then fails it releases the claim, so the note is not
silently lost and reconcile can retry.

**The trigger never raises.** It runs inside the user's own write transaction,
so an exception would fail the `UPDATE` the app was performing — turning a sync
problem into data loss. Every failure path warns and returns. A push that never
fires is recovered by reconcile, which looks for rows where `day_key` and
`asana_day_key` disagree.

The function's own writes touch only `asana_*` columns, so they don't re-fire the
trigger. Logic, re-reading the row fresh:

- **Completed in Zenmode** (`completed = true`, `asana_completed = false`):
  1. If `completion_note` is non-empty and `completion_note_posted_at` is null →
     `POST /tasks/{gid}/stories` with `{"data": {"text": <note>}}`, then set
     `completion_note_posted_at = NOW()`.
  2. `PUT /tasks/{gid}` with `{"data": {"completed": true}}`.
  3. Set `asana_completed = true`, `asana_synced_at`.

  The note goes first so Diana and Amanda see them together.
- **Uncompleted in Zenmode** (`completed = false`, `asana_completed = true`):
  `PUT completed: false`, set `asana_completed = false`.
- **Date moved by Leo** (`day_key <> asana_day_key` AND `is_later = false`):
  if the task is timed, `PUT due_at` with the same LA-local time on the new date;
  otherwise `PUT due_on = day_key`. Then set `asana_day_key = day_key` and update
  `asana_due_on` / `asana_due_at`.
- **Moved to Later** (`is_later = true`): don't touch Asana (decision 6).
- **On any Asana error**: write `asana_sync_error`, leave the mirrors unchanged
  so reconcile retries.

## 5. Rollover

Zenmode rolls unfinished tasks forward. If rollovers pushed to Asana, every
overdue task would silently get a new due date each day and the team would lose
sight of what's late. **Rollovers must not push.**

**[revised] There are two rollover implementations, not one:**

- `autoMoveIncompleteItems` in `src/store/usePlannerStore.ts:745` — client-side,
  web only, gated on `autoAdvanceEnabled`
- `supabase/functions/auto-move-items/index.ts` — hourly, per-user timezone

Mobile has neither and relies on the server one.

**[revised] The server rollover cannot simply take over linked rows.** It skips
any user whose `user_preferences.last_auto_move_date` already equals today, and
the web client stamps exactly that field in its own rollover and pushes it
(`src/lib/sync.ts:535`). So on any day Leo opens the web app, the client rolls
first, stamps the date, and the server skips him for the rest of the day. The
first draft of this plan had the client skip linked rows and the server handle
them, which would have left linked rows rolled by nobody, every day.

What is implemented instead:

- **`computeAutoMove` takes an `onlyLinked` flag.** When the daily guard says
  the user has already been processed, a cheap indexed `HEAD` count checks
  whether they have any past-due linked rows; if so the function runs again in
  `onlyLinked` mode, which narrows the move set to rows with an `asana_gid` and
  skips the recurring-dedup and stale-priority passes so nothing else is touched
  on an already-stamped day. A linked-only run does not re-stamp
  `last_auto_move_date`, so the general rollover still gets its own pass.
- **Both move branches advance `asana_day_key` in the same `UPDATE` as
  `day_key`** — `todayKey` on the move-to-today branch, `null` on the
  escalate-to-Later branch. There is no window in which the two disagree, so
  the trigger fires and `asana-push` finds nothing to do.
- **The client rollover skips rows with an `asana_gid`** (still to do, with the
  rest of the client work). That is what keeps the client from ever writing an
  `asana_*` column.
- A user move therefore leaves `day_key <> asana_day_key`, which is the push
  signal. It fails safe: a missed push is fixed by moving the task again.

Rejected alternative: giving the client `asana_day_key` write access. Less code,
but it flips the failure direction — a `dayKey` write path that forgets the
mirror produces a *spurious* push, which changes a deadline the team is
watching. Avoiding that class of bug is why `day_key_changed_by` was dropped in
the first place.

Ordering note: the linked pass runs before the general one within a user's turn,
so once a linked row has moved to today it no longer matches
`day_key < todayKey` and cannot be moved or counted twice. `consecutive_moves`
still increments at most once per day.

Two things this costs, both accepted:

- A linked overdue task can sit on yesterday for up to an hour before the server
  rolls it.
- `consecutive_moves` still reaches 4 and escalates a linked task to Later,
  where it stops pushing while Asana keeps the original due date. Surface
  escalated synced tasks in the UI so they don't fall out of sight in both
  systems at once.

**Confirmed, and pre-existing:** `auto-move-items` filters users only on having
a timezone set — it never consults `autoAdvanceEnabled`. A user who turns auto
advance off in settings still gets server-side rollover. Not introduced by this
work and not fixed by it, but it is why the client-side skip above cannot be the
whole story.

**Blast radius:** `auto-move-items` runs for 274 users. The change is inert
while no row has an `asana_gid` — which was true at deploy time — and for an
already-processed user the only new cost is one index-backed count query per run.

## 6. App UI (web)

- **Completion note.** Checking off a task with an `asana_gid` shows an optional
  inline note field. Enter completes with the note; Esc or an empty field
  completes without one. Write `completion_note` and `completed = true` in **one
  store update**, so the single debounced upsert carries both and the push sees
  the note.
- **Asana indicator.** Small link icon on synced tasks, opening `asana_permalink`.
- **Sync error.** When `asana_sync_error` is set, a subtle warning on the task
  with the error on hover.
- **Escalation.** Mark a synced task that has escalated to Later, per Rollover.

Every one of these is conditional on `item.asanaGid`.

## 7. Skills

**[revised] New section.** `daily-tasks` and `weekly-zenmode-sync` currently
insert Asana tasks into Zenmode as unlinked rows — that is where the existing
copies the first run has to link came from. Left alone they would keep creating
duplicates of tasks the sync has already placed.

- Remove the Asana→Zenmode insert step from both skills. The sync owns it.
- Keep their calendar-event insertion and the end-of-day Asana comment.
- Remove "What did you work on today?" from the standing exclusions, since the
  sync now places it (decision 3). Leave the other exclusions, which are
  calendar-side.
- Both skills can read `asana_sync_state.last_pull_at` to confirm the sync is
  live before assuming a task will appear on its own.

## 8. Secrets

- `ASANA_PAT` — Supabase Edge Function secret. **Leo sets this himself.** Never
  logged, never in the repo.
- `ASANA_SYNC_USER_ID` — Leo's `user_id`, as a secret rather than a committed
  email lookup.
- No trigger secret; the service role key pattern from `auto-move-items` is reused.

## 9. Rollout

1. ~~Apply the migration. Run `get_advisors`.~~ **Done.** 11 columns, 2 tables,
   RLS and owner-read policies, gid index, 3 seeded exclusions. Advisors clean.
2. ~~Deploy `asana-pull` with a `DRY_RUN` flag.~~ **Deployed**, dry run on by
   default (writing requires `DRY_RUN='false'` exactly). Not scheduled; it runs
   only when invoked. Blocked on `ASANA_PAT` and `ASANA_SYNC_USER_ID` before it
   can reach Asana.
3. ~~Server-side rollover pass for linked rows.~~ **Deployed.** Inert until the
   first row is linked.
4. ~~Run the dry run.~~ **Done.** 100 Asana tasks over 1 page, verified by
   re-running at `limit=50`, which walked 2 pages for the same 100. 91 inserts,
   1 link, 3 refused as ambiguous, 2 inserts flagged as probable duplicates.
5. ~~Run for real.~~ **Done 2026-10-24.** 91 rows written, 0 errors, 66 on
   today. Verified: 91 distinct gids, 0 rows for any other user, `notes` empty
   on all 91, no `recurrence` set, and an immediate re-run wrote nothing, so the
   `updated_at` discipline holds. `DRY_RUN=false` is now set permanently, and
   `%FM Business%Weekly call%` was added to the exclusions before the run.
6. Ship the client changes: the rollover skip first, then the UI. The rollover
   skip must land **before** date pushes are enabled.
7. ~~Deploy `asana-push` and the trigger.~~ **Done, in dry run.** Verified end
   to end: an `UPDATE` to a linked row's `day_key` fires the trigger, reaches
   the function through pg_net, and logs the computed Asana call
   (`{"due_on": "..."}`) without sending it. Re-verified as the `authenticated`
   role with `request.jwt.claims` set, after the `EXECUTE` revoke, since that is
   the role the app actually writes as. Still to do: set `PUSH_DRY_RUN=false`,
   and add reconcile's push-retry half.
8. Add the pg_cron schedule for `asana-pull`. **Do not authenticate it with
   `current_setting('supabase.service_role_key')`** -- that parameter does not
   exist on this project, and a cron job using it fails in Postgres before the
   HTTP call is made, silently, forever. A duplicate `auto-move-items` job did
   exactly that for an unknown length of time (removed 2026-10-24). `asana-pull`
   authenticates on `ASANA_SYNC_SECRET` instead, which the cron command can
   carry directly or read from Vault.
9. Update the two skills.

## 10. Test plan

- [ ] Assigned with due date → appears in Zenmode on that date within 5 min
- [ ] Assigned with no due date → appears today
- [ ] Due date changed in Asana → moves in Zenmode
- [ ] Moved in Zenmode → Asana due date changes; a timed task keeps its time
- [ ] Rollover overnight → Asana due date unchanged, no push fired
- [ ] Moved to Later → Asana unchanged
- [ ] Checked off with a note → comment appears in Asana, then the task completes
- [ ] Checked off without a note → completes, no comment
- [ ] Unchecked → reopens in Asana
- [ ] Completed in Asana → checked off in Zenmode
- [ ] Renamed in Asana → renamed in Zenmode; not renamed if edited locally
- [ ] Reassigned away or deleted → archived in Zenmode
- [ ] Excluded names never appear
- [ ] Daily checkin appears daily; checking it off with a note posts and completes it
- [ ] Simulated Asana failure → error shown, reconcile retries successfully
- [ ] A linked row's `asana_*` columns survive a client-side edit of that task
- [ ] Five minutes of idle pulls produce no `updated_at` churn on linked rows
- [ ] A move made on mobile pushes to Asana with no mobile code changes
- [ ] No rows for any other user touched
