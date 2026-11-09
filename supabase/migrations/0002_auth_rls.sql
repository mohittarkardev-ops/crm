-- =====================================================================
-- SecureDrive - 0002_auth_rls.sql
-- Run once in Supabase: SQL Editor > New query > paste all > Run.
-- Safe to re-run (idempotent). Everything runs in ONE transaction:
-- if any statement fails, nothing is applied.
--
-- What this does
--   1. Links public.users / public.staff_users to Supabase Auth
--   2. Schema fixes (start_date, policy_types.code, notification kind, etc.)
--   3. Auto status + verification triggers, updated_at triggers
--   4. Row Level Security policies for every table
--   5. Storage limits + policies for the private "DOCUMENTS" bucket
--   6. Helper functions: link_current_user(), delete_my_account()
--
-- Assumptions (change here if wrong)
--   * policies.due_date is the policy END date (the app maps it to endDate)
--   * User-added policies start as 'unverified'; advisor-added are 'verified'
--   * Mobile numbers are Indian, stored as +91XXXXXXXXXX
--   * Storage path convention: {users.id}/{policy_id}/{file}
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Small helpers
-- ---------------------------------------------------------------------
create or replace function public.today_ist()
returns date language sql stable as $$
  select (now() at time zone 'Asia/Kolkata')::date
$$;

create or replace function public.normalize_mobile(p text)
returns text language sql immutable as $$
  select case
    when p is null or length(regexp_replace(p, '\D', '', 'g')) < 10 then null
    else '+91' || right(regexp_replace(p, '\D', '', 'g'), 10)
  end
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 1. Link tables to Supabase Auth
-- ---------------------------------------------------------------------
alter table public.users
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete set null,
  add column if not exists date_of_birth date,
  add column if not exists consent_accepted_at timestamptz,
  add column if not exists consent_version text;

-- Format check applies to NEW rows only (NOT VALID), so old test rows cannot block this script.
alter table public.users drop constraint if exists users_mobile_format_check;
alter table public.users
  add constraint users_mobile_format_check check (mobile_number ~ '^\+91[6-9][0-9]{9}$') not valid;

alter table public.staff_users
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete cascade;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists ad_settings_set_updated_at on public.ad_settings;
create trigger ad_settings_set_updated_at before update on public.ad_settings
  for each row execute function public.set_updated_at();

-- Who is the logged-in person? (SECURITY DEFINER so RLS policies can call it without recursion)
create or replace function public.current_user_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.users where auth_user_id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_users where auth_user_id = auth.uid())
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_users where auth_user_id = auth.uid() and role = 'admin')
$$;

-- Called by the app right after OTP login. Links the verified phone to the advisor-uploaded
-- row (if one exists) or creates a general-user row. Also stores name + consent on register.
create or replace function public.link_current_user(
  p_full_name text default null,
  p_consent_version text default null
)
returns public.users
language plpgsql security definer set search_path = public, auth as $$
declare
  v_phone  text;
  v_mobile text;
  v_user   public.users;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_user from public.users where auth_user_id = auth.uid();

  if not found then
    select phone into v_phone from auth.users where id = auth.uid();
    v_mobile := public.normalize_mobile(v_phone);
    if v_mobile is null then
      raise exception 'this account has no phone number';
    end if;

    select * into v_user
      from public.users
      where mobile_number = v_mobile and auth_user_id is null
      for update;

    if found then
      update public.users set auth_user_id = auth.uid() where id = v_user.id returning * into v_user;
    else
      insert into public.users (mobile_number, auth_user_id)
        values (v_mobile, auth.uid()) returning * into v_user;
    end if;
  end if;

  if p_full_name is not null and coalesce(v_user.full_name, '') = '' then
    update public.users set full_name = trim(p_full_name) where id = v_user.id returning * into v_user;
  end if;

  if p_consent_version is not null and v_user.consent_accepted_at is null then
    update public.users
      set consent_accepted_at = now(), consent_version = p_consent_version
      where id = v_user.id returning * into v_user;
  end if;

  return v_user;
end $$;

-- In-app account deletion (Play Store / DPDP requirement).
-- Deletes the user's rows (policies, documents rows, notifications... cascade) and the login.
-- NOTE: files in Storage are not removed by SQL; delete them via the Storage API.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  delete from public.users where auth_user_id = v_uid;
  delete from auth.users where id = v_uid;
end $$;

-- ---------------------------------------------------------------------
-- 2. Reference data: policy_types.code + insurers
-- ---------------------------------------------------------------------
alter table public.policy_types add column if not exists code text;

alter table public.policy_types drop constraint if exists policy_types_code_check;
alter table public.policy_types
  add constraint policy_types_code_check check (code is null or code in ('car', 'bike', 'health', 'term', 'other'));

update public.policy_types
set code = case
  when lower(name) ~ '(health|medical|mediclaim|care)' then 'health'
  when lower(name) ~ '(term|life)'                    then 'term'
  when lower(name) ~ '(two|bike|scooter|moped|motorcycle)' then 'bike'
  when lower(name) ~ '(car|four|motor|vehicle)'       then 'car'
  else 'other'
end
where code is null;

-- Keep only one row per code before the unique index (oldest wins; policies re-pointed).
update public.policies p
set type_id = keep.id
from public.policy_types t
join (
  select code, (array_agg(id order by created_at, id))[1] as id
  from public.policy_types where code is not null group by code
) keep on keep.code = t.code
where p.type_id = t.id and t.id <> keep.id;

delete from public.policy_types t
using (
  select code, (array_agg(id order by created_at, id))[1] as id
  from public.policy_types where code is not null group by code
) keep
where t.code = keep.code and t.id <> keep.id;

create unique index if not exists policy_types_code_key on public.policy_types (code) where code is not null;

insert into public.policy_types (name, code)
select v.name, v.code
from (values ('Car', 'car'), ('Two Wheeler', 'bike'), ('Health', 'health'), ('Term Life', 'term'), ('Other', 'other')) as v(name, code)
where not exists (select 1 from public.policy_types t where t.code = v.code);

create unique index if not exists insurers_name_key on public.insurers (lower(name));

insert into public.insurers (name) values
  ('HDFC ERGO'), ('ICICI Lombard'), ('Bajaj Allianz'), ('Tata AIG'), ('New India Assurance'),
  ('United India Insurance'), ('National Insurance'), ('Oriental Insurance'), ('SBI General'),
  ('Reliance General'), ('Royal Sundaram'), ('Cholamandalam MS'), ('Digit'), ('Acko'),
  ('Star Health'), ('Care Health'), ('Niva Bupa'), ('Aditya Birla Health'), ('ManipalCigna'),
  ('HDFC Life'), ('LIC of India'), ('ICICI Prudential Life'), ('SBI Life'), ('Max Life'),
  ('Tata AIA Life'), ('Bajaj Allianz Life'), ('Kotak Life'), ('Aditya Birla Sun Life')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 3. policies
-- ---------------------------------------------------------------------
alter table public.policies
  add column if not exists start_date   date,
  add column if not exists insurer_name text;   -- free text when the insurer is not in the list / read by OCR

comment on column public.policies.due_date is 'Policy END date (renewal due date). The app maps this to endDate.';
comment on column public.policies.insurer_name is 'Raw insurer name when insurer_id is null (user typed it or OCR read it).';
comment on column public.policies.status is 'Maintained by trigger + daily refresh_policy_statuses(). The app also derives it from due_date.';

update public.policies set source = 'user_added' where source is null;
update public.policies set verification_status = 'verified' where verification_status is null;

alter table public.policies
  alter column source set default 'user_added',
  alter column source set not null,
  alter column verification_status set default 'unverified',
  alter column verification_status set not null;

alter table public.policies drop constraint if exists policies_dates_check;
alter table public.policies
  add constraint policies_dates_check check (start_date is null or due_date >= start_date);

create or replace function public.policies_before_write()
returns trigger language plpgsql as $$
begin
  new.status := case
    when new.due_date < public.today_ist()      then 'Expired'
    when new.due_date <= public.today_ist() + 30 then 'Expiring Soon'
    else 'Active'
  end;

  if tg_op = 'INSERT' and new.source = 'advisor_added' then
    new.verification_status := 'verified';
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists policies_before_write on public.policies;
create trigger policies_before_write before insert or update on public.policies
  for each row execute function public.policies_before_write();

-- Run daily so "Expiring Soon" / "Expired" stay correct without anyone editing the row.
create or replace function public.refresh_policy_statuses()
returns integer language plpgsql as $$
declare
  n integer;
begin
  update public.policies p
  set status = case
    when p.due_date < public.today_ist()       then 'Expired'
    when p.due_date <= public.today_ist() + 30 then 'Expiring Soon'
    else 'Active'
  end
  where p.status is distinct from case
    when p.due_date < public.today_ist()       then 'Expired'
    when p.due_date <= public.today_ist() + 30 then 'Expiring Soon'
    else 'Active'
  end;
  get diagnostics n = row_count;
  return n;
end $$;

-- Backfill current rows once.
select public.refresh_policy_statuses();

-- Optional: schedule daily at 00:05 IST (18:35 UTC) after enabling the pg_cron extension.
-- select cron.schedule('refresh-policy-statuses', '35 18 * * *', 'select public.refresh_policy_statuses()');

create index if not exists policies_user_due_idx on public.policies (user_id, due_date);
create index if not exists policies_due_idx      on public.policies (due_date);
create index if not exists policies_insurer_idx  on public.policies (insurer_id);
create index if not exists policy_documents_policy_idx on public.policy_documents (policy_id);
create index if not exists renewals_policy_idx   on public.renewals (policy_id);

-- ---------------------------------------------------------------------
-- 4. notifications, device_tokens, quotes, placements, ads
-- ---------------------------------------------------------------------
alter table public.notifications
  add column if not exists kind text not null default 'announcement',
  add column if not exists policy_id uuid references public.policies (id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check check (kind in ('renewal', 'offer', 'greeting', 'announcement'));

update public.notifications set is_read = false where is_read is null;
alter table public.notifications alter column is_read set not null;

create index if not exists notifications_user_sent_idx on public.notifications (user_id, sent_at desc);

create unique index if not exists device_tokens_token_key on public.device_tokens (token);
create index if not exists device_tokens_user_idx on public.device_tokens (user_id);

create index if not exists quote_requests_user_idx   on public.quote_requests (user_id);
create index if not exists quote_requests_status_idx on public.quote_requests (status);
create index if not exists support_tickets_user_idx  on public.support_tickets (user_id);

alter table public.placements
  add column if not exists body       text,
  add column if not exists cta_label  text,
  add column if not exists starts_at  timestamptz,
  add column if not exists ends_at    timestamptz,
  add column if not exists sort_order integer not null default 0;

create unique index if not exists ad_settings_user_key on public.ad_settings (user_id);

-- Global ad-slot switches (CRM can flip these without an app release).
create table if not exists public.ad_slots (
  slot_name  text primary key,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

drop trigger if exists ad_slots_set_updated_at on public.ad_slots;
create trigger ad_slots_set_updated_at before update on public.ad_slots
  for each row execute function public.set_updated_at();

insert into public.ad_slots (slot_name) values ('home_native'), ('policies_native'), ('updates_native')
on conflict do nothing;

-- Dependants and nominees (in the blueprint, missing from the first schema).
create table if not exists public.family_members (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  full_name     text not null,
  relation      text,
  date_of_birth date,
  is_nominee    boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists family_members_user_idx on public.family_members (user_id);

-- ---------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------
alter table public.ad_slots        enable row level security;
alter table public.family_members  enable row level security;

-- Start clean so this script can be re-run: drop every existing policy in public.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Anonymous (not logged in) users get no table access at all.
revoke all on all tables in schema public from anon;

-- Users may only edit these columns of their own profile (not is_advisor_client, mobile_number...).
revoke update on public.users from authenticated;
grant  update (full_name, email, date_of_birth) on public.users to authenticated;

-- Users may only flip is_read on their notifications.
revoke update on public.notifications from authenticated;
grant  update (is_read) on public.notifications to authenticated;

-- ---- Staff (advisor + team): full access to everything -----------------
do $$
declare t text;
begin
  foreach t in array array[
    'users','family_members','policies','policy_documents','renewals','quote_requests',
    'notifications','templates','placements','device_tokens','support_tickets',
    'ad_settings','ad_slots','insurers','policy_types'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))',
      t || '_staff_all', t);
  end loop;
end $$;

-- ---- users -------------------------------------------------------------
create policy users_select_own on public.users
  for select to authenticated using (auth_user_id = (select auth.uid()));
create policy users_update_own on public.users
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

-- ---- family_members ----------------------------------------------------
create policy family_members_own on public.family_members
  for all to authenticated
  using (user_id = (select public.current_user_id()))
  with check (user_id = (select public.current_user_id()));

-- ---- policies ----------------------------------------------------------
create policy policies_select_own on public.policies
  for select to authenticated using (user_id = (select public.current_user_id()));

create policy policies_insert_own on public.policies
  for insert to authenticated
  with check (
    user_id = (select public.current_user_id())
    and source = 'user_added'
    and verification_status = 'unverified'
  );

create policy policies_update_own on public.policies
  for update to authenticated
  using (user_id = (select public.current_user_id()) and source = 'user_added')
  with check (
    user_id = (select public.current_user_id())
    and source = 'user_added'
    and verification_status = 'unverified'
  );

create policy policies_delete_own on public.policies
  for delete to authenticated
  using (user_id = (select public.current_user_id()) and source = 'user_added');

-- ---- policy_documents (rows) ------------------------------------------
create policy policy_documents_select_own on public.policy_documents
  for select to authenticated
  using (exists (select 1 from public.policies p
                 where p.id = policy_id and p.user_id = (select public.current_user_id())));

create policy policy_documents_insert_own on public.policy_documents
  for insert to authenticated
  with check (exists (select 1 from public.policies p
                      where p.id = policy_id and p.user_id = (select public.current_user_id())
                        and p.source = 'user_added'));

create policy policy_documents_delete_own on public.policy_documents
  for delete to authenticated
  using (exists (select 1 from public.policies p
                 where p.id = policy_id and p.user_id = (select public.current_user_id())
                   and p.source = 'user_added'));

-- ---- renewals ----------------------------------------------------------
create policy renewals_select_own on public.renewals
  for select to authenticated
  using (exists (select 1 from public.policies p
                 where p.id = policy_id and p.user_id = (select public.current_user_id())));

-- ---- quote_requests ----------------------------------------------------
create policy quote_requests_select_own on public.quote_requests
  for select to authenticated using (user_id = (select public.current_user_id()));

create policy quote_requests_insert_own on public.quote_requests
  for insert to authenticated
  with check (
    user_id = (select public.current_user_id())
    and status = 'new'
    and (policy_id is null or exists (select 1 from public.policies p
                                      where p.id = policy_id and p.user_id = (select public.current_user_id())))
  );

-- ---- notifications -----------------------------------------------------
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = (select public.current_user_id()));
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select public.current_user_id()))
  with check (user_id = (select public.current_user_id()));

-- ---- device_tokens -----------------------------------------------------
create policy device_tokens_own on public.device_tokens
  for all to authenticated
  using (user_id = (select public.current_user_id()))
  with check (user_id = (select public.current_user_id()));

-- ---- support_tickets ---------------------------------------------------
create policy support_tickets_select_own on public.support_tickets
  for select to authenticated using (user_id = (select public.current_user_id()));
create policy support_tickets_insert_own on public.support_tickets
  for insert to authenticated
  with check (user_id = (select public.current_user_id()) and status = 'open');

-- ---- ad_settings -------------------------------------------------------
create policy ad_settings_select_own on public.ad_settings
  for select to authenticated using (user_id = (select public.current_user_id()));

-- ---- reference + content tables: any logged-in user can read -----------
create policy insurers_read     on public.insurers     for select to authenticated using (true);
create policy policy_types_read on public.policy_types for select to authenticated using (true);
create policy ad_slots_read     on public.ad_slots     for select to authenticated using (true);

create policy placements_read_active on public.placements
  for select to authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >  now())
  );

-- templates: staff only (policy created above)

-- ---- staff_users / audit_logs -----------------------------------------
create policy staff_users_select_self_or_admin on public.staff_users
  for select to authenticated using (auth_user_id = (select auth.uid()) or (select public.is_admin()));
create policy staff_users_admin_write on public.staff_users
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy audit_logs_staff_insert on public.audit_logs
  for insert to authenticated with check ((select public.is_staff()));
create policy audit_logs_admin_select on public.audit_logs
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 6. Function permissions
-- ---------------------------------------------------------------------
revoke execute on function public.link_current_user(text, text) from public, anon;
revoke execute on function public.delete_my_account()            from public, anon;
revoke execute on function public.current_user_id()              from public, anon;
revoke execute on function public.is_staff()                     from public, anon;
revoke execute on function public.is_admin()                     from public, anon;
revoke execute on function public.refresh_policy_statuses()      from public, anon, authenticated;

grant execute on function public.link_current_user(text, text) to authenticated;
grant execute on function public.delete_my_account()            to authenticated;
grant execute on function public.current_user_id()              to authenticated;
grant execute on function public.is_staff()                     to authenticated;
grant execute on function public.is_admin()                     to authenticated;
grant execute on function public.refresh_policy_statuses()      to service_role;

-- ---------------------------------------------------------------------
-- 7. Storage: private "DOCUMENTS" bucket (path: {users.id}/{policy_id}/{file})
-- ---------------------------------------------------------------------
update storage.buckets
set public = false,
    file_size_limit = 10485760,  -- 10 MB
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where id = 'DOCUMENTS';

do $$
declare r record;
begin
  for r in select policyname from pg_policies
           where schemaname = 'storage' and tablename = 'objects' and policyname like 'documents\_%' loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

create policy documents_staff_all on storage.objects
  for all to authenticated
  using (bucket_id = 'DOCUMENTS' and (select public.is_staff()))
  with check (bucket_id = 'DOCUMENTS' and (select public.is_staff()));

create policy documents_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'DOCUMENTS' and (storage.foldername(name))[1] = (select public.current_user_id())::text);

create policy documents_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'DOCUMENTS' and (storage.foldername(name))[1] = (select public.current_user_id())::text);

create policy documents_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'DOCUMENTS' and (storage.foldername(name))[1] = (select public.current_user_id())::text);

commit;

-- ---------------------------------------------------------------------
-- AFTER RUNNING
-- 1) Make the advisor a staff member (replace the email, full name and auth id):
--    The auth id is in Authentication > Users after the advisor has signed up once.
--
--    insert into public.staff_users (email, full_name, role, auth_user_id)
--    values ('advisor@example.com', 'Advisor Name', 'admin', '<auth.users id>');
--
-- 2) Check the result: every table should show rls = true and policies >= 1.
-- ---------------------------------------------------------------------
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       count(p.polname) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relname;
