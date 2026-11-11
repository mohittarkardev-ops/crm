-- =====================================================================
-- SecureDrive - 0015_full_incentive_engine.sql
-- Full Agent Incentive Management System (per Functional Proposal V1.0):
--   * Standardized Indian PIN Code Directory (`pincode_directory`)
--   * Historical Agent Assignments (`incentive_agent_assignments`)
--   * Multi-rule State/Vehicle Configuration + Versions + Slabs
--     (`incentive_rules`, `incentive_rule_versions`, `incentive_slabs`)
--   * Admin Policy Settings (`incentive_settings`)
--   * Incentive Periods & Working Holidays (`incentive_periods`, `incentive_holidays`)
--   * Traceable Daily & Claim Ledger (`agent_incentive_ledger`, `agent_daily_performance`)
--   * Monthly Qualification & Settlement Lifecycle (`agent_monthly_incentives`, `incentive_settlements`)
--   * Partial & Full Payouts (`incentive_payouts`), Manual Adjustments (`incentive_adjustments`),
--     and Immutable Security/Override Audit Trail (`incentive_audit_logs`)
--   * Claim PIN/State capture columns (`claims.customer_pincode`, `claims.customer_state`)
--   * Backward-compatible upgrade whether 0014 ran previously or not.
-- Safe to re-run (idempotent). Runs in one transaction.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Helper: resolve current authenticated staff_users.id cleanly
-- ---------------------------------------------------------------------
create or replace function public.my_staff_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.staff_users
  where auth_user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.my_staff_id() from public, anon;
grant execute on function public.my_staff_id() to authenticated;

-- ---------------------------------------------------------------------
-- 1. Extend policies & claims constraints (CW alongside legacy CV, PIN/State)
-- ---------------------------------------------------------------------
alter table public.policies drop constraint if exists policies_vehicle_category_check;
alter table public.policies
  add constraint policies_vehicle_category_check
  check (vehicle_category is null or vehicle_category in ('2W', '4W', 'CV', 'CW'));

alter table public.claims drop constraint if exists claims_vehicle_category_check;
alter table public.claims
  add constraint claims_vehicle_category_check
  check (vehicle_category is null or vehicle_category in ('2W', '4W', 'CV', 'CW'));

alter table public.claims drop constraint if exists claims_status_check;
alter table public.claims
  add constraint claims_status_check
  check (status in ('pending', 'approved', 'rejected', 'completed'));

alter table public.claims
  add column if not exists customer_pincode text,
  add column if not exists customer_state text;

comment on column public.claims.customer_pincode is '6-digit customer PIN code used to resolve customer state for incentive eligibility.';
comment on column public.claims.customer_state is 'Optional manually entered customer state fallback when PIN directory has no match.';

-- ---------------------------------------------------------------------
-- 2. Admin Policy Settings (`incentive_settings`) — Proposal Section 18 controls
-- ---------------------------------------------------------------------
create table if not exists public.incentive_settings (
  id                             boolean primary key default true check (id = true),
  enable_live_calculations       boolean not null default true,
  allow_category_default_fallback boolean not null default true,
  allow_global_fallback          boolean not null default false,
  eligible_claim_statuses        text[] not null default '{approved}',
  non_working_day_policy         text not null default 'hold_for_review'
    check (non_working_day_policy in ('hold_for_review', 'zero_credit', 'roll_to_next_working_day')),
  mid_month_target_policy        text not null default 'admin_override'
    check (mid_month_target_policy in ('full_target', 'prorated', 'admin_override')),
  post_finalization_policy       text not null default 'next_period_adjustment'
    check (post_finalization_policy in ('next_period_adjustment', 'reopen_with_reason')),
  agent_visibility_mode          text not null default 'immediate'
    check (agent_visibility_mode in ('immediate', 'after_daily_reconciliation')),
  working_days                   integer[] not null default '{1,2,3,4,5,6}',
  updated_by                     uuid references public.staff_users (id) on delete set null,
  updated_at                     timestamptz not null default now()
);

drop trigger if exists incentive_settings_set_updated_at on public.incentive_settings;
create trigger incentive_settings_set_updated_at before update on public.incentive_settings
  for each row execute function public.set_updated_at();

insert into public.incentive_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3. Location Directory (`pincode_directory`) — Proposal Section 05 & 14
-- ---------------------------------------------------------------------
create table if not exists public.pincode_directory (
  id                uuid primary key default gen_random_uuid(),
  pincode           varchar(6) not null,
  state_code        text not null,
  state_name        text not null,
  district_name     text,
  office_name       text,
  office_type       text,
  is_active         boolean not null default true,
  source_updated_at date not null default current_date,
  created_at        timestamptz not null default now()
);

create index if not exists idx_pincode_directory_pincode on public.pincode_directory (pincode) where is_active = true;
create index if not exists idx_pincode_directory_state on public.pincode_directory (state_name);
create unique index if not exists idx_pincode_directory_unique_entry
  on public.pincode_directory (pincode, state_name, coalesce(office_name, ''), coalesce(district_name, ''));

-- ---------------------------------------------------------------------
-- 4. Historical Agent Assignments (`incentive_agent_assignments`)
-- ---------------------------------------------------------------------
create table if not exists public.incentive_agent_assignments (
  id               uuid primary key default gen_random_uuid(),
  staff_id         uuid not null references public.staff_users (id) on delete cascade,
  vehicle_category text not null check (vehicle_category in ('2W', '4W', 'CW')),
  assigned_state   text not null,
  effective_from   date not null,
  effective_until  date,
  status           text not null default 'active' check (status in ('active', 'inactive')),
  notes            text,
  created_by       uuid references public.staff_users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint incentive_assignments_dates_check check (effective_until is null or effective_until >= effective_from)
);

create index if not exists idx_incentive_assignments_staff_dates
  on public.incentive_agent_assignments (staff_id, status, effective_from, effective_until);

drop trigger if exists incentive_agent_assignments_set_updated_at on public.incentive_agent_assignments;
create trigger incentive_agent_assignments_set_updated_at before update on public.incentive_agent_assignments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. Rules, Rule Versions, Slabs (`incentive_rules`, `incentive_rule_versions`, `incentive_slabs`)
--    Safely upgrades 0014 prototype if `incentive_rules` lacks `id` PK.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'incentive_rules'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'incentive_rules' and column_name = 'id'
  ) then
    alter table public.incentive_rules rename to incentive_rules_legacy_0014;
  end if;
end $$;

create table if not exists public.incentive_rules (
  id                      uuid primary key default gen_random_uuid(),
  rule_name               text not null,
  scope                   text not null default 'exact_state'
    check (scope in ('exact_state', 'category_default', 'global_fallback')),
  vehicle_category        text check (vehicle_category is null or vehicle_category in ('2W', '4W', 'CW')),
  state_name              text,
  is_active               boolean not null default true,
  calculation_method      text not null default 'progressive_slab'
    check (calculation_method in ('fixed', 'progressive_slab', 'final_slab', 'combined')),
  fixed_rate              numeric not null default 0 check (fixed_rate >= 0),
  combination_mode        text not null default 'fixed_plus_progressive'
    check (combination_mode in ('fixed_plus_progressive', 'fixed_plus_final_slab', 'fixed_plus_slab_bonus')),
  monthly_target          integer not null default 100 check (monthly_target >= 0 and monthly_target <= 50000),
  eligible_claim_statuses text[] not null default '{approved}',
  effective_from          date not null default '2026-01-01',
  effective_until         date,
  current_version         integer not null default 1,
  created_by              uuid references public.staff_users (id) on delete set null,
  updated_by              uuid references public.staff_users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint incentive_rules_scope_fields_check check (
    (scope = 'exact_state' and vehicle_category is not null and state_name is not null)
    or (scope = 'category_default' and vehicle_category is not null and state_name is null)
    or (scope = 'global_fallback' and vehicle_category is null and state_name is null)
  ),
  constraint incentive_rules_dates_check check (effective_until is null or effective_until >= effective_from)
);

drop trigger if exists incentive_rules_set_updated_at on public.incentive_rules;
create trigger incentive_rules_set_updated_at before update on public.incentive_rules
  for each row execute function public.set_updated_at();

create table if not exists public.incentive_rule_versions (
  id                      uuid primary key default gen_random_uuid(),
  rule_id                 uuid not null references public.incentive_rules (id) on delete cascade,
  version_number          integer not null,
  rule_name               text not null,
  scope                   text not null,
  vehicle_category        text,
  state_name              text,
  calculation_method      text not null,
  fixed_rate              numeric not null,
  combination_mode        text not null,
  monthly_target          integer not null,
  eligible_claim_statuses text[] not null,
  effective_from          date not null,
  effective_until         date,
  created_by              uuid references public.staff_users (id) on delete set null,
  created_at              timestamptz not null default now(),
  unique (rule_id, version_number)
);

create table if not exists public.incentive_slabs (
  id              uuid primary key default gen_random_uuid(),
  rule_version_id uuid not null references public.incentive_rule_versions (id) on delete cascade,
  slab_order      integer not null,
  min_claims      integer not null check (min_claims >= 1),
  max_claims      integer,
  rate_per_claim  numeric not null default 0 check (rate_per_claim >= 0),
  bonus_amount    numeric not null default 0 check (bonus_amount >= 0),
  constraint incentive_slabs_range_check check (max_claims is null or max_claims >= min_claims)
);

create index if not exists idx_incentive_slabs_version on public.incentive_slabs (rule_version_id, slab_order);

-- Migrate any 0014 rows cleanly, or seed starter rules if table is fresh
do $$
declare
  v_legacy record;
  v_cat text;
  v_rule_id uuid;
  v_ver_id uuid;
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'incentive_rules_legacy_0014'
  ) then
    for v_legacy in select * from public.incentive_rules_legacy_0014 loop
      v_cat := case when v_legacy.vehicle_category = 'CV' then 'CW' else v_legacy.vehicle_category end;
      insert into public.incentive_rules (
        rule_name, scope, vehicle_category, state_name, is_active,
        calculation_method, fixed_rate, combination_mode, monthly_target,
        eligible_claim_statuses, effective_from, current_version
      ) values (
        v_cat || ' Default Policy', 'category_default', v_cat, null, v_legacy.is_active,
        'progressive_slab', 0, 'fixed_plus_progressive',
        greatest(1, coalesce(v_legacy.monthly_min_payments, 60)),
        '{approved}', '2026-01-01', 1
      ) returning id into v_rule_id;

      insert into public.incentive_rule_versions (
        rule_id, version_number, rule_name, scope, vehicle_category, state_name,
        calculation_method, fixed_rate, combination_mode, monthly_target,
        eligible_claim_statuses, effective_from
      ) values (
        v_rule_id, 1, v_cat || ' Default Policy', 'category_default', v_cat, null,
        'progressive_slab', 0, 'fixed_plus_progressive',
        greatest(1, coalesce(v_legacy.monthly_min_payments, 60)),
        '{approved}', '2026-01-01'
      ) returning id into v_ver_id;

      if v_cat = '2W' then
        insert into public.incentive_slabs (rule_version_id, slab_order, min_claims, max_claims, rate_per_claim, bonus_amount)
        values
          (v_ver_id, 1, 1, 5, 4, 0),
          (v_ver_id, 2, 6, 10, 5, 0),
          (v_ver_id, 3, 11, 20, 6, 0),
          (v_ver_id, 4, 21, null, 7, 0);
      elsif v_cat = '4W' then
        insert into public.incentive_slabs (rule_version_id, slab_order, min_claims, max_claims, rate_per_claim, bonus_amount)
        values
          (v_ver_id, 1, 1, 3, 8, 0),
          (v_ver_id, 2, 4, 8, 10, 0),
          (v_ver_id, 3, 9, null, 12, 0);
      else
        insert into public.incentive_slabs (rule_version_id, slab_order, min_claims, max_claims, rate_per_claim, bonus_amount)
        values
          (v_ver_id, 1, 1, 2, 15, 0),
          (v_ver_id, 2, 3, 5, 18, 0),
          (v_ver_id, 3, 6, null, 22, 0);
      end if;
    end loop;
    drop table public.incentive_rules_legacy_0014;
  end if;

  if not exists (select 1 from public.incentive_rules limit 1) then
    -- Seed illustrative Category Default rules (2W, 4W, CW)
    insert into public.incentive_rules (id, rule_name, scope, vehicle_category, state_name, calculation_method, monthly_target, effective_from)
    values
      ('11111111-1111-4111-8111-111111111101', '2W Standard Progressive Rule', 'category_default', '2W', null, 'progressive_slab', 100, '2026-01-01'),
      ('11111111-1111-4111-8111-111111111102', '4W Standard Progressive Rule', 'category_default', '4W', null, 'progressive_slab', 80, '2026-01-01'),
      ('11111111-1111-4111-8111-111111111103', 'CW Standard Progressive Rule', 'category_default', 'CW', null, 'progressive_slab', 60, '2026-01-01');

    insert into public.incentive_rule_versions (id, rule_id, version_number, rule_name, scope, vehicle_category, state_name, calculation_method, fixed_rate, combination_mode, monthly_target, eligible_claim_statuses, effective_from)
    values
      ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101', 1, '2W Standard Progressive Rule', 'category_default', '2W', null, 'progressive_slab', 0, 'fixed_plus_progressive', 100, '{approved}', '2026-01-01'),
      ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111102', 1, '4W Standard Progressive Rule', 'category_default', '4W', null, 'progressive_slab', 0, 'fixed_plus_progressive', 80, '{approved}', '2026-01-01'),
      ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111103', 1, 'CW Standard Progressive Rule', 'category_default', 'CW', null, 'progressive_slab', 0, 'fixed_plus_progressive', 60, '{approved}', '2026-01-01');

    insert into public.incentive_slabs (rule_version_id, slab_order, min_claims, max_claims, rate_per_claim, bonus_amount)
    values
      ('22222222-2222-4222-8222-222222222201', 1, 1, 5, 4, 0),
      ('22222222-2222-4222-8222-222222222201', 2, 6, 10, 5, 0),
      ('22222222-2222-4222-8222-222222222201', 3, 11, 20, 6, 0),
      ('22222222-2222-4222-8222-222222222201', 4, 21, null, 7, 0),
      ('22222222-2222-4222-8222-222222222202', 1, 1, 3, 8, 0),
      ('22222222-2222-4222-8222-222222222202', 2, 4, 8, 10, 0),
      ('22222222-2222-4222-8222-222222222202', 3, 9, null, 12, 0),
      ('22222222-2222-4222-8222-222222222203', 1, 1, 2, 15, 0),
      ('22222222-2222-4222-8222-222222222203', 2, 3, 5, 18, 0),
      ('22222222-2222-4222-8222-222222222203', 3, 6, null, 22, 0);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6. Incentive Periods & Holidays (`incentive_periods`, `incentive_holidays`)
-- ---------------------------------------------------------------------
create table if not exists public.incentive_periods (
  id           uuid primary key default gen_random_uuid(),
  period_key   text not null unique,
  label        text not null,
  start_date   date not null,
  end_date     date not null,
  status       text not null default 'open'
    check (status in ('open', 'ready_for_review', 'under_review', 'finalized', 'closed')),
  closed_by    uuid references public.staff_users (id) on delete set null,
  closed_at    timestamptz,
  finalized_by uuid references public.staff_users (id) on delete set null,
  finalized_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint incentive_periods_dates_check check (end_date >= start_date)
);

drop trigger if exists incentive_periods_set_updated_at on public.incentive_periods;
create trigger incentive_periods_set_updated_at before update on public.incentive_periods
  for each row execute function public.set_updated_at();

create table if not exists public.incentive_holidays (
  holiday_date date primary key,
  label        text not null,
  created_by   uuid references public.staff_users (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. Daily Summary & Immutable Claim Ledger
--    (`agent_daily_performance`, `agent_incentive_ledger`)
-- ---------------------------------------------------------------------
create table if not exists public.agent_daily_performance (
  id                 uuid primary key default gen_random_uuid(),
  period_id          uuid not null references public.incentive_periods (id) on delete cascade,
  agent_id           uuid not null references public.staff_users (id) on delete cascade,
  perf_date          date not null,
  is_working_day     boolean not null default true,
  holiday_label      text,
  vehicle_category   text,
  assigned_state     text,
  total_claims       integer not null default 0,
  eligible_claims    integer not null default 0,
  held_claims        integer not null default 0,
  mismatch_claims    integer not null default 0,
  provisional_amount numeric not null default 0,
  calculation_method text,
  slab_summary       text,
  updated_at         timestamptz not null default now(),
  unique (period_id, agent_id, perf_date)
);

create index if not exists idx_agent_daily_performance_agent_period
  on public.agent_daily_performance (period_id, agent_id, perf_date);

create table if not exists public.agent_incentive_ledger (
  id                        uuid primary key default gen_random_uuid(),
  period_id                 uuid not null references public.incentive_periods (id) on delete cascade,
  claim_id                  uuid not null references public.claims (id) on delete cascade,
  agent_id                  uuid not null references public.staff_users (id) on delete cascade,
  assignment_id             uuid references public.incentive_agent_assignments (id) on delete set null,
  rule_id                   uuid references public.incentive_rules (id) on delete set null,
  rule_version_id           uuid references public.incentive_rule_versions (id) on delete set null,
  claim_submission_date     date not null,
  effective_slab_date       date not null,
  credited_at               timestamptz,
  claim_status_at_calc      text not null,
  claim_vehicle_category    text,
  assigned_vehicle_category text,
  assigned_state            text,
  customer_pincode          text,
  manual_customer_state     text,
  resolved_state            text,
  location_status           text not null
    check (location_status in ('resolved_pin', 'manual_fallback', 'admin_verified', 'pin_conflict', 'unverified')),
  resolution_note           text,
  eligibility_status        text not null
    check (eligibility_status in ('eligible', 'held_review', 'ineligible_mismatch', 'ineligible_assignment', 'ineligible_non_working', 'ineligible_status')),
  daily_sequence_no         integer not null default 0,
  slab_label                text,
  applied_rate              numeric not null default 0,
  calculated_amount         numeric not null default 0,
  earning_status            text not null default 'provisional'
    check (earning_status in ('provisional', 'qualified', 'forfeited', 'held', 'ineligible', 'void')),
  exception_reason          text,
  is_reconciled             boolean not null default false,
  is_locked                 boolean not null default false,
  resolved_by               uuid references public.staff_users (id) on delete set null,
  resolved_at               timestamptz,
  calculated_at             timestamptz not null default now()
);

-- Core Safeguard: prevent duplicate active incentive credits for the same claim
create unique index if not exists idx_agent_incentive_ledger_unique_claim
  on public.agent_incentive_ledger (claim_id)
  where earning_status <> 'void';

create index if not exists idx_agent_incentive_ledger_period_agent
  on public.agent_incentive_ledger (period_id, agent_id, claim_submission_date);

create index if not exists idx_agent_incentive_ledger_exceptions
  on public.agent_incentive_ledger (period_id, earning_status, exception_reason)
  where earning_status = 'held';

-- ---------------------------------------------------------------------
-- 8. Monthly Summary, Settlements, Payouts, Adjustments, Audit Logs
-- ---------------------------------------------------------------------
create table if not exists public.agent_monthly_incentives (
  id                          uuid primary key default gen_random_uuid(),
  period_id                   uuid not null references public.incentive_periods (id) on delete cascade,
  agent_id                    uuid not null references public.staff_users (id) on delete cascade,
  primary_vehicle_category    text,
  primary_state               text,
  base_monthly_target         integer not null default 0,
  target_override             integer,
  effective_target            integer not null default 0,
  target_adjustment_reason    text,
  eligible_claims_count       integer not null default 0,
  non_qualifying_claims_count integer not null default 0,
  held_claims_count           integer not null default 0,
  target_achieved             boolean not null default false,
  provisional_earnings        numeric not null default 0,
  adjustments_total           numeric not null default 0,
  forfeited_amount            numeric not null default 0,
  eligible_payable_amount     numeric not null default 0,
  updated_at                  timestamptz not null default now(),
  unique (period_id, agent_id)
);

create table if not exists public.incentive_settlements (
  id                 uuid primary key default gen_random_uuid(),
  period_id          uuid not null references public.incentive_periods (id) on delete cascade,
  agent_id           uuid not null references public.staff_users (id) on delete cascade,
  vehicle_category   text,
  assigned_state     text,
  monthly_target     integer not null default 0,
  eligible_claims    integer not null default 0,
  provisional_amount numeric not null default 0,
  adjustment_amount  numeric not null default 0,
  eligibility_status text not null check (eligibility_status in ('eligible', 'forfeited', 'under_review', 'ready_for_review')),
  payment_status     text not null default 'unpaid' check (payment_status in ('unpaid', 'partially_paid', 'paid', 'not_applicable')),
  status             text not null check (status in ('open', 'ready_for_review', 'under_review', 'finalized', 'partially_paid', 'paid', 'forfeited')),
  finalized_payable  numeric not null default 0 check (finalized_payable >= 0),
  paid_amount        numeric not null default 0 check (paid_amount >= 0),
  outstanding_amount numeric not null default 0 check (outstanding_amount >= 0),
  notes              text,
  generated_by       uuid references public.staff_users (id) on delete set null,
  generated_at       timestamptz,
  finalized_by       uuid references public.staff_users (id) on delete set null,
  finalized_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (period_id, agent_id)
);

drop trigger if exists incentive_settlements_set_updated_at on public.incentive_settlements;
create trigger incentive_settlements_set_updated_at before update on public.incentive_settlements
  for each row execute function public.set_updated_at();

create table if not exists public.incentive_payouts (
  id              uuid primary key default gen_random_uuid(),
  settlement_id   uuid not null references public.incentive_settlements (id) on delete cascade,
  period_id       uuid not null references public.incentive_periods (id) on delete cascade,
  agent_id        uuid not null references public.staff_users (id) on delete cascade,
  paid_amount     numeric not null check (paid_amount > 0),
  payout_date     date not null,
  payment_mode    text not null check (payment_mode in ('Bank', 'UPI', 'Cash', 'Other')),
  transaction_ref text not null,
  remarks         text,
  proof_path      text,
  recorded_by     uuid references public.staff_users (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_incentive_payouts_settlement on public.incentive_payouts (settlement_id, payout_date desc);

create table if not exists public.incentive_adjustments (
  id              uuid primary key default gen_random_uuid(),
  period_id       uuid not null references public.incentive_periods (id) on delete cascade,
  agent_id        uuid not null references public.staff_users (id) on delete cascade,
  settlement_id   uuid references public.incentive_settlements (id) on delete set null,
  claim_id        uuid references public.claims (id) on delete set null,
  adjustment_type text not null check (adjustment_type in ('earning_override', 'target_override', 'post_finalization_correction', 'exception_resolution')),
  original_value  text not null,
  updated_value   text not null,
  delta_amount    numeric not null default 0,
  reason          text not null,
  admin_id        uuid references public.staff_users (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_incentive_adjustments_period on public.incentive_adjustments (period_id, created_at desc);

create table if not exists public.incentive_audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.staff_users (id) on delete set null,
  actor_name  text,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  period_id   uuid references public.incentive_periods (id) on delete set null,
  agent_id    uuid references public.staff_users (id) on delete set null,
  reason      text,
  before_data jsonb,
  after_data  jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_incentive_audit_logs_created on public.incentive_audit_logs (created_at desc);

-- ---------------------------------------------------------------------
-- 9. Security, RLS & Anon Lockdowns
-- ---------------------------------------------------------------------
do $$
declare
  tbl text;
  tables text[] := array[
    'incentive_settings',
    'pincode_directory',
    'incentive_agent_assignments',
    'incentive_rules',
    'incentive_rule_versions',
    'incentive_slabs',
    'incentive_periods',
    'incentive_holidays',
    'agent_daily_performance',
    'agent_incentive_ledger',
    'agent_monthly_incentives',
    'incentive_settlements',
    'incentive_payouts',
    'incentive_adjustments',
    'incentive_audit_logs'
  ];
begin
  foreach tbl in array tables loop
    execute format('alter table public.%I enable row level security;', tbl);
    execute format('revoke all on public.%I from anon;', tbl);
  end loop;
end $$;

-- Shared read-only tables (Admin write, Staff with incentives.view read)
do $$
declare
  tbl text;
  shared_tables text[] := array[
    'incentive_settings',
    'pincode_directory',
    'incentive_rules',
    'incentive_rule_versions',
    'incentive_slabs',
    'incentive_periods',
    'incentive_holidays'
  ];
begin
  foreach tbl in array shared_tables loop
    execute format('drop policy if exists %I on public.%I;', tbl || '_staff_select', tbl);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.has_permission(''incentives.view'')) or (select public.has_permission(''incentives.manage'')));', tbl || '_staff_select', tbl);
    execute format('drop policy if exists %I on public.%I;', tbl || '_admin_write', tbl);
    execute format('create policy %I on public.%I for all to authenticated using ((select public.has_permission(''incentives.manage''))) with check ((select public.has_permission(''incentives.manage'')));', tbl || '_admin_write', tbl);
  end loop;
end $$;

-- Strictly Agent-scoped tables (own records only for incentives.view; full for incentives.manage)
drop policy if exists incentive_assignments_select on public.incentive_agent_assignments;
create policy incentive_assignments_select on public.incentive_agent_assignments
  for select to authenticated
  using (
    (select public.has_permission('incentives.manage'))
    or ((select public.has_permission('incentives.view')) and staff_id = (select public.my_staff_id()))
  );

drop policy if exists incentive_assignments_admin_write on public.incentive_agent_assignments;
create policy incentive_assignments_admin_write on public.incentive_agent_assignments
  for all to authenticated
  using ((select public.has_permission('incentives.manage')))
  with check ((select public.has_permission('incentives.manage')));

-- agent_daily_performance, agent_incentive_ledger, agent_monthly_incentives, incentive_settlements, incentive_payouts
do $$
declare
  tbl text;
  agent_tables text[] := array[
    'agent_daily_performance',
    'agent_incentive_ledger',
    'agent_monthly_incentives',
    'incentive_settlements',
    'incentive_payouts'
  ];
begin
  foreach tbl in array agent_tables loop
    execute format('drop policy if exists %I on public.%I;', tbl || '_select', tbl);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.has_permission(''incentives.manage'')) or ((select public.has_permission(''incentives.view'')) and agent_id = (select public.my_staff_id())));', tbl || '_select', tbl);
    execute format('drop policy if exists %I on public.%I;', tbl || '_admin_write', tbl);
    execute format('create policy %I on public.%I for all to authenticated using ((select public.has_permission(''incentives.manage''))) with check ((select public.has_permission(''incentives.manage'')));', tbl || '_admin_write', tbl);
  end loop;
end $$;

-- Admin-only tables (`incentive_adjustments`, `incentive_audit_logs` — agents can view adjustments affecting them if allowed, admins full)
drop policy if exists incentive_adjustments_select on public.incentive_adjustments;
create policy incentive_adjustments_select on public.incentive_adjustments
  for select to authenticated
  using (
    (select public.has_permission('incentives.manage'))
    or ((select public.has_permission('incentives.view')) and agent_id = (select public.my_staff_id()))
  );

drop policy if exists incentive_adjustments_admin_write on public.incentive_adjustments;
create policy incentive_adjustments_admin_write on public.incentive_adjustments
  for all to authenticated
  using ((select public.has_permission('incentives.manage')))
  with check ((select public.has_permission('incentives.manage')));

drop policy if exists incentive_audit_logs_admin_all on public.incentive_audit_logs;
create policy incentive_audit_logs_admin_all on public.incentive_audit_logs
  for all to authenticated
  using ((select public.has_permission('incentives.manage')))
  with check ((select public.has_permission('incentives.manage')));

-- Ensure staff with incentives.view can read their own staff_users row & claims, and admins with incentives.manage can manage payout proofs in DOCUMENTS bucket
drop policy if exists staff_users_incentive_self_select on public.staff_users;
create policy staff_users_incentive_self_select on public.staff_users
  for select to authenticated
  using (
    auth_user_id = (select auth.uid())
    or (select public.has_permission('staff.manage'))
    or (select public.has_permission('incentives.manage'))
  );

drop policy if exists staff_users_select_self_or_admin on public.staff_users;

drop policy if exists documents_incentive_admin_all on storage.objects;
create policy documents_incentive_admin_all on storage.objects
  for all to authenticated
  using (bucket_id = 'DOCUMENTS' and (select public.has_permission('incentives.manage')))
  with check (bucket_id = 'DOCUMENTS' and (select public.has_permission('incentives.manage')));

-- Ensure Staff role has incentives.view seeded
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
