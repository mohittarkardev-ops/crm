-- 0017_whatsapp_otp.sql
-- Stores short-lived hashed WhatsApp OTP codes for custom MSG91 authentication
-- and adds a service-role-only lookup helper in auth.users by normalized Indian phone.
-- Safe to run more than once.

create table if not exists public.whatsapp_otps (
  phone             text primary key,
  otp_hash          text not null,
  expires_at        timestamptz not null,
  attempts          integer not null default 0 check (attempts >= 0),
  resend_count      integer not null default 1 check (resend_count >= 1),
  window_started_at timestamptz not null default now(),
  last_sent_at      timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

create index if not exists whatsapp_otps_expires_at_idx
  on public.whatsapp_otps (expires_at);

alter table public.whatsapp_otps enable row level security;

revoke all on table public.whatsapp_otps from public, anon, authenticated;
grant all on table public.whatsapp_otps to service_role;

-- Service-role helper used by the verify-otp Edge Function to look up an existing
-- auth.users account by its 10-digit Indian mobile number without enumerating users.
create or replace function public.find_auth_user_by_phone(p_digits text)
returns table (
  id    uuid,
  email text,
  phone text
)
language sql
security definer
set search_path = public, auth
as $$
  select u.id, u.email::text, u.phone::text
  from auth.users u
  where u.deleted_at is null
    and (
      u.phone in ('+91' || p_digits, '91' || p_digits, p_digits)
      or public.normalize_mobile(u.phone) = p_digits
    )
  order by u.created_at asc
  limit 1;
$$;

revoke all on function public.find_auth_user_by_phone(text) from public, anon, authenticated;
grant execute on function public.find_auth_user_by_phone(text) to service_role;
