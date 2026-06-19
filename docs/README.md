# Documentação

Documentação "as code": vive no repositório, versionada junto com o
schema e o app. Filosofia: nenhuma decisão relevante existe só na
cabeça de alguém — fica escrita, com contexto e consequências.

## Estrutura

- **[`adr/`](adr/)** — Architecture Decision Records. Um arquivo por
  decisão técnica importante (por que escolhemos X em vez de Y). Nunca
  editamos um ADR aceito; se a decisão muda, criamos um novo ADR que
  supersede o anterior.
- **[`database/`](database/)** — pacote de modelagem de dados do Marco 1:
  requisitos, modelo conceitual/lógico, convenções de nomenclatura,
  dicionário de dados e estratégia de Row Level Security.

À medida que avançarmos pelos marcos do projeto, esta pasta ganha
`api/`, `frontend/`, `n8n/` e `billing/` com o mesmo padrão.

## Ordem de leitura recomendada (Marco 1 — Banco de Dados)

1. [`database/01-requirements.md`](database/01-requirements.md)
2. [`database/02-data-model.md`](database/02-data-model.md)
3. [`database/03-naming-conventions.md`](database/03-naming-conventions.md)
4. [`database/04-data-dictionary.md`](database/04-data-dictionary.md)
5. [`database/05-row-level-security.md`](database/05-row-level-security.md)
6. ADRs relacionados: [0002](adr/0002-postgres-supabase-multi-tenant-rls.md), [0003](adr/0003-data-driven-risk-matrix.md)
