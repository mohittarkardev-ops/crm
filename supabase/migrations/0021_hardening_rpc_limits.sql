-- 0021_hardening_rpc_limits.sql
-- Security and sync hardening:
--  1) Persistent per-phone OTP rate limits in `whatsapp_otp_phone_limits` so deleting used/expired
--     codes from `whatsapp_otps` cannot reset the cooldown or hourly cap.
--  2) Atomic `claim_whatsapp_otp_attempt` RPC so concurrent verify-otp calls increment `attempts`
--     before comparison and cannot exceed MAX_ATTEMPTS.
--  3) `register_device_token` SECURITY DEFINER RPC so a device token used by a previous account on
--     the same phone cleanly transfers ownership to the currently signed-in customer.
--  4) Row-joined `DOCUMENTS` storage policy (`documents_quote_own_by_row`) so customers can read
--     attached quote documents via `quote_documents` even if the object key prefix differs.
-- Safe to run more than once.

create table if not exists public.whatsapp_otp_phone_limits (
  phone             text primary key,
  resend_count      integer not null default 1 check (resend_count >= 1),
  window_started_at timestamptz not null default now(),
  last_sent_at      timestamptz not null default now()
);

alter table public.whatsapp_otp_phone_limits enable row level security;

revoke all on table public.whatsapp_otp_phone_limits from public, anon, authenticated;
grant all on table public.whatsapp_otp_phone_limits to service_role;

insert into public.whatsapp_otp_phone_limits (phone, resend_count, window_started_at, last_sent_at)
select phone, resend_count, window_started_at, last_sent_at
from public.whatsapp_otps
on conflict (phone) do nothing;

create or replace function public.claim_whatsapp_otp_attempt(
  p_phone text,
  p_max integer default 5
)
returns table (
  status text,
  otp_hash text,
  attempts_used integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_attempts integer;
  v_expires timestamptz;
begin
  update public.whatsapp_otps w
  set attempts = w.attempts + 1
  where w.phone = p_phone
    and w.expires_at > now()
    and w.attempts < p_max
  returning w.otp_hash, w.attempts
  into v_hash, v_attempts;

  if found then
    return query select 'claimed'::text, v_hash, v_attempts;
    return;
  end if;

  select w.expires_at, w.attempts
  into v_expires, v_attempts
  from public.whatsapp_otps w
  where w.phone = p_phone
  for update;

  if not found then
    return query select 'missing'::text, null::text, 0;
    return;
  end if;

  if v_expires <= now() then
    delete from public.whatsapp_otps w where w.phone = p_phone;
    return query select 'expired'::text, null::text, coalesce(v_attempts, 0);
    return;
  end if;

  delete from public.whatsapp_otps w where w.phone = p_phone;
  return query select 'locked'::text, null::text, coalesce(v_attempts, p_max);
end $$;

revoke all on function public.claim_whatsapp_otp_attempt(text, integer) from public, anon, authenticated;
grant execute on function public.claim_whatsapp_otp_attempt(text, integer) to service_role;

create or replace function public.register_device_token(
  p_token text,
  p_platform text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := public.current_user_id();
  v_token text := trim(coalesce(p_token, ''));
  v_platform text := lower(trim(coalesce(p_platform, 'android')));
begin
  if auth.uid() is null or v_uid is null then
    raise exception 'not authenticated';
  end if;

  if v_token = '' then
    return;
  end if;

  if v_platform not in ('ios', 'android') then
    v_platform := 'android';
  end if;

  insert into public.device_tokens (user_id, token, platform)
  values (v_uid, v_token, v_platform)
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        created_at = now();
end $$;

revoke all on function public.register_device_token(text, text) from public, anon;
grant execute on function public.register_device_token(text, text) to authenticated;

drop policy if exists documents_quote_own_by_row on storage.objects;
create policy documents_quote_own_by_row on storage.objects
  for select to authenticated
  using (
    bucket_id = 'DOCUMENTS'
    and exists (
      select 1
      from public.quote_documents qd
      join public.quote_requests qr on qr.id = qd.quote_id
      where qd.file_path = storage.objects.name
        and qr.user_id = (select public.current_user_id())
    )
  );
