-- 0004_crm_realtime.sql
-- Live CRM notifications: lets the CRM bell hear about new rows the moment the mobile app creates them.
-- Realtime still respects row level security, so only CRM staff (and each user for their own rows) receive events.
-- Safe to run more than once.

do $$
declare
  t text;
begin
  foreach t in array array['quote_requests', 'support_tickets', 'policies', 'users'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
