-- =====================================================================
-- SecureDrive - 0014_claims_doc_and_incentives.sql
-- Adds:
--   1. Policy document attachment fields on public.claims (document_path, document_type)
--      + aligned Storage/policy_documents RLS so claims staff can stage documents and
--      reviewers can publish them to the customer's policy on Approve.
--   2. Configurable vehicle-type Incentive Rules (2W, 4W, CV), working days,
--      slabs, monthly minimum qualification threshold, daily forfeit/bonus,
--      and non-working holiday exclusions.
--   3. New RBAC permissions: incentives.view (seeded to Staff) & incentives.manage (Admin-only).
-- Safe to re-run (idempotent). Runs in one transaction.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Claim policy document attachment columns
-- ---------------------------------------------------------------------
alter table public.claims
  add column if not exists document_path text,
  add column if not exists document_type text;

comment on column public.claims.document_path is 'Temporary claims/{claim_id}/... path while pending, or final published {user_id}/{policy_id}/... path in DOCUMENTS bucket.';
comment on column public.claims.document_type is 'Document category label (e.g. Policy copy) copied into policy_documents on approval.';

-- ---------------------------------------------------------------------
-- 2. Extend Claims, Policy Documents & DOCUMENTS storage RLS for claim docs & incentives
-- ---------------------------------------------------------------------
drop policy if exists claims_staff_select on public.claims;
create policy claims_staff_select on public.claims
  for select to authenticated
  using (
    (select public.has_permission('claims.view'))
    or (select public.has_permission('claims.create'))
    or (select public.has_permission('claims.approve'))
    or (select public.has_permission('incentives.manage'))
    or (
      (select public.has_permission('incentives.view'))
      and staff_id = (
        select su.id
        from public.staff_users su
        where su.auth_user_id = auth.uid()
        limit 1
      )
    )
  );

drop policy if exists policies_staff_select on public.policies;
create policy policies_staff_select on public.policies
  for select to authenticated
  using (
    (select public.has_permission('policies.view'))
    or (select public.has_permission('policies.edit'))
    or (select public.has_permission('policies.verify'))
    or (select public.has_permission('dashboard.view'))
    or (select public.has_permission('renewals.view'))
    or (select public.has_permission('reports.view'))
    or (select public.has_permission('datagrid.view'))
    or (select public.has_permission('import.lookup'))
    or (select public.has_permission('import.import'))
    or (select public.has_permission('quotes.view'))
    or (select public.has_permission('claims.view'))
    or (select public.has_permission('claims.create'))
    or (select public.has_permission('claims.approve'))
    or (select public.has_permission('incentives.view'))
    or (select public.has_permission('incentives.manage'))
  );

drop policy if exists policy_documents_staff_select on public.policy_documents;
create policy policy_documents_staff_select on public.policy_documents
  for select to authenticated
  using (
    (select public.has_permission('policies.view'))
    or (select public.has_permission('quotes.view'))
    or (select public.has_permission('claims.view'))
    or (select public.has_permission('claims.approve'))
  );

drop policy if exists policy_documents_staff_insert on public.policy_documents;
create policy policy_documents_staff_insert on public.policy_documents
  for insert to authenticated
  with check (
    (select public.has_permission('policies.create'))
    or (select public.has_permission('policies.edit'))
    or (select public.has_permission('claims.approve'))
  );

drop policy if exists documents_staff_select on storage.objects;
create policy documents_staff_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'DOCUMENTS'
    and (
      (select public.has_permission('policies.view'))
      or (select public.has_permission('quotes.view'))
      or (select public.has_permission('claims.view'))
      or (select public.has_permission('claims.create'))
      or (select public.has_permission('claims.approve'))
    )
  );

drop policy if exists documents_staff_insert on storage.objects;
create policy documents_staff_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'DOCUMENTS'
    and (
      (select public.has_permission('policies.create'))
      or (select public.has_permission('policies.edit'))
      or (select public.has_permission('claims.create'))
      or (select public.has_permission('claims.approve'))
    )
  );

drop policy if exists documents_staff_update on storage.objects;
create policy documents_staff_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'DOCUMENTS'
    and (
      (select public.has_permission('policies.edit'))
      or (select public.has_permission('claims.approve'))
    )
  )
  with check (
    bucket_id = 'DOCUMENTS'
    and (
      (select public.has_permission('policies.edit'))
      or (select public.has_permission('claims.approve'))
    )
  );

drop policy if exists documents_staff_delete on storage.objects;
create policy documents_staff_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'DOCUMENTS'
    and (
      (select public.has_permission('policies.edit'))
      or (select public.has_permission('policies.delete'))
      or (select public.has_permission('claims.create'))
      or (select public.has_permission('claims.approve'))
    )
  );

-- ---------------------------------------------------------------------
-- 3. Incentive Rules & Holidays tables
-- ---------------------------------------------------------------------
create table if not exists public.incentive_rules (
  vehicle_category     text primary key check (vehicle_category in ('2W', '4W', 'CV')),
  is_active            boolean not null default true,
  payout_mode          text not null default 'flat_slab' check (payout_mode in ('flat_slab', 'per_payment', 'per_bundle')),
  monthly_min_payments integer not null default 60 check (monthly_min_payments >= 0 and monthly_min_payments <= 10000),
  daily_target         integer not null default 2 check (daily_target >= 0 and daily_target <= 500),
  daily_bonus_amount   numeric not null default 0 check (daily_bonus_amount >= 0),
  daily_forfeit_amount numeric not null default 50 check (daily_forfeit_amount >= 0),
  working_days         integer[] not null default '{1,2,3,4,5,6}',
  slabs                jsonb not null default '[]'::jsonb,
  updated_by           uuid references public.staff_users (id) on delete set null,
  updated_at           timestamptz not null default now()
);

drop trigger if exists incentive_rules_set_updated_at on public.incentive_rules;
create trigger incentive_rules_set_updated_at before update on public.incentive_rules
  for each row execute function public.set_updated_at();

create table if not exists public.incentive_holidays (
  holiday_date date primary key,
  label        text not null,
  created_by   uuid references public.staff_users (id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.incentive_rules    enable row level security;
alter table public.incentive_holidays enable row level security;

revoke all on public.incentive_rules    from anon;
revoke all on public.incentive_holidays from anon;

drop policy if exists incentive_rules_staff_select on public.incentive_rules;
create policy incentive_rules_staff_select on public.incentive_rules
  for select to authenticated
  using (
    (select public.has_permission('incentives.view'))
    or (select public.has_permission('incentives.manage'))
  );

drop policy if exists incentive_rules_admin_write on public.incentive_rules;
create policy incentive_rules_admin_write on public.incentive_rules
  for all to authenticated
  using ((select public.has_permission('incentives.manage')))
  with check ((select public.has_permission('incentives.manage')));

drop policy if exists incentive_holidays_staff_select on public.incentive_holidays;
create policy incentive_holidays_staff_select on public.incentive_holidays
  for select to authenticated
  using (
    (select public.has_permission('incentives.view'))
    or (select public.has_permission('incentives.manage'))
  );

drop policy if exists incentive_holidays_admin_write on public.incentive_holidays;
create policy incentive_holidays_admin_write on public.incentive_holidays
  for all to authenticated
  using ((select public.has_permission('incentives.manage')))
  with check ((select public.has_permission('incentives.manage')));

-- Starter defaults per vehicle type (Admin can edit anytime in /incentives)
insert into public.incentive_rules (
  vehicle_category, is_active, payout_mode, monthly_min_payments,
  daily_target, daily_bonus_amount, daily_forfeit_amount, working_days, slabs
)
values
  (
    '2W', true, 'flat_slab', 60, 2, 0, 50, '{1,2,3,4,5,6}',
    '[{"minPayments":20,"amount":100},{"minPayments":40,"amount":250},{"minPayments":60,"amount":500}]'::jsonb
  ),
  (
    '4W', true, 'flat_slab', 30, 1, 0, 75, '{1,2,3,4,5,6}',
    '[{"minPayments":15,"amount":200},{"minPayments":30,"amount":500},{"minPayments":45,"amount":900}]'::jsonb
  ),
  (
    'CV', true, 'flat_slab', 20, 1, 0, 100, '{1,2,3,4,5,6}',
    '[{"minPayments":10,"amount":300},{"minPayments":20,"amount":750},{"minPayments":35,"amount":1500}]'::jsonb
  )
on conflict (vehicle_category) do nothing;

-- ---------------------------------------------------------------------
-- 4. Seed incentives.view to Staff system role (incentives.manage stays Admin-only)
-- ---------------------------------------------------------------------
do $$
declare
  v_staff_role_id uuid;
begin
  select id into v_staff_role_id from public.roles where name = 'Staff';
  if v_staff_role_id is not null then
    insert into public.role_permissions (role_id, permission)
    values (v_staff_role_id, 'incentives.view')
    on conflict (role_id, permission) do nothing;
  end if;
end $$;

commit;
