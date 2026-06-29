--
-- Migration 0009 — Storage: bucket de laudos (PDFs) com RLS por conta
--
-- O PDF do laudo é o artefato congelado da revisão (ADR 0004). Guardamos o
-- arquivo no Storage e o caminho em reports.pdf_path.
--
-- Convenção de caminho: {account_id}/{report_id}/v{version}.pdf
-- A 1ª pasta do caminho é o account_id; a política só libera se esse account_id
-- for do chamador (mesma lógica de isolamento das tabelas, aplicada ao Storage).
--

insert into storage.buckets (id, name, public)
values ('laudos', 'laudos', false)
on conflict (id) do nothing;

-- leitura/escrita só dos próprios arquivos (1ª pasta = account_id do chamador)
create policy "laudos tenant select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'laudos'
    and (storage.foldername(name))[1] in (select public.current_account_ids()::text)
  );

create policy "laudos tenant insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'laudos'
    and (storage.foldername(name))[1] in (select public.current_account_ids()::text)
  );

create policy "laudos tenant update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'laudos'
    and (storage.foldername(name))[1] in (select public.current_account_ids()::text)
  );
