-- =====================================================================
-- SecureDrive - 0023_agent_rule_direct_assignment.sql
-- Direct Rule Assignment for Agents in Incentive Module
--
-- Enables assigning agents directly to incentive rules defined in the
-- Rule Builder (incentive_rules table) instead of only vehicle/state tuples.
--
-- Safe to re-run (idempotent). Runs in one transaction.
-- =====================================================================

begin;

-- 1. Add rule_id foreign key column to incentive_agent_assignments
alter table public.incentive_agent_assignments
  add column if not exists rule_id uuid references public.incentive_rules (id) on delete set null;

-- 2. Make vehicle_category and assigned_state optional for direct rule assignments
alter table public.incentive_agent_assignments
  alter column vehicle_category drop not null;

alter table public.incentive_agent_assignments
  alter column assigned_state drop not null;

-- 3. Relax vehicle_category check constraint to allow NULL or 'ALL'
alter table public.incentive_agent_assignments
  drop constraint if exists incentive_agent_assignments_vehicle_category_check;

alter table public.incentive_agent_assignments
  add constraint incentive_agent_assignments_vehicle_category_check
  check (vehicle_category is null or vehicle_category in ('2W', '4W', 'CW', 'ALL'));

-- 4. Create index on rule_id for efficient lookup
create index if not exists idx_incentive_assignments_rule_id
  on public.incentive_agent_assignments (rule_id);

comment on column public.incentive_agent_assignments.rule_id is 'Direct incentive rule assigned to this agent from the Rule Builder.';

commit;
