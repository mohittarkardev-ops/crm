-- =====================================================================
-- SecureDrive - 0011_placements_db_now.sql
-- Provides Postgres `now()` as an authenticated RPC so CRM placement status
-- matches mobile RLS (`starts_at <= now()` and `ends_at > now()`) without host clock drift.
-- Safe to re-run (idempotent).
-- =====================================================================

begin;

create or replace function public.get_db_now()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select now();
$$;

revoke execute on function public.get_db_now() from public, anon;
grant execute on function public.get_db_now() to authenticated, service_role;

commit;
