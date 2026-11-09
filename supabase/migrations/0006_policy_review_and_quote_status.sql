-- 0006_policy_review_and_quote_status.sql
-- Run in the Supabase SQL Editor BEFORE deploying the matching CRM release. Safe to run more than once.
--
-- 1. policies.rejection_reason       - why a policy was rejected (shown in the CRM; mobile screen comes later)
-- 2. policy_documents.uploaded_by    - who uploaded a document: 'user' (external) or 'staff' (agency)
-- 3. quote_requests.status           - adds 'pending' and 'renewed'
--
-- Display names (CRM only, stored values do not change):
--   policies.source 'user_added'    -> "External policy"
--   policies.source 'advisor_added' -> "Insured by agency"
--   policy_documents.uploaded_by 'user' -> "External", 'staff' -> "Agency"

-- ---------------------------------------------------------------------------
-- 1. Rejection reason
-- ---------------------------------------------------------------------------
alter table public.policies add column if not exists rejection_reason text;

-- Keep the existing behaviour of this trigger, and clear the reason whenever a policy is not rejected
-- (for example when staff re-verify it, or the user edits it and it goes back to 'unverified').
create or replace function public.policies_before_write()
returns trigger
language plpgsql
as $function$
begin
  new.status := case
    when new.due_date < public.today_ist()       then 'Expired'
    when new.due_date <= public.today_ist() + 30 then 'Expiring Soon'
    else 'Active'
  end;

  if tg_op = 'INSERT' and new.source = 'advisor_added' then
    new.verification_status := 'verified';
  end if;

  if new.verification_status is distinct from 'rejected' then
    new.rejection_reason := null;
  end if;

  new.updated_at := now();
  return new;
end $function$;

-- ---------------------------------------------------------------------------
-- 2. Who uploaded each document
-- ---------------------------------------------------------------------------
alter table public.policy_documents
  add column if not exists uploaded_by text not null default 'user';

alter table public.policy_documents drop constraint if exists policy_documents_uploaded_by_check;
alter table public.policy_documents
  add constraint policy_documents_uploaded_by_check check (uploaded_by in ('user', 'staff'));

-- Existing documents: only staff can attach documents to advisor-added policies, so those are agency uploads.
update public.policy_documents d
set uploaded_by = 'staff'
from public.policies p
where p.id = d.policy_id
  and p.source = 'advisor_added'
  and d.uploaded_by = 'user';

-- A signed-in person who is not staff can never label their upload as an agency document.
create or replace function public.policy_documents_before_insert()
returns trigger
language plpgsql
as $function$
begin
  if auth.uid() is not null and not public.is_staff() then
    new.uploaded_by := 'user';
  end if;
  return new;
end $function$;

drop trigger if exists policy_documents_before_insert on public.policy_documents;
create trigger policy_documents_before_insert
  before insert on public.policy_documents
  for each row execute function public.policy_documents_before_insert();

-- ---------------------------------------------------------------------------
-- 3. Quote request statuses: new, pending, in_progress, completed, closed, renewed
-- ---------------------------------------------------------------------------
alter table public.quote_requests drop constraint if exists quote_requests_status_check;
alter table public.quote_requests
  add constraint quote_requests_status_check
  check (status = any (array['new', 'pending', 'in_progress', 'completed', 'closed', 'renewed']));
