-- 0019_security_and_realtime.sql
-- 1) Adds hashed IP rate-limiting storage for `send-whatsapp-otp` to prevent rotating-number
--    MSG91 cost abuse. Locked strictly to service_role.
-- 2) Adds `app_settings`, `placements`, and `ad_slots` to `supabase_realtime` so CRM edits
--    to agency contact info, home banners, and ad slot settings sync live to mobile clients.
-- Safe to run more than once.

create table if not exists public.whatsapp_otp_ip_limits (
  ip_hash           text primary key,
  request_count     integer not null default 1 check (request_count >= 1),
  window_started_at timestamptz not null default now(),
  last_request_at   timestamptz not null default now()
);

create index if not exists whatsapp_otp_ip_limits_window_idx
  on public.whatsapp_otp_ip_limits (window_started_at);

alter table public.whatsapp_otp_ip_limits enable row level security;

revoke all on table public.whatsapp_otp_ip_limits from public, anon, authenticated;
grant all on table public.whatsapp_otp_ip_limits to service_role;

do $$
declare
  t text;
begin
  foreach t in array array['app_settings', 'placements', 'ad_slots'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
