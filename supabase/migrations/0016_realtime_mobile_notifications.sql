-- 0016_realtime_mobile_notifications.sql
-- Extends Supabase Realtime publication to `notifications` and `policy_documents`
-- so the mobile app updates live when CRM sends alerts, rejects policies, or publishes claim documents.
-- RLS still filters events per authenticated user. Safe to run more than once.

do $$
declare
  t text;
begin
  foreach t in array array['notifications', 'policy_documents'] loop
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
