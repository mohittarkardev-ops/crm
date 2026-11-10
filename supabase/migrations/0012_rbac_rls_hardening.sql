-- =====================================================================
-- SecureDrive - 0012_rbac_rls_hardening.sql
-- Fixes Section H2 RBAC security items (H2.1-H2.8):
--   H2.1: Staff can SELECT their own staff_custom_permissions + single RPC get_my_permissions()
--   H2.2: Enforce permissions at the Postgres RLS layer via has_permission(text)
--         across CRM tables & private Storage (preserving all mobile user _own/_read policies)
--   H2.6: Sync default Staff role seed with S1 catalog (placements.manage, ads.manage, settings.*)
--         and backfill missing role_id on existing login staff rows
--   H2.7: Transactional save_role_permissions RPC so role saves cannot partially wipe permissions
--   H2.8: Revoke public/authenticated execute on get_staff_permissions(uuid)
-- Safe to re-run (idempotent). Runs in one transaction.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. H2.6: Align default Staff role seed + backfill missing role_id
-- ---------------------------------------------------------------------
do $$
declare
  v_admin_role_id uuid;
  v_staff_role_id uuid;
begin
  select id into v_admin_role_id from public.roles where name = 'Admin';
  select id into v_staff_role_id from public.roles where name = 'Staff';

  if v_staff_role_id is not null then
    insert into public.role_permissions (role_id, permission)
    values
      (v_staff_role_id, 'placements.manage'),
      (v_staff_role_id, 'ads.manage'),
      (v_staff_role_id, 'settings.view'),
      (v_staff_role_id, 'settings.edit')
    on conflict (role_id, permission) do nothing;
  end if;

  if v_admin_role_id is not null then
    update public.staff_users
    set role_id = v_admin_role_id
    where auth_user_id is not null and role = 'admin' and role_id is distinct from v_admin_role_id;
  end if;

  if v_staff_role_id is not null then
    update public.staff_users
    set role_id = v_staff_role_id
    where auth_user_id is not null and role = 'staff' and role_id is null;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. H2.1 / H2.2 / H2.8: Safe self-scoped permission RPC + has_permission()
-- ---------------------------------------------------------------------
create or replace function public.get_my_permissions()
returns table (permission text)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select id, role_id
    from public.staff_users
    where auth.uid() is not null and auth_user_id = auth.uid()
    limit 1
  )
  select gp.permission
  from me
  cross join lateral (
    select rp.permission
    from public.role_permissions rp
    where me.role_id is not null and rp.role_id = me.role_id

    union

    select scp.permission
    from public.staff_custom_permissions scp
    where scp.staff_id = me.id and scp.granted = true

    except

    select scp.permission
    from public.staff_custom_permissions scp
    where scp.staff_id = me.id and scp.granted = false
  ) gp;
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null or p_permission is null then false
    when (select public.is_admin()) then true
    else exists (
      select 1
      from public.get_my_permissions() gp
      where gp.permission = p_permission
    )
  end;
$$;

revoke all on function public.get_staff_permissions(uuid) from public, anon, authenticated;
grant execute on function public.get_staff_permissions(uuid) to service_role;

revoke all on function public.get_my_permissions() from public, anon;
grant execute on function public.get_my_permissions() to authenticated;

revoke all on function public.has_permission(text) from public, anon;
grant execute on function public.has_permission(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. H2.7: Atomic RPC for saving role permissions cleanly
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
  if not (select public.has_permission('staff.manage')) then
    raise exception 'Permission denied';
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

revoke all on function public.save_role_permissions(uuid, text[]) from public, anon;
grant execute on function public.save_role_permissions(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------
-- 4. H2.1: Allow staff to read their own custom overrides
-- ---------------------------------------------------------------------
drop policy if exists staff_custom_permissions_self_select on public.staff_custom_permissions;
create policy staff_custom_permissions_self_select on public.staff_custom_permissions
  for select to authenticated
  using (staff_id = (select id from public.staff_users where auth_user_id = auth.uid()));

drop policy if exists staff_custom_permissions_admin_all on public.staff_custom_permissions;
create policy staff_custom_permissions_admin_all on public.staff_custom_permissions
  for all to authenticated
  using ((select public.has_permission('staff.manage')))
  with check ((select public.has_permission('staff.manage')));

drop policy if exists roles_admin_write on public.roles;
create policy roles_admin_write on public.roles
  for all to authenticated
  using ((select public.has_permission('staff.manage')))
  with check ((select public.has_permission('staff.manage')));

drop policy if exists role_permissions_admin_write on public.role_permissions;
create policy role_permissions_admin_write on public.role_permissions
  for all to authenticated
  using ((select public.has_permission('staff.manage')))
  with check ((select public.has_permission('staff.manage')));

-- ---------------------------------------------------------------------
-- 5. H2.2: Enforce has_permission() across all CRM tables
-- (Existing mobile customer _own and _read policies remain intact.)
-- ---------------------------------------------------------------------

-- ---- staff_users ----
drop policy if exists staff_users_select_self_or_admin on public.staff_users;
create policy staff_users_select_self_or_admin on public.staff_users
  for select to authenticated
  using (
    auth_user_id = (select auth.uid())
    or (select public.has_permission('staff.manage'))
  );

drop policy if exists staff_users_admin_write on public.staff_users;
create policy staff_users_admin_write on public.staff_users
  for all to authenticated
  using ((select public.has_permission('staff.manage')))
  with check ((select public.has_permission('staff.manage')));

-- ---- users ----
drop policy if exists users_staff_all    on public.users;
drop policy if exists users_staff_select on public.users;
drop policy if exists users_staff_insert on public.users;
drop policy if exists users_staff_update on public.users;
drop policy if exists users_staff_delete on public.users;

create policy users_staff_select on public.users
  for select to authenticated
  using (
    (select public.has_permission('clients.view'))
    or (select public.has_permission('dashboard.view'))
    or (select public.has_permission('policies.view'))
    or (select public.has_permission('quotes.view'))
    or (select public.has_permission('support.view'))
    or (select public.has_permission('ads.view'))
    or (select public.has_permission('notifications.view'))
    or (select public.has_permission('datagrid.view'))
    or (select public.has_permission('import.import'))
    or (select public.has_permission('reports.view'))
  );

create policy users_staff_insert on public.users
  for insert to authenticated
  with check (
    (select public.has_permission('clients.create'))
    or (select public.has_permission('policies.create'))
    or (select public.has_permission('import.import'))
  );

create policy users_staff_update on public.users
  for update to authenticated
  using (
    (select public.has_permission('clients.create'))
    or (select public.has_permission('import.import'))
  )
  with check (
    (select public.has_permission('clients.create'))
    or (select public.has_permission('import.import'))
  );

create policy users_staff_delete on public.users
  for delete to authenticated
  using ((select public.has_permission('import.import')));

-- ---- family_members ----
drop policy if exists family_members_staff_all    on public.family_members;
drop policy if exists family_members_staff_select on public.family_members;
drop policy if exists family_members_staff_write  on public.family_members;
drop policy if exists family_members_staff_insert on public.family_members;
drop policy if exists family_members_staff_update on public.family_members;
drop policy if exists family_members_staff_delete on public.family_members;

create policy family_members_staff_select on public.family_members
  for select to authenticated
  using ((select public.has_permission('clients.view')));

create policy family_members_staff_insert on public.family_members
  for insert to authenticated
  with check ((select public.has_permission('clients.create')));

create policy family_members_staff_update on public.family_members
  for update to authenticated
  using ((select public.has_permission('clients.create')))
  with check ((select public.has_permission('clients.create')));

create policy family_members_staff_delete on public.family_members
  for delete to authenticated
  using ((select public.has_permission('clients.create')));

-- ---- policies ----
drop policy if exists policies_staff_all    on public.policies;
drop policy if exists policies_staff_select on public.policies;
drop policy if exists policies_staff_insert on public.policies;
drop policy if exists policies_staff_update on public.policies;
drop policy if exists policies_staff_delete on public.policies;

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
  );

create policy policies_staff_insert on public.policies
  for insert to authenticated
  with check (
    (select public.has_permission('policies.create'))
    or (select public.has_permission('import.import'))
    or (select public.has_permission('claims.approve'))
  );

create policy policies_staff_update on public.policies
  for update to authenticated
  using (
    (select public.has_permission('policies.edit'))
    or (select public.has_permission('policies.verify'))
    or (select public.has_permission('datagrid.edit'))
    or (select public.has_permission('import.import'))
  )
  with check (
    (select public.has_permission('policies.edit'))
    or (select public.has_permission('policies.verify'))
    or (select public.has_permission('datagrid.edit'))
    or (select public.has_permission('import.import'))
  );

create policy policies_staff_delete on public.policies
  for delete to authenticated
  using (
    (select public.has_permission('policies.delete'))
    or (select public.has_permission('import.import'))
  );

-- ---- policy_documents ----
drop policy if exists policy_documents_staff_all    on public.policy_documents;
drop policy if exists policy_documents_staff_select on public.policy_documents;
drop policy if exists policy_documents_staff_insert on public.policy_documents;
drop policy if exists policy_documents_staff_update on public.policy_documents;
drop policy if exists policy_documents_staff_delete on public.policy_documents;

create policy policy_documents_staff_select on public.policy_documents
  for select to authenticated
  using (
    (select public.has_permission('policies.view'))
    or (select public.has_permission('quotes.view'))
  );

create policy policy_documents_staff_insert on public.policy_documents
  for insert to authenticated
  with check (
    (select public.has_permission('policies.create'))
    or (select public.has_permission('policies.edit'))
  );

create policy policy_documents_staff_update on public.policy_documents
  for update to authenticated
  using ((select public.has_permission('policies.edit')))
  with check ((select public.has_permission('policies.edit')));

create policy policy_documents_staff_delete on public.policy_documents
  for delete to authenticated
  using (
    (select public.has_permission('policies.edit'))
    or (select public.has_permission('policies.delete'))
  );

-- ---- storage.objects (DOCUMENTS bucket) ----
drop policy if exists documents_staff_all    on storage.objects;
drop policy if exists documents_staff_select on storage.objects;
drop policy if exists documents_staff_insert on storage.objects;
drop policy if exists documents_staff_update on storage.objects;
drop policy if exists documents_staff_delete on storage.objects;

create policy documents_staff_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'DOCUMENTS'
    and (
      (select public.has_permission('policies.view'))
      or (select public.has_permission('quotes.view'))
    )
  );

create policy documents_staff_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'DOCUMENTS'
    and (
      (select public.has_permission('policies.create'))
      or (select public.has_permission('policies.edit'))
    )
  );

create policy documents_staff_update on storage.objects
  for update to authenticated
  using (bucket_id = 'DOCUMENTS' and (select public.has_permission('policies.edit')))
  with check (bucket_id = 'DOCUMENTS' and (select public.has_permission('policies.edit')));

create policy documents_staff_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'DOCUMENTS'
    and (
      (select public.has_permission('policies.edit'))
      or (select public.has_permission('policies.delete'))
    )
  );

-- ---- renewals ----
drop policy if exists renewals_staff_all    on public.renewals;
drop policy if exists renewals_staff_select on public.renewals;
drop policy if exists renewals_staff_insert on public.renewals;
drop policy if exists renewals_staff_update on public.renewals;
drop policy if exists renewals_staff_delete on public.renewals;

create policy renewals_staff_select on public.renewals
  for select to authenticated
  using (
    (select public.has_permission('renewals.view'))
    or (select public.has_permission('renewals.update'))
    or (select public.has_permission('policies.view'))
    or (select public.has_permission('dashboard.view'))
    or (select public.has_permission('reports.view'))
  );

create policy renewals_staff_insert on public.renewals
  for insert to authenticated
  with check ((select public.has_permission('renewals.update')));

create policy renewals_staff_update on public.renewals
  for update to authenticated
  using ((select public.has_permission('renewals.update')))
  with check ((select public.has_permission('renewals.update')));

create policy renewals_staff_delete on public.renewals
  for delete to authenticated
  using ((select public.has_permission('policies.delete')));

-- ---- quote_requests ----
drop policy if exists quote_requests_staff_all    on public.quote_requests;
drop policy if exists quote_requests_staff_select on public.quote_requests;
drop policy if exists quote_requests_staff_insert on public.quote_requests;
drop policy if exists quote_requests_staff_update on public.quote_requests;
drop policy if exists quote_requests_staff_delete on public.quote_requests;

create policy quote_requests_staff_select on public.quote_requests
  for select to authenticated
  using (
    (select public.has_permission('quotes.view'))
    or (select public.has_permission('quotes.update'))
    or (select public.has_permission('policies.view'))
  );

create policy quote_requests_staff_insert on public.quote_requests
  for insert to authenticated
  with check ((select public.has_permission('quotes.update')));

create policy quote_requests_staff_update on public.quote_requests
  for update to authenticated
  using ((select public.has_permission('quotes.update')))
  with check ((select public.has_permission('quotes.update')));

create policy quote_requests_staff_delete on public.quote_requests
  for delete to authenticated
  using ((select public.is_admin()));

-- ---- support_tickets ----
drop policy if exists support_tickets_staff_all    on public.support_tickets;
drop policy if exists support_tickets_staff_select on public.support_tickets;
drop policy if exists support_tickets_staff_insert on public.support_tickets;
drop policy if exists support_tickets_staff_update on public.support_tickets;
drop policy if exists support_tickets_staff_delete on public.support_tickets;

create policy support_tickets_staff_select on public.support_tickets
  for select to authenticated
  using (
    (select public.has_permission('support.view'))
    or (select public.has_permission('support.update'))
  );

create policy support_tickets_staff_insert on public.support_tickets
  for insert to authenticated
  with check ((select public.has_permission('support.update')));

create policy support_tickets_staff_update on public.support_tickets
  for update to authenticated
  using ((select public.has_permission('support.update')))
  with check ((select public.has_permission('support.update')));

create policy support_tickets_staff_delete on public.support_tickets
  for delete to authenticated
  using ((select public.is_admin()));

-- ---- claims ----
drop policy if exists claims_staff_select on public.claims;
drop policy if exists claims_staff_insert on public.claims;
drop policy if exists claims_staff_update on public.claims;
drop policy if exists claims_admin_delete on public.claims;

create policy claims_staff_select on public.claims
  for select to authenticated
  using (
    (select public.has_permission('claims.view'))
    or (select public.has_permission('claims.create'))
    or (select public.has_permission('claims.approve'))
  );

create policy claims_staff_insert on public.claims
  for insert to authenticated
  with check ((select public.has_permission('claims.create')));

create policy claims_staff_update on public.claims
  for update to authenticated
  using ((select public.has_permission('claims.approve')))
  with check ((select public.has_permission('claims.approve')));

create policy claims_admin_delete on public.claims
  for delete to authenticated
  using ((select public.is_admin()));

-- ---- notifications, templates, device_tokens ----
drop policy if exists notifications_staff_all    on public.notifications;
drop policy if exists notifications_staff_select on public.notifications;
drop policy if exists notifications_staff_insert on public.notifications;
drop policy if exists notifications_staff_update on public.notifications;
drop policy if exists notifications_staff_delete on public.notifications;

create policy notifications_staff_select on public.notifications
  for select to authenticated
  using ((select public.has_permission('notifications.view')));

create policy notifications_staff_insert on public.notifications
  for insert to authenticated
  with check ((select public.has_permission('notifications.send')));

create policy notifications_staff_update on public.notifications
  for update to authenticated
  using ((select public.has_permission('notifications.send')))
  with check ((select public.has_permission('notifications.send')));

create policy notifications_staff_delete on public.notifications
  for delete to authenticated
  using ((select public.has_permission('notifications.send')));

drop policy if exists templates_staff_all    on public.templates;
drop policy if exists templates_staff_select on public.templates;
drop policy if exists templates_staff_insert on public.templates;
drop policy if exists templates_staff_update on public.templates;
drop policy if exists templates_staff_delete on public.templates;

create policy templates_staff_select on public.templates
  for select to authenticated
  using ((select public.has_permission('notifications.view')));

create policy templates_staff_insert on public.templates
  for insert to authenticated
  with check ((select public.has_permission('notifications.send')));

create policy templates_staff_update on public.templates
  for update to authenticated
  using ((select public.has_permission('notifications.send')))
  with check ((select public.has_permission('notifications.send')));

create policy templates_staff_delete on public.templates
  for delete to authenticated
  using ((select public.has_permission('notifications.send')));

drop policy if exists device_tokens_staff_all    on public.device_tokens;
drop policy if exists device_tokens_staff_select on public.device_tokens;
drop policy if exists device_tokens_staff_insert on public.device_tokens;
drop policy if exists device_tokens_staff_update on public.device_tokens;
drop policy if exists device_tokens_staff_delete on public.device_tokens;

create policy device_tokens_staff_select on public.device_tokens
  for select to authenticated
  using (
    (select public.has_permission('notifications.view'))
    or (select public.has_permission('notifications.send'))
  );

create policy device_tokens_staff_insert on public.device_tokens
  for insert to authenticated
  with check ((select public.has_permission('notifications.send')));

create policy device_tokens_staff_update on public.device_tokens
  for update to authenticated
  using ((select public.has_permission('notifications.send')))
  with check ((select public.has_permission('notifications.send')));

create policy device_tokens_staff_delete on public.device_tokens
  for delete to authenticated
  using ((select public.has_permission('notifications.send')));

-- ---- placements ----
drop policy if exists placements_staff_all    on public.placements;
drop policy if exists placements_staff_select on public.placements;
drop policy if exists placements_staff_insert on public.placements;
drop policy if exists placements_staff_update on public.placements;
drop policy if exists placements_staff_delete on public.placements;

create policy placements_staff_select on public.placements
  for select to authenticated
  using ((select public.has_permission('placements.view')));

create policy placements_staff_insert on public.placements
  for insert to authenticated
  with check ((select public.has_permission('placements.manage')));

create policy placements_staff_update on public.placements
  for update to authenticated
  using ((select public.has_permission('placements.manage')))
  with check ((select public.has_permission('placements.manage')));

create policy placements_staff_delete on public.placements
  for delete to authenticated
  using ((select public.has_permission('placements.manage')));

-- ---- ad_slots & ad_settings ----
drop policy if exists ad_slots_staff_all    on public.ad_slots;
drop policy if exists ad_slots_staff_insert on public.ad_slots;
drop policy if exists ad_slots_staff_update on public.ad_slots;
drop policy if exists ad_slots_staff_delete on public.ad_slots;

create policy ad_slots_staff_insert on public.ad_slots
  for insert to authenticated
  with check ((select public.has_permission('ads.manage')));

create policy ad_slots_staff_update on public.ad_slots
  for update to authenticated
  using ((select public.has_permission('ads.manage')))
  with check ((select public.has_permission('ads.manage')));

create policy ad_slots_staff_delete on public.ad_slots
  for delete to authenticated
  using ((select public.has_permission('ads.manage')));

drop policy if exists ad_settings_staff_all    on public.ad_settings;
drop policy if exists ad_settings_staff_select on public.ad_settings;
drop policy if exists ad_settings_staff_insert on public.ad_settings;
drop policy if exists ad_settings_staff_update on public.ad_settings;
drop policy if exists ad_settings_staff_delete on public.ad_settings;

create policy ad_settings_staff_select on public.ad_settings
  for select to authenticated
  using ((select public.has_permission('ads.view')));

create policy ad_settings_staff_insert on public.ad_settings
  for insert to authenticated
  with check ((select public.has_permission('ads.manage')));

create policy ad_settings_staff_update on public.ad_settings
  for update to authenticated
  using ((select public.has_permission('ads.manage')))
  with check ((select public.has_permission('ads.manage')));

create policy ad_settings_staff_delete on public.ad_settings
  for delete to authenticated
  using ((select public.has_permission('ads.manage')));

-- ---- app_settings ----
drop policy if exists app_settings_staff_all    on public.app_settings;
drop policy if exists app_settings_staff_insert on public.app_settings;
drop policy if exists app_settings_staff_update on public.app_settings;
drop policy if exists app_settings_staff_delete on public.app_settings;

create policy app_settings_staff_insert on public.app_settings
  for insert to authenticated
  with check ((select public.has_permission('settings.edit')));

create policy app_settings_staff_update on public.app_settings
  for update to authenticated
  using ((select public.has_permission('settings.edit')))
  with check ((select public.has_permission('settings.edit')));

create policy app_settings_staff_delete on public.app_settings
  for delete to authenticated
  using ((select public.has_permission('settings.edit')));

-- ---- insurers & policy_types ----
drop policy if exists insurers_staff_all    on public.insurers;
drop policy if exists insurers_staff_insert on public.insurers;
drop policy if exists insurers_staff_update on public.insurers;
drop policy if exists insurers_admin_delete on public.insurers;

create policy insurers_staff_insert on public.insurers
  for insert to authenticated
  with check (
    (select public.has_permission('policies.create'))
    or (select public.has_permission('policies.edit'))
    or (select public.has_permission('datagrid.edit'))
    or (select public.has_permission('import.import'))
    or (select public.has_permission('claims.approve'))
  );

create policy insurers_staff_update on public.insurers
  for update to authenticated
  using (
    (select public.has_permission('policies.create'))
    or (select public.has_permission('policies.edit'))
    or (select public.has_permission('datagrid.edit'))
    or (select public.has_permission('import.import'))
    or (select public.has_permission('claims.approve'))
  )
  with check (
    (select public.has_permission('policies.create'))
    or (select public.has_permission('policies.edit'))
    or (select public.has_permission('datagrid.edit'))
    or (select public.has_permission('import.import'))
    or (select public.has_permission('claims.approve'))
  );

create policy insurers_admin_delete on public.insurers
  for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists policy_types_staff_all    on public.policy_types;
drop policy if exists policy_types_staff_insert on public.policy_types;
drop policy if exists policy_types_staff_update on public.policy_types;
drop policy if exists policy_types_admin_delete on public.policy_types;

create policy policy_types_staff_insert on public.policy_types
  for insert to authenticated
  with check (
    (select public.has_permission('policies.create'))
    or (select public.has_permission('policies.edit'))
    or (select public.has_permission('import.import'))
    or (select public.has_permission('claims.approve'))
  );

create policy policy_types_staff_update on public.policy_types
  for update to authenticated
  using (
    (select public.has_permission('policies.create'))
    or (select public.has_permission('policies.edit'))
    or (select public.has_permission('import.import'))
    or (select public.has_permission('claims.approve'))
  )
  with check (
    (select public.has_permission('policies.create'))
    or (select public.has_permission('policies.edit'))
    or (select public.has_permission('import.import'))
    or (select public.has_permission('claims.approve'))
  );

create policy policy_types_admin_delete on public.policy_types
  for delete to authenticated
  using ((select public.is_admin()));

-- ---- import_batches ----
drop policy if exists import_batches_staff_select on public.import_batches;
drop policy if exists import_batches_staff_insert on public.import_batches;
drop policy if exists import_batches_staff_update on public.import_batches;
drop policy if exists import_batches_admin_delete on public.import_batches;

create policy import_batches_staff_select on public.import_batches
  for select to authenticated
  using (
    (select public.has_permission('import.view'))
    or (select public.has_permission('import.import'))
  );

create policy import_batches_staff_insert on public.import_batches
  for insert to authenticated
  with check ((select public.has_permission('import.import')));

create policy import_batches_staff_update on public.import_batches
  for update to authenticated
  using ((select public.has_permission('import.import')))
  with check ((select public.has_permission('import.import')));

create policy import_batches_admin_delete on public.import_batches
  for delete to authenticated
  using (
    (select public.has_permission('import.import'))
    or (select public.is_admin())
  );

-- ---- grid_columns ----
drop policy if exists grid_columns_staff_select on public.grid_columns;
drop policy if exists grid_columns_admin_write  on public.grid_columns;

create policy grid_columns_staff_select on public.grid_columns
  for select to authenticated
  using (
    (select public.has_permission('datagrid.view'))
    or (select public.has_permission('import.view'))
    or (select public.has_permission('import.import'))
    or (select public.has_permission('import.lookup'))
  );

create policy grid_columns_admin_write on public.grid_columns
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

commit;
