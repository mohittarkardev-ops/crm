-- =====================================================================
-- SecureDrive - 0020_milestone_stretch_and_claim_notif.sql
-- Safe to run more than once (idempotent).
--
-- What this does:
--   1. App Registration Tracking on `public.users` (`app_registered_at`):
--      Distinguishes genuine mobile app signups (via `link_current_user`)
--      from CRM-created clients (/claim unknown vehicle approval, manual
--      client add, CSV import) so "New user registered" CRM notifications
--      only appear when someone actually registers on the mobile app.
--   2. Milestone Step-Reward Calculation Support (Daily & Monthly):
--      Extends `incentive_rules.calculation_method` to allow `'milestone'`
--      and adds `monthly_milestones` JSONB ladders on `incentive_rules` and
--      `incentive_rule_versions`.
--   3. Agent-Specific Stretch Performance Target & Special Rate Rule:
--      Adds personalized `stretch_target`, `stretch_special_rate`,
--      `stretch_rate_mode`, and `stretch_label` alongside common monthly
--      targets on assignments, monthly rollups, and settlements.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Track Mobile App Registration Separately from CRM Client Creation
-- ---------------------------------------------------------------------
alter table public.users
  add column if not exists app_registered_at timestamptz;

-- Backfill existing app-linked accounts without retroactively marking CRM-only rows.
update public.users
set app_registered_at = created_at
where auth_user_id is not null
  and app_registered_at is null;

create or replace function public.mark_user_app_registered()
returns trigger
language plpgsql
as $$
begin
  if new.auth_user_id is not null and (tg_op = 'INSERT' or old.auth_user_id is null) then
    new.app_registered_at := coalesce(new.app_registered_at, now());
  end if;
  return new;
end $$;

drop trigger if exists users_mark_app_registered on public.users;
create trigger users_mark_app_registered
  before insert or update on public.users
  for each row execute function public.mark_user_app_registered();

create index if not exists idx_users_app_registered_at
  on public.users (app_registered_at desc)
  where auth_user_id is not null and app_registered_at is not null;

-- ---------------------------------------------------------------------
-- 2. Milestone Method ('milestone') & Monthly Milestones on Rules
-- ---------------------------------------------------------------------
do $$
declare
  v_con record;
begin
  for v_con in
    select conname
    from pg_constraint
    where conrelid = 'public.incentive_rules'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%calculation_method%'
  loop
    execute format('alter table public.incentive_rules drop constraint if exists %I', v_con.conname);
  end loop;
end $$;

alter table public.incentive_rules
  add constraint incentive_rules_calculation_method_check
  check (calculation_method in ('fixed', 'progressive_slab', 'final_slab', 'combined', 'milestone'));

alter table public.incentive_rules
  add column if not exists monthly_milestones jsonb not null default '[]'::jsonb;

alter table public.incentive_rule_versions
  add column if not exists monthly_milestones jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------
-- 3. Agent-Specific Stretch Performance Target & Special Rate Config
-- ---------------------------------------------------------------------
alter table public.incentive_agent_assignments
  add column if not exists stretch_target integer check (stretch_target is null or (stretch_target >= 1 and stretch_target <= 50000)),
  add column if not exists stretch_special_rate numeric not null default 0 check (stretch_special_rate >= 0),
  add column if not exists stretch_rate_mode text not null default 'replace_from_base',
  add column if not exists stretch_label text,
  add column if not exists stretch_milestones jsonb not null default '[]'::jsonb;

do $$
declare
  v_con record;
begin
  for v_con in
    select conname
    from pg_constraint
    where conrelid = 'public.incentive_agent_assignments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%stretch_rate_mode%'
  loop
    execute format('alter table public.incentive_agent_assignments drop constraint if exists %I', v_con.conname);
  end loop;
end $$;

alter table public.incentive_agent_assignments
  add constraint incentive_assignments_stretch_mode_check
  check (stretch_rate_mode in ('replace_from_base', 'extra_per_claim_from_base', 'replace_all_claims', 'lump_sum_bonus'));

alter table public.agent_monthly_incentives
  add column if not exists daily_provisional_earnings numeric not null default 0,
  add column if not exists monthly_milestone_bonus numeric not null default 0,
  add column if not exists stretch_target integer,
  add column if not exists stretch_special_rate numeric not null default 0,
  add column if not exists stretch_rate_mode text not null default 'replace_from_base',
  add column if not exists stretch_label text,
  add column if not exists stretch_milestones jsonb not null default '[]'::jsonb,
  add column if not exists stretch_achieved boolean not null default false,
  add column if not exists stretch_bonus_amount numeric not null default 0;

-- Backfill `daily_provisional_earnings` for existing open/historical snapshots cleanly.
update public.agent_monthly_incentives
set daily_provisional_earnings = provisional_earnings
where daily_provisional_earnings = 0 and provisional_earnings <> 0;

alter table public.incentive_settlements
  add column if not exists monthly_milestone_bonus numeric not null default 0,
  add column if not exists stretch_bonus_amount numeric not null default 0;

-- Allow logging stretch configuration changes in incentive_adjustments
do $$
declare
  v_con record;
begin
  for v_con in
    select conname
    from pg_constraint
    where conrelid = 'public.incentive_adjustments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%adjustment_type%'
  loop
    execute format('alter table public.incentive_adjustments drop constraint if exists %I', v_con.conname);
  end loop;
end $$;

alter table public.incentive_adjustments
  add constraint incentive_adjustments_adjustment_type_check
  check (adjustment_type in ('earning_override', 'target_override', 'post_finalization_correction', 'exception_resolution', 'stretch_config'));

commit;
