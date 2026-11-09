-- =====================================================================
-- SecureDrive - 0001_init.sql  (REFERENCE SNAPSHOT, 2026-10-30)
--
-- Rebuilt from information_schema / pg_constraint of the live project
-- AFTER 0002_auth_rls.sql had run, so it already contains the columns
-- 0002 adds. Use it to understand or recreate the schema.
--
-- Not captured by the snapshot (assumed here, verify before relying on it):
--   * primary keys (assumed `id`, and `slot_name` for ad_slots)
--   * unique constraints other than the ones 0002 creates
--   * indexes and triggers (0002 creates the important ones)
-- Do NOT run this on the live database: the tables already exist.
-- =====================================================================

create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id                  uuid primary key default uuid_generate_v4(),
  mobile_number       text not null unique,
  full_name           text,
  email               text,
  is_advisor_client   boolean default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  auth_user_id        uuid unique references auth.users (id) on delete set null,
  date_of_birth       date,
  consent_accepted_at timestamptz,
  consent_version     text,
  constraint users_mobile_format_check check (mobile_number ~ '^\+91[6-9][0-9]{9}$') not valid
);

create table if not exists public.staff_users (
  id           uuid primary key default uuid_generate_v4(),
  email        text not null,
  full_name    text not null,
  role         text check (role in ('admin', 'staff')),
  created_at   timestamptz default now(),
  auth_user_id uuid unique references auth.users (id) on delete cascade
);

create table if not exists public.insurers (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  logo_url   text,
  created_at timestamptz default now()
);

create table if not exists public.policy_types (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  created_at timestamptz default now(),
  code       text check (code is null or code in ('car', 'bike', 'health', 'term', 'other'))
);

create table if not exists public.policies (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references public.users (id) on delete cascade,
  insurer_id          uuid references public.insurers (id) on delete set null,
  type_id             uuid references public.policy_types (id) on delete set null,
  policy_number       text not null,
  due_date            date not null,            -- policy END date
  premium_amount      numeric,
  plan_type           text,
  holder_name         text,
  holder_mobile       text,
  holder_address      text,
  vehicle_reg_no      text,
  vehicle_make        text,
  vehicle_model       text,
  vehicle_fuel_type   text,
  vehicle_chassis_no  text,
  vehicle_engine_no   text,
  vehicle_cc          text,
  vehicle_mfy         text,
  vehicle_regn_date   date,
  status              text check (status in ('Active', 'Expiring Soon', 'Expired')),
  source              text not null default 'user_added' check (source in ('advisor_added', 'user_added')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'verified', 'rejected')),
  is_lead_opportunity boolean default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  start_date          date,
  insurer_name        text,
  constraint policies_dates_check check (start_date is null or due_date >= start_date)
);

create table if not exists public.policy_documents (
  id            uuid primary key default uuid_generate_v4(),
  policy_id     uuid references public.policies (id) on delete cascade,
  file_path     text not null,
  document_type text,
  uploaded_at   timestamptz default now()
);

create table if not exists public.renewals (
  id           uuid primary key default uuid_generate_v4(),
  policy_id    uuid references public.policies (id) on delete cascade,
  status       text check (status in ('pending', 'quote_sent', 'renewed', 'lapsed')),
  renewal_date date,
  created_at   timestamptz default now()
);

create table if not exists public.quote_requests (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.users (id) on delete cascade,
  policy_id  uuid references public.policies (id) on delete set null,
  status     text default 'new' check (status in ('new', 'in_progress', 'completed', 'closed')),
  notes      text,
  created_at timestamptz default now()
);

create table if not exists public.templates (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  title      text not null,
  body       text not null,
  type       text check (type in ('automated', 'broadcast', 'user_specific')),
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.users (id) on delete cascade,
  template_id uuid references public.templates (id) on delete set null,
  title       text not null,
  body        text not null,
  is_read     boolean not null default false,
  sent_at     timestamptz default now(),
  kind        text not null default 'announcement' check (kind in ('renewal', 'offer', 'greeting', 'announcement')),
  policy_id   uuid references public.policies (id) on delete cascade
);

create table if not exists public.device_tokens (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.users (id) on delete cascade,
  token      text not null,
  platform   text check (platform in ('ios', 'android')),
  created_at timestamptz default now()
);

create table if not exists public.support_tickets (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.users (id) on delete cascade,
  subject     text not null,
  description text,
  status      text default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at  timestamptz default now()
);

create table if not exists public.placements (
  id         uuid primary key default uuid_generate_v4(),
  slot_name  text not null,
  image_url  text,
  action_url text,
  title      text,
  is_active  boolean default true,
  created_at timestamptz default now(),
  body       text,
  cta_label  text,
  starts_at  timestamptz,
  ends_at    timestamptz,
  sort_order integer not null default 0
);

create table if not exists public.ad_settings (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.users (id) on delete cascade,
  show_ads   boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.ad_slots (
  slot_name  text primary key,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  full_name     text not null,
  relation      text,
  date_of_birth date,
  is_nominee    boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id        uuid primary key default uuid_generate_v4(),
  staff_id  uuid references public.staff_users (id) on delete set null,
  action    text not null,
  entity    text not null,
  entity_id uuid,
  timestamp timestamptz default now()
);
