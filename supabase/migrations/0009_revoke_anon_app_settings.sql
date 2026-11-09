-- =====================================================================
-- SecureDrive - 0009_revoke_anon_app_settings.sql
-- After 0008, the check query at the end of that file listed one table that anonymous callers still have grants on:
-- app_settings (created by 0005, after 0002 had removed anonymous access). Row-level security already hid its rows
-- from anonymous callers, so no data was exposed, but they should not have any table access at all.
--
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- =====================================================================

begin;

revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

commit;

-- This must now return NO rows.
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public';
