-- =====================================================================
-- SecureDrive - 0022_claim_policy_fields_and_history.sql
-- Adds:
--   1. New claim submission fields on public.claims for the /claim portal
--      (policy_number, insurer_name, vehicle_make, vehicle_model, idv, due_date).
--   2. Annual due-date & policy renewal snapshot columns on public.renewals
--      so approving a renewal claim preserves prior due dates as a timeline.
--   3. Allows claims.approve reviewers to update policies & insert renewal
--      history rows during claim approval.
-- Safe to re-run (idempotent). Runs in one transaction.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Extend public.claims with policy/vehicle/due_date fields
-- ---------------------------------------------------------------------
alter table public.claims
  add column if not exists policy_number text,
  add column if not exists insurer_name text,
  add column if not exists vehicle_make text,
  add column if not exists vehicle_model text,
  add column if not exists idv numeric,
  add column if not exists due_date date;

update public.claims
set due_date = saod_due_date
where due_date is null
  and saod_due_date is not null;

comment on column public.claims.policy_number is 'Policy number submitted by agent for new or renewed vehicle claim.';
comment on column public.claims.insurer_name is 'Insurer selected or entered by agent on claim submission.';
comment on column public.claims.vehicle_make is 'Vehicle make submitted when vehicle is not yet in policies.';
comment on column public.claims.vehicle_model is 'Vehicle model submitted when vehicle is not yet in policies.';
comment on column public.claims.idv is 'Insured Declared Value (IDV) submitted on claim.';
comment on column public.claims.due_date is 'Policy due date (new due date for renewals, initial due date for new vehicles).';

-- ---------------------------------------------------------------------
-- 2. Extend public.renewals to preserve policy history / due-date timeline
-- ---------------------------------------------------------------------
alter table public.renewals
  add column if not exists previous_due_date date,
  add column if not exists new_due_date date,
  add column if not exists previous_policy_number text,
  add column if not exists new_policy_number text,
  add column if not exists previous_insurer_name text,
  add column if not exists new_insurer_name text,
  add column if not exists premium_amount numeric,
  add column if not exists claim_id uuid references public.claims (id) on delete set null,
  add column if not exists notes text;

create index if not exists idx_renewals_policy_created on public.renewals (policy_id, created_at desc);

comment on column public.renewals.previous_due_date is 'Previous policy due date preserved before updating the policy on renewal.';
comment on column public.renewals.new_due_date is 'Updated policy due date recorded for this renewal cycle.';

-- ---------------------------------------------------------------------
-- 3. RLS: allow claims.approve reviewers to update existing policy on
--    approval and record the preserved due-date renewal history row.
-- ---------------------------------------------------------------------
drop policy if exists policies_staff_update on public.policies;
create policy policies_staff_update on public.policies
  for update to authenticated
  using (
    (select public.has_permission('policies.edit'))
    or (select public.has_permission('policies.verify'))
    or (select public.has_permission('datagrid.edit'))
    or (select public.has_permission('import.import'))
    or (select public.has_permission('claims.approve'))
  )
  with check (
    (select public.has_permission('policies.edit'))
    or (select public.has_permission('policies.verify'))
    or (select public.has_permission('datagrid.edit'))
    or (select public.has_permission('import.import'))
    or (select public.has_permission('claims.approve'))
  );

drop policy if exists renewals_staff_insert on public.renewals;
create policy renewals_staff_insert on public.renewals
  for insert to authenticated
  with check (
    (select public.has_permission('renewals.update'))
    or (select public.has_permission('claims.approve'))
  );

commit;
