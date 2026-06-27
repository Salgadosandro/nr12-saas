--
-- Migration 0005 — figuras de referência dos itens da norma
--
-- Muitas cláusulas da NR-12 têm figuras (diagramas de distância, exemplos de
-- proteção). A figura é da NORMA, então mora no standard_item (global) e flui
-- para todo checklist que usar aquele item. Distinta das answer_photos (fotos
-- de evidência da inspeção, do tenant).
--
-- Camada de referência: leitura liberada para autenticado, escrita só service_role.
-- Os arquivos ficam no Supabase Storage (bucket de figuras da norma); aqui guardamos
-- só o caminho.
--

create table public.standard_item_images (
  id uuid primary key default gen_random_uuid(),
  standard_item_id uuid not null references public.standard_items(id) on delete cascade,
  storage_path varchar not null,
  caption varchar,
  position integer not null,
  created_at timestamptz not null default now(),
  constraint uq_standard_item_images unique (standard_item_id, position)
);

create index standard_item_images_item_idx
  on public.standard_item_images (standard_item_id);

alter table public.standard_item_images enable row level security;

-- leitura aberta (a norma é pública); escrita fica restrita ao service_role
create policy standard_item_images_read on public.standard_item_images
  for select to authenticated using (true);
