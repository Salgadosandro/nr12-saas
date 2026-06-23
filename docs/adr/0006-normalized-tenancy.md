# 0006 - Tenancy normalizada: `account_id` só nas raízes do tenant

- **Status:** Aceito
- **Data:** 2026-06-19
- **Relaciona-se com:** ajusta o [ADR 0002](0002-postgres-supabase-multi-tenant-rls.md)

## Contexto

O [ADR 0002](0002-postgres-supabase-multi-tenant-rls.md) recomendou
**denormalizar `account_id` em toda tabela tenant-scoped**, para que as
políticas de RLS fossem uma comparação direta `account_id = conta_atual()`,
sem joins.

Ao montar a base v1, optou-se por uma abordagem mais enxuta. A
denormalização do `account_id` é, no fundo, uma **otimização** (troca
redundância por simplicidade/performance de política). A filosofia do
projeto para a base é "SQL puro/normalizado primeiro, camadas de
otimização depois" — então faz sentido começar normalizado.

## Decisão

`account_id` vive **apenas nas raízes de cada subárvore do tenant**:

- `accounts` (é o próprio tenant, via `id`)
- `account_members`, `clients`, `checklist_templates`, `professionals`

Todas as demais tabelas do tenant **derivam** a conta subindo a cadeia de
FKs até uma dessas raízes. Exemplos:
- `machines` → `locations` → `clients` (account)
- `answers` → `checklists` → `machines` → `locations` → `clients`
- `checklist_template_items` → `checklist_template_sections` → `checklist_templates`

As políticas de RLS nas tabelas filhas usam um `EXISTS`/join até a raiz, em
vez de uma coluna direta.

## Consequências

- (+) Zero redundância; impossível o `account_id` do filho "descasar" do pai.
- (+) Schema mais limpo, coerente com a filosofia de base normalizada.
- (+) Não fecha portas: se a escala exigir, **denormalizar `account_id` de
  volta** nas tabelas quentes é exatamente a camada de otimização posterior
  prevista no ADR 0002 — adicionada quando medida a necessidade.
- (-) Políticas de RLS nas filhas ficam mais verbosas (subquery/EXISTS) e
  um pouco mais lentas em escala muito grande.
- (-) Exige cuidado para que toda subárvore termine numa raiz com
  `account_id` (verdade no schema atual).

## Nota sobre o ADR 0002

O ADR 0002 continua válido no que diz respeito a **usar RLS para
isolamento** e a tabela de referência ser a exceção global. O que muda é a
**estratégia de denormalização**: a base começa normalizada (este ADR); a
denormalização do 0002 vira uma otimização opcional e posterior.
