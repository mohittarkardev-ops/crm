-- =====================================================================
-- SecureDrive - 0008_crm_integration_fixes.sql
-- Slice S2 of CRM_INTEGRATION_PLAN_v2.md. This is a FORWARD FIX of 0007 (which has already been run).
-- Do not edit 0007; run this file once, after a backup:
--   Supabase > SQL Editor > New query > paste all > Run.
-- Safe to re-run (idempotent). Everything runs in ONE transaction: if any statement fails, nothing is applied.
--
-- What this does
--   1. Security: the two reporting views and the new tables are no longer readable by anonymous callers.
--   2. Roles: removes 'superadmin' again (decision D10: only admin and staff for now).
--   3. staff_users: email becomes optional so agents who never log in can be stored (D4), legacy_id added.
--   4. policies: custom_data, legacy_id, import_batch_id, pin_2; duplicate columns from 0007 removed;
--      policy_number becomes optional (D2); vehicle_category limited to 2W / 4W / CV; trigram indexes fixed.
--   5. claims: payment modes match the old data (GPay(UPI)), broken triggers replaced by a unique index
--      (one open claim per vehicle), vehicle_category + legacy_id added, row-level rules use is_staff().
--   6. grid_columns: row-level rules use is_staff() / is_admin().
--   7. import_batches: one row per import or migration run, so a whole run can be found and undone.
--
-- Nothing here changes the mobile app or the current CRM screens.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Security
-- ---------------------------------------------------------------------
-- Views in the public schema run with their owner's rights unless told otherwise, which skips row-level security.
alter view public.claims_with_details set (security_invoker = true);
alter view public.staff_performance   set (security_invoker = true);

-- 0002 removed anonymous access to the tables that existed then; do the same for everything added since.
revoke all on public.claims_with_details from anon;
revoke all on public.staff_performance   from anon;
revoke all on public.claims              from anon;
revoke all on public.grid_columns        from anon;

-- Tables created from now on do not hand anonymous callers access by default.
alter default privileges in schema public revoke all on tables from anon;

-- ---------------------------------------------------------------------
-- 2. Roles: admin and staff only
-- ---------------------------------------------------------------------
update public.staff_users set role = 'admin' where role = 'superadmin';

alter table public.staff_users drop constraint if exists staff_users_role_check;
alter table public.staff_users
  add constraint staff_users_role_check check (role in ('admin', 'staff'));

-- ---------------------------------------------------------------------
-- 3. staff_users
-- ---------------------------------------------------------------------
-- Agents who never log in have no email and no auth account (auth_user_id stays empty for them).
alter table public.staff_users alter column email drop not null;

alter table public.staff_users add column if not exists legacy_id bigint;
create unique index if not exists staff_users_legacy_id_key
  on public.staff_users (legacy_id) where legacy_id is not null;

-- Use the shared updated_at function (0007 reused a staff-specific one for the claims table as well).
drop trigger if exists staff_users_updated_at on public.staff_users;
drop trigger if exists staff_users_set_updated_at on public.staff_users;
create trigger staff_users_set_updated_at before update on public.staff_users
  for each row execute function public.set_updated_at();

drop trigger if exists claims_updated_at on public.claims;
drop trigger if exists claims_set_updated_at on public.claims;
create trigger claims_set_updated_at before update on public.claims
  for each row execute function public.set_updated_at();

drop function if exists public.update_staff_users_updated_at();

comment on column public.staff_users.email is 'Login email. Empty for agents who never log in (auth_user_id is empty too).';
comment on column public.staff_users.legacy_id is 'Id of this person in the old Insurance Manager CRM (employees.id).';

-- ---------------------------------------------------------------------
-- 4. import_batches (created before the columns that point at it)
-- ---------------------------------------------------------------------
create table if not exists public.import_batches (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('legacy_migration', 'import')),
  file_name     text,
  total_rows    integer not null default 0,
  inserted_rows integer not null default 0,
  updated_rows  integer not null default 0,
  skipped_rows  integer not null default 0,
  status        text not null default 'running' check (status in ('running', 'done', 'failed', 'undone')),
  notes         text,
  created_by    uuid references public.staff_users (id) on delete set null,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);

create index if not exists import_batches_created_idx on public.import_batches (created_at desc);

alter table public.import_batches enable row level security;
revoke all on public.import_batches from anon;

drop policy if exists import_batches_staff_select on public.import_batches;
create policy import_batches_staff_select on public.import_batches
  for select to authenticated using ((select public.is_staff()));
drop policy if exists import_batches_staff_insert on public.import_batches;
create policy import_batches_staff_insert on public.import_batches
  for insert to authenticated with check ((select public.is_staff()));
drop policy if exists import_batches_staff_update on public.import_batches;
create policy import_batches_staff_update on public.import_batches
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists import_batches_admin_delete on public.import_batches;
create policy import_batches_admin_delete on public.import_batches
  for delete to authenticated using ((select public.is_admin()));

comment on table public.import_batches is 'One row per bulk import or legacy migration run. Rows it created carry its id in import_batch_id.';

alter table public.users
  add column if not exists import_batch_id uuid references public.import_batches (id) on delete set null;

-- ---------------------------------------------------------------------
-- 5. policies
-- ---------------------------------------------------------------------
-- 0007 added columns that duplicate ones that already exist. Keep any value they hold, then remove them.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'policies' and column_name = 'permanent_address') then
    execute 'update public.policies set holder_address = permanent_address where holder_address is null and permanent_address is not null';
    execute 'alter table public.policies drop column permanent_address';
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'policies' and column_name = 'insurance_company_name') then
    execute 'update public.policies set insurer_name = insurance_company_name where insurer_name is null and insurance_company_name is not null';
    execute 'alter table public.policies drop column insurance_company_name';
  end if;

  -- The old CRM calls this column pin_2; use the same name so the import maps one to one.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'policies' and column_name = 'pin2')
     and not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'policies' and column_name = 'pin_2') then
    execute 'alter table public.policies rename column pin2 to pin_2';
  end if;
end $$;

alter table public.policies
  add column if not exists pin_2           text,
  add column if not exists custom_data     jsonb not null default '{}'::jsonb,
  add column if not exists legacy_id       bigint,
  add column if not exists import_batch_id uuid references public.import_batches (id) on delete set null;

-- Old rows may have no policy number (decision D2). New policies added in the CRM and the app still require one.
alter table public.policies alter column policy_number drop not null;

-- vehicle_category: only the old CRM's three groups, and empty for health, term and other policies.
alter table public.policies alter column vehicle_category drop default;
update public.policies set vehicle_category = null where vehicle_category is not null and vehicle_category not in ('2W', '4W', 'CV');
alter table public.policies drop constraint if exists policies_vehicle_category_check;
alter table public.policies
  add constraint policies_vehicle_category_check check (vehicle_category is null or vehicle_category in ('2W', '4W', 'CV'));

create unique index if not exists policies_legacy_id_key on public.policies (legacy_id) where legacy_id is not null;
create index if not exists idx_policies_import_batch on public.policies (import_batch_id) where import_batch_id is not null;

-- Search: a trigram index must be on the plain column for "ilike" (what the CRM sends) to use it.
create extension if not exists pg_trgm;
drop index if exists public.idx_policies_owner_name_trgm;
drop index if exists public.idx_policies_vehicle_reg_trgm;
create index if not exists idx_policies_owner_name_trgm      on public.policies using gin (owner_name gin_trgm_ops);
create index if not exists idx_policies_vehicle_reg_trgm     on public.policies using gin (vehicle_reg_no gin_trgm_ops);
create index if not exists idx_policies_policy_number_trgm   on public.policies using gin (policy_number gin_trgm_ops);
create index if not exists idx_policies_holder_mobile_trgm   on public.policies using gin (holder_mobile gin_trgm_ops);

comment on column public.policies.policy_number    is 'Empty only for rows migrated from the old CRM that never had one.';
comment on column public.policies.vehicle_category is '2W, 4W or CV (from the old CRM). Empty for non-vehicle policies. The policy type (car / bike / other) is separate.';
comment on column public.policies.pin_2            is 'Second PIN, used mainly for two wheelers (old CRM pin_2).';
comment on column public.policies.custom_data      is 'Values of the extra columns defined in grid_columns, keyed by accessor_key.';
comment on column public.policies.legacy_id        is 'Id of this row in the old Insurance Manager CRM (policies.id).';
comment on column public.policies.import_batch_id  is 'The import or migration run that created this row.';
comment on column public.policies.saod_due_date    is 'Own-damage due date. due_date (the renewal date used by reminders) is the earlier of this and tp_due_date.';

-- ---------------------------------------------------------------------
-- 6. claims
-- ---------------------------------------------------------------------
-- Payment modes as the old CRM stores them.
alter table public.claims drop constraint if exists claims_payment_mode_check;
update public.claims set payment_mode = 'GPay(UPI)' where payment_mode in ('GPay', 'UPI');
alter table public.claims
  add constraint claims_payment_mode_check check (payment_mode in ('Online', 'NEFT', 'Cheque', 'GPay(UPI)', 'Cash'));

alter table public.claims
  add column if not exists vehicle_category text,
  add column if not exists legacy_id        bigint;

alter table public.claims drop constraint if exists claims_vehicle_category_check;
alter table public.claims
  add constraint claims_vehicle_category_check check (vehicle_category is null or vehicle_category in ('2W', '4W', 'CV'));

create unique index if not exists claims_legacy_id_key on public.claims (legacy_id) where legacy_id is not null;

-- The two triggers from 0007 are replaced:
--  * auto_create_policy_trigger inserted a policy with no client and failed when the due date was empty.
--    Approving a claim will be done by the CRM, which finds or creates the client first.
--  * check_duplicate_claim only blocked the same vehicle on the same day. The rule is one open claim per vehicle.
drop trigger if exists auto_create_policy_trigger on public.claims;
drop trigger if exists check_duplicate_claim_trigger on public.claims;
drop function if exists public.auto_create_policy_from_claim();
drop function if exists public.check_duplicate_claim();

do $$
begin
  create unique index if not exists claims_one_open_per_vehicle
    on public.claims (upper(regexp_replace(vehicle_reg_no, '\s', '', 'g')))
    where status <> 'rejected';
exception when unique_violation then
  raise notice 'Some existing claims share a vehicle. Reject or delete the extras, then create index claims_one_open_per_vehicle again.';
end $$;

-- Row-level rules: the same helpers every other table uses.
drop policy if exists "Staff can view all claims" on public.claims;
drop policy if exists "Staff can insert claims"   on public.claims;
drop policy if exists "Staff can update claims"   on public.claims;
drop policy if exists claims_staff_select on public.claims;
drop policy if exists claims_staff_insert on public.claims;
drop policy if exists claims_staff_update on public.claims;
drop policy if exists claims_admin_delete on public.claims;

create policy claims_staff_select on public.claims
  for select to authenticated using ((select public.is_staff()));
create policy claims_staff_insert on public.claims
  for insert to authenticated with check ((select public.is_staff()));
create policy claims_staff_update on public.claims
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy claims_admin_delete on public.claims
  for delete to authenticated using ((select public.is_admin()));

comment on column public.claims.vehicle_category is 'Needed to create the policy when an unknown vehicle claim is approved.';
comment on column public.claims.legacy_id        is 'Id of this claim in the old Insurance Manager CRM (claims.id).';

-- ---------------------------------------------------------------------
-- 7. grid_columns (extra columns of the data grid; custom fields screen comes later)
-- ---------------------------------------------------------------------
drop policy if exists "Staff can view grid columns" on public.grid_columns;
drop policy if exists "Admin can manage grid columns" on public.grid_columns;
drop policy if exists grid_columns_staff_select on public.grid_columns;
drop policy if exists grid_columns_admin_write on public.grid_columns;

create policy grid_columns_staff_select on public.grid_columns
  for select to authenticated using ((select public.is_staff()));
create policy grid_columns_admin_write on public.grid_columns
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

commit;

-- ---------------------------------------------------------------------
-- AFTER RUNNING: this must return NO rows (anonymous callers must not have any table access).
-- ---------------------------------------------------------------------
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public';
