-- =====================================================================
-- SecureDrive - 0025_vehicle_registration_validation.sql
-- Adds:
--   1. vehicle_registration_type: stores format classification
--      (REGULAR, BH_SERIES, TEMPORARY, LEGACY, UNKNOWN).
--   2. vehicle_validation_status: stores offline validation outcome
--      (VALID, INVALID, NEEDS_MANUAL_REVIEW).
--   3. vehicle_manual_review_required: boolean flag marking whether
--      admin document inspection is required (for temporary, legacy,
--      or non-standard format submissions).
-- Idempotent and safe to execute in Supabase SQL editor.
-- =====================================================================

begin;

alter table public.claims
  add column if not exists vehicle_registration_type text,
  add column if not exists vehicle_validation_status text,
  add column if not exists vehicle_manual_review_required boolean default false;

comment on column public.claims.vehicle_registration_type is 'Format classification: REGULAR, BH_SERIES, TEMPORARY, LEGACY, UNKNOWN.';
comment on column public.claims.vehicle_validation_status is 'Offline format validation status: VALID, INVALID, NEEDS_MANUAL_REVIEW.';
comment on column public.claims.vehicle_manual_review_required is 'True if format is temporary, legacy, or requires administrative document inspection.';

commit;
