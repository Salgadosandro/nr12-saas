--
-- Migration 0012 — Storage: bucket de evidências (fotos de NC)
--
-- Fotos capturadas pelo app mobile durante inspeção em campo.
-- Vinculadas a answer_photos (já na schema inicial).
--
-- Convenção de caminho: {account_id}/{answer_id}/{position}.jpg
-- RLS: mesma lógica do bucket laudos — 1ª pasta = account_id do chamador.
--

insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;

create policy "evidencias tenant select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'evidencias'
    and (storage.foldername(name))[1] in (select public.current_account_ids()::text)
  );

create policy "evidencias tenant insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evidencias'
    and (storage.foldername(name))[1] in (select public.current_account_ids()::text)
  );

create policy "evidencias tenant delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'evidencias'
    and (storage.foldername(name))[1] in (select public.current_account_ids()::text)
  );
