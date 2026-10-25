-- An archived task must not push anything to Asana.
--
-- Neither rollover excludes archived rows, so on 2026-10-25 the overnight
-- rollover moved 66 archived linked rows forward, diverged day_key from
-- asana_day_key on each, and the trigger read that as deliberate rescheduling.
-- 19 Asana tasks that had deliberately had no due date for months or years were
-- given a due date of "today" in front of the team. This guard alone would have
-- stopped all 19.
--
-- It is also just correct: archiving a task in Zenmode says "stop showing me
-- this", which is not a statement about its deadline in Asana.

DROP TRIGGER IF EXISTS items_asana_push ON items;

CREATE TRIGGER items_asana_push
AFTER UPDATE ON items
FOR EACH ROW
WHEN (
  NEW.asana_gid IS NOT NULL
  AND COALESCE(NEW.is_archived, false) = false
  AND (
    OLD.completed IS DISTINCT FROM NEW.completed
    OR OLD.day_key IS DISTINCT FROM NEW.day_key
  )
)
EXECUTE FUNCTION public.asana_push_trigger();
