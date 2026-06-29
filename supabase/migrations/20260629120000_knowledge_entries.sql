--
-- Migration 0006 — base de conhecimento (busca semântica de NCs e planos de ação)
--
-- Cada linha é um par (problema encontrado -> solução que resolveu), colhido das
-- respostas de inspeção (answers.justification) + plano de ação (action_plans.description).
-- Guardamos SEMPRE o texto E o vetor lado a lado:
--   * problem_embedding  -> ÍNDICE de busca (acha problemas parecidos por proximidade)
--   * problem_text/solution_text -> CONTEÚDO (o que mostramos ao inspetor e o que
--     alimenta a IA num RAG futuro). Embedding é mão-única: do vetor não volta o texto.
--
-- tipo + modelo de máquina ficam aqui (desnormalizados) para estatística por
-- equipamento ("prensas modelo X falham no item 12.4.3"). MVP: busca dentro do
-- tenant (RLS). O agregado cross-tenant ("foguinhos") é fase posterior, com k-anonimato.
--

create extension if not exists vector with schema extensions;

create table public.knowledge_entries (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null default public.current_account_id()
                      references public.accounts(id) on delete cascade,
  -- contexto do equipamento (para filtro e estatística)
  machine_type_id   uuid references public.machine_types(id) on delete set null,
  machine_model_id  uuid references public.machine_models(id) on delete set null,
  -- requisito da norma
  standard_item_id  uuid not null references public.standard_items(id) on delete restrict,
  -- proveniência: de qual resposta veio (backfill idempotente)
  source_answer_id  uuid not null references public.answers(id) on delete cascade,
  -- CONTEÚDO (o que se lê / mostra / preenche)
  problem_text      text not null,
  solution_text     text,
  risk_level        varchar,
  -- ÍNDICE de busca (vetor do problema; solution_embedding fica para a fase 2)
  problem_embedding vector(1024) not null,
  model             varchar not null,             -- ex.: 'voyage-3' (saber re-embed depois)
  created_at        timestamptz not null default now(),
  constraint uq_knowledge_source_answer unique (source_answer_id)
);

-- busca por vizinhança (cosseno) — o coração da camada
create index knowledge_entries_embedding_idx
  on public.knowledge_entries
  using hnsw (problem_embedding vector_cosine_ops);

-- filtros e isolamento
create index knowledge_entries_account_idx on public.knowledge_entries (account_id);
create index knowledge_entries_item_idx    on public.knowledge_entries (standard_item_id);
create index knowledge_entries_mtype_idx   on public.knowledge_entries (machine_type_id);

-- RLS: mesma regra das demais tabelas do tenant (isola por conta)
alter table public.knowledge_entries enable row level security;

create policy own_account on public.knowledge_entries
  using (account_id in (select public.current_account_ids()))
  with check (account_id in (select public.current_account_ids()));

--
-- Busca por vizinhança. PostgREST não sabe ordenar por distância de vetor, então
-- expomos uma função. SECURITY INVOKER (default) => o RLS acima ainda filtra:
-- a função só "enxerga" as linhas da conta do chamador.
--   <=> = distância de cosseno (vector_cosine_ops); similaridade = 1 - distância.
--
create or replace function public.match_knowledge(
  query_embedding         vector(1024),
  match_count             int  default 5,
  filter_standard_item_id uuid default null
)
returns table (
  id               uuid,
  standard_item_id uuid,
  problem_text     text,
  solution_text    text,
  risk_level       varchar,
  similarity       float
)
language sql
stable
as $$
  select
    k.id,
    k.standard_item_id,
    k.problem_text,
    k.solution_text,
    k.risk_level,
    1 - (k.problem_embedding <=> query_embedding) as similarity
  from public.knowledge_entries k
  where filter_standard_item_id is null
     or k.standard_item_id = filter_standard_item_id
  order by k.problem_embedding <=> query_embedding
  limit match_count;
$$;

--
-- "Pergunta pronta" de estatística: NCs por item da norma x tipo de máquina.
-- É só `select * from knowledge_stats_by_item`. A contagem é feita na hora
-- (count(*)) — sempre certa, sem coluna de contador. Herda o RLS de
-- knowledge_entries (a view só mostra as linhas da conta do chamador).
--
create view public.knowledge_stats_by_item as
select
  k.standard_item_id,
  k.machine_type_id,
  count(*)                                            as ocorrencias,
  count(*) filter (where k.risk_level = 'critical')   as criticas,
  count(*) filter (where k.risk_level = 'high')       as altas,
  count(distinct k.machine_model_id)                  as modelos_distintos
from public.knowledge_entries k
group by k.standard_item_id, k.machine_type_id;
