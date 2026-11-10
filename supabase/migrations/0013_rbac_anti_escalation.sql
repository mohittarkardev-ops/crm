-- =====================================================================
-- SecureDrive - 0013_rbac_anti_escalation.sql
-- Hardens RBAC against privilege escalation and adds granular clients.edit:
--   1. Prevents non-admin staff with `staff.manage` from creating/editing/
--      deleting Admin accounts, assigning the Admin role, changing their own
--      role/permissions, granting adminOnly permissions, or altering roles.
--   2. Adds `clients.edit` permission (copied to any role holding `clients.create`)
--      and includes it in `users_staff_update` RLS.
-- Safe to re-run (idempotent). Runs in one transaction.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Seed `clients.edit` onto roles that already hold `clients.create`
--    (including system 'Staff') so existing workflows continue smoothly.
-- ---------------------------------------------------------------------
insert into public.role_permissions (role_id, permission)
select distinct rp.role_id, 'clients.edit'
from public.role_permissions rp
where rp.permission = 'clients.create'
on conflict (role_id, permission) do nothing;

-- Allow `clients.edit` alongside `clients.create` and `import.import` in users UPDATE RLS.
drop policy if exists users_staff_update on public.users;
create policy users_staff_update on public.users
  for update to authenticated
  using (
    (select public.has_permission('clients.edit'))
    or (select public.has_permission('clients.create'))
    or (select public.has_permission('import.import'))
  )
  with check (
    (select public.has_permission('clients.edit'))
    or (select public.has_permission('clients.create'))
    or (select public.has_permission('import.import'))
  );

-- ---------------------------------------------------------------------
-- 2. Strictly Admin-only (`is_admin()`) Role Definitions & save_role_permissions
-- ---------------------------------------------------------------------
create or replace function public.save_role_permissions(
  p_role_id uuid,
  p_permissions text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_name text;
begin
  if not (select public.is_admin()) then
    raise exception 'Only admins can modify role permissions';
  end if;

  select name into v_role_name from public.roles where id = p_role_id;
  if not found then
    raise exception 'Role not found';
  end if;

  if v_role_name = 'Admin' then
    return;
  end if;

  delete from public.role_permissions where role_id = p_role_id;

  if p_permissions is not null and array_length(p_permissions, 1) > 0 then
    insert into public.role_permissions (role_id, permission)
    select distinct p_role_id, perm
    from unnest(p_permissions) as perm
    where perm is not null and perm <> '';
  end if;
end;
$$;

drop policy if exists roles_admin_write on public.roles;
create policy roles_admin_write on public.roles
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists role_permissions_admin_write on public.role_permissions;
create policy role_permissions_admin_write on public.role_permissions
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 3. Non-escalation policies for `staff_users` & `staff_custom_permissions`
-- ---------------------------------------------------------------------
drop policy if exists staff_users_admin_write on public.staff_users;
drop policy if exists staff_users_staff_insert on public.staff_users;
drop policy if exists staff_users_staff_update on public.staff_users;
drop policy if exists staff_users_staff_delete on public.staff_users;

create policy staff_users_staff_insert on public.staff_users
  for insert to authenticated
  with check (
    (select public.is_admin())
    or (
      (select public.has_permission('staff.manage'))
      and role is distinct from 'admin'
      and (
        role_id is null
        or not exists (
          select 1 from public.roles r where r.id = role_id and r.name = 'Admin'
        )
      )
    )
  );

create policy staff_users_staff_update on public.staff_users
  for update to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.has_permission('staff.manage'))
      and role is distinct from 'admin'
      and auth_user_id is distinct from (select auth.uid())
    )
  )
  with check (
    (select public.is_admin())
    or (
      (select public.has_permission('staff.manage'))
      and role is distinct from 'admin'
      and auth_user_id is distinct from (select auth.uid())
      and (
        role_id is null
        or not exists (
          select 1 from public.roles r where r.id = role_id and r.name = 'Admin'
        )
      )
    )
  );

create policy staff_users_staff_delete on public.staff_users
  for delete to authenticated
  using (
    (
      (select public.is_admin())
      and auth_user_id is distinct from (select auth.uid())
    )
    or (
      (select public.has_permission('staff.manage'))
      and role is distinct from 'admin'
      and auth_user_id is distinct from (select auth.uid())
    )
  );

drop policy if exists staff_custom_permissions_admin_all on public.staff_custom_permissions;
create policy staff_custom_permissions_admin_all on public.staff_custom_permissions
  for all to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.has_permission('staff.manage'))
      and staff_id <> (select id from public.staff_users where auth_user_id = (select auth.uid()))
      and exists (
        select 1 from public.staff_users su
        where su.id = staff_id and su.role is distinct from 'admin'
      )
    )
  )
  with check (
    (select public.is_admin())
    or (
      (select public.has_permission('staff.manage'))
      and staff_id <> (select id from public.staff_users where auth_user_id = (select auth.uid()))
      and exists (
        select 1 from public.staff_users su
        where su.id = staff_id and su.role is distinct from 'admin'
      )
      and (
        granted = false
        or permission not in (
          'policies.delete',
          'claims.approve',
          'datagrid.view',
          'datagrid.edit',
          'datagrid.export',
          'import.view',
          'import.import',
          'import.lookup',
          'staff.manage'
        )
      )
    )
  );

commit;
