-- =====================================================================
-- SecureDrive - 0010_rbac_roles_permissions.sql
-- Slice S13: Full RBAC switch-on.
-- Adds dynamic roles, role permissions, per-staff custom permission overrides,
-- and links staff_users to roles.
-- Safe to re-run (idempotent). Runs in one transaction.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Roles table
-- ---------------------------------------------------------------------
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists roles_set_updated_at on public.roles;
create trigger roles_set_updated_at before update on public.roles
  for each row execute function public.set_updated_at();

comment on table public.roles is 'Dynamic roles configured by admin (e.g. Admin, Staff, Claims Specialist).';

-- ---------------------------------------------------------------------
-- 2. Role Permissions table
-- ---------------------------------------------------------------------
create table if not exists public.role_permissions (
  role_id    uuid not null references public.roles (id) on delete cascade,
  permission text not null,
  created_at timestamptz not null default now(),
  primary key (role_id, permission)
);

create index if not exists idx_role_permissions_role_id on public.role_permissions (role_id);
comment on table public.role_permissions is 'Module permission keys assigned to each role (e.g. policies.view, datagrid.view).';

-- ---------------------------------------------------------------------
-- 3. Staff Custom Permission Overrides
-- ---------------------------------------------------------------------
-- Allows admin to grant extra permissions or revoke role permissions for a specific staff member.
create table if not exists public.staff_custom_permissions (
  staff_id   uuid not null references public.staff_users (id) on delete cascade,
  permission text not null,
  granted    boolean not null default true, -- true = grant extra, false = revoke
  created_at timestamptz not null default now(),
  primary key (staff_id, permission)
);

create index if not exists idx_staff_custom_permissions_staff_id on public.staff_custom_permissions (staff_id);
comment on table public.staff_custom_permissions is 'Individual overrides for a staff member (grant extra permissions or revoke).';

-- ---------------------------------------------------------------------
-- 4. Link staff_users to roles
-- ---------------------------------------------------------------------
alter table public.staff_users
  add column if not exists role_id uuid references public.roles (id) on delete set null;

create index if not exists idx_staff_users_role_id on public.staff_users (role_id);

-- ---------------------------------------------------------------------
-- 5. Seed default system roles: Admin and Staff
-- ---------------------------------------------------------------------
insert into public.roles (name, description, is_system)
values
  ('Admin', 'Full system access and settings management', true),
  ('Staff', 'Standard operational access (viewing, creating, updating client policies)', true)
on conflict (name) do update
set
  description = excluded.description,
  is_system = true;

-- Seed default permissions for Staff role
do $$
declare
  v_staff_role_id uuid;
begin
  select id into v_staff_role_id from public.roles where name = 'Staff';
  if v_staff_role_id is not null then
    insert into public.role_permissions (role_id, permission)
    values
      (v_staff_role_id, 'dashboard.view'),
      (v_staff_role_id, 'clients.view'),
      (v_staff_role_id, 'clients.create'),
      (v_staff_role_id, 'policies.view'),
      (v_staff_role_id, 'policies.create'),
      (v_staff_role_id, 'policies.edit'),
      (v_staff_role_id, 'policies.verify'),
      (v_staff_role_id, 'renewals.view'),
      (v_staff_role_id, 'renewals.update'),
      (v_staff_role_id, 'quotes.view'),
      (v_staff_role_id, 'quotes.update'),
      (v_staff_role_id, 'claims.view'),
      (v_staff_role_id, 'claims.create'),
      (v_staff_role_id, 'notifications.view'),
      (v_staff_role_id, 'notifications.send'),
      (v_staff_role_id, 'placements.view'),
      (v_staff_role_id, 'support.view'),
      (v_staff_role_id, 'support.update'),
      (v_staff_role_id, 'ads.view'),
      (v_staff_role_id, 'reports.view')
    on conflict (role_id, permission) do nothing;
  end if;
end $$;

-- Backfill role_id on staff_users based on existing text role
update public.staff_users
set role_id = (select id from public.roles where name = 'Admin')
where role = 'admin' and (role_id is null or role_id <> (select id from public.roles where name = 'Admin'));

update public.staff_users
set role_id = (select id from public.roles where name = 'Staff')
where role = 'staff' and role_id is null;

-- ---------------------------------------------------------------------
-- 6. Helper function to compute effective permissions
-- ---------------------------------------------------------------------
create or replace function public.get_staff_permissions(p_staff_id uuid)
returns table (permission text)
language sql
stable
security definer
set search_path = public
as $$
  -- 1. If admin, return all active permissions in system
  -- (caller application handles admin bypass directly, this is for SQL/RLS usage)
  (
    -- Role permissions
    select rp.permission
    from public.staff_users su
    join public.role_permissions rp on rp.role_id = su.role_id
    where su.id = p_staff_id

    union

    -- Extra granted overrides
    select scp.permission
    from public.staff_custom_permissions scp
    where scp.staff_id = p_staff_id and scp.granted = true
  )
  except
  -- Revoked overrides
  select scp.permission
  from public.staff_custom_permissions scp
  where scp.staff_id = p_staff_id and scp.granted = false;
$$;

-- ---------------------------------------------------------------------
-- 7. Security: RLS & Privileges
-- ---------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff_custom_permissions enable row level security;

revoke all on public.roles                    from anon;
revoke all on public.role_permissions         from anon;
revoke all on public.staff_custom_permissions from anon;

-- roles policies
drop policy if exists roles_staff_select on public.roles;
create policy roles_staff_select on public.roles
  for select to authenticated using ((select public.is_staff()));

drop policy if exists roles_admin_write on public.roles;
create policy roles_admin_write on public.roles
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- role_permissions policies
drop policy if exists role_permissions_staff_select on public.role_permissions;
create policy role_permissions_staff_select on public.role_permissions
  for select to authenticated using ((select public.is_staff()));

drop policy if exists role_permissions_admin_write on public.role_permissions;
create policy role_permissions_admin_write on public.role_permissions
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- staff_custom_permissions policies
drop policy if exists staff_custom_permissions_admin_all on public.staff_custom_permissions;
create policy staff_custom_permissions_admin_all on public.staff_custom_permissions
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

commit;

-- ---------------------------------------------------------------------
-- Verification query (must return 0 rows for anon)
-- ---------------------------------------------------------------------
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon' and table_name in ('roles', 'role_permissions', 'staff_custom_permissions');
