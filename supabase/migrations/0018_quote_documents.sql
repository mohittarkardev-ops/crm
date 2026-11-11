-- 0018_quote_documents.sql
-- Allows advisors in the CRM to upload proposal/comparison/policy PDFs directly onto any quote_request
-- (with or without a linked policy), and lets customers view/download them in the mobile app.
-- Safe to run more than once.

create table if not exists public.quote_documents (
  id            uuid primary key default gen_random_uuid(),
  quote_id      uuid not null references public.quote_requests (id) on delete cascade,
  file_path     text not null,
  file_name     text,
  document_type text not null default 'Quote proposal',
  uploaded_by   text not null default 'staff' check (uploaded_by in ('staff', 'user')),
  uploaded_at   timestamptz not null default now()
);

create index if not exists quote_documents_quote_id_idx
  on public.quote_documents (quote_id);

alter table public.quote_documents enable row level security;

drop policy if exists quote_documents_select_own on public.quote_documents;
create policy quote_documents_select_own on public.quote_documents
  for select to authenticated
  using (
    quote_id in (
      select id from public.quote_requests where user_id = (select public.current_user_id())
    )
  );

drop policy if exists quote_documents_staff_select on public.quote_documents;
create policy quote_documents_staff_select on public.quote_documents
  for select to authenticated
  using ((select public.has_permission('quotes.view')));

drop policy if exists quote_documents_staff_insert on public.quote_documents;
create policy quote_documents_staff_insert on public.quote_documents
  for insert to authenticated
  with check ((select public.has_permission('quotes.update')));

drop policy if exists quote_documents_staff_delete on public.quote_documents;
create policy quote_documents_staff_delete on public.quote_documents
  for delete to authenticated
  using ((select public.has_permission('quotes.update')));

-- Storage policies on DOCUMENTS bucket for quote attachments stored under <user_id>/quotes/<quote_id>/<file>.
-- Customer owner download is already covered by documents_select_own (first folder = user_id).
drop policy if exists documents_quote_staff_select on storage.objects;
create policy documents_quote_staff_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'DOCUMENTS'
    and (select public.has_permission('quotes.view'))
  );

drop policy if exists documents_quote_staff_insert on storage.objects;
create policy documents_quote_staff_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'DOCUMENTS'
    and (select public.has_permission('quotes.update'))
    and (storage.foldername(name))[2] = 'quotes'
  );

drop policy if exists documents_quote_staff_delete on storage.objects;
create policy documents_quote_staff_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'DOCUMENTS'
    and (select public.has_permission('quotes.update'))
    and (storage.foldername(name))[2] = 'quotes'
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'quote_documents'
  ) then
    alter publication supabase_realtime add table public.quote_documents;
  end if;
end $$;
