-- asana_push_trigger() has to be SECURITY DEFINER: it reads
-- vault.decrypted_secrets, which the `authenticated` role cannot. But living in
-- the `public` schema also exposed it at /rest/v1/rpc/asana_push_trigger for
-- anon and authenticated, which get_advisors flagged (lints 0028 and 0029).
--
-- Revoking EXECUTE closes that without affecting the trigger: PostgreSQL checks
-- EXECUTE on a trigger function when the trigger is created, not each time it
-- fires, so items_asana_push keeps working for ordinary app writes. Verified by
-- updating a linked row as `authenticated` with request.jwt.claims set, after
-- the revoke, and confirming the push still reached asana_push_log.
REVOKE EXECUTE ON FUNCTION public.asana_push_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.asana_push_trigger() FROM anon;
REVOKE EXECUTE ON FUNCTION public.asana_push_trigger() FROM authenticated;
