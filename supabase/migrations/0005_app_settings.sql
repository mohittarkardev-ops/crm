-- 0005_app_settings.sql
-- Business profile shown in the mobile app (support phone / WhatsApp, IRDAI licence, disclaimer), edited from the CRM.
-- Readable by every signed-in user (the app needs it), writable by CRM staff only. Safe to run more than once.

create table if not exists public.app_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
  for select to authenticated using (true);

drop policy if exists app_settings_staff_all on public.app_settings;
create policy app_settings_staff_all on public.app_settings
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();
