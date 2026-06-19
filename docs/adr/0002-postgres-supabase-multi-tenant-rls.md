# 0002 - Multi-tenancy via Supabase Postgres + Row Level Security

- **Status:** Aceito
- **Data:** 2026-06-19

## Contexto

O produto atende múltiplas empresas/engenheiros (tenants), cada um com
seus próprios clientes, máquinas e inspeções. Os dados de um tenant
**nunca** podem ser visíveis para outro. Precisamos decidir como
implementar esse isolamento, e em qual plataforma de dados.

Opções consideradas para isolamento multi-tenant:

1. **Banco de dados separado por tenant** — isolamento físico total,
   mas operacionalmente caro (uma migration vira N migrations) e
   excessivo para um produto em fase de validação.
2. **Schema separado por tenant** (mesmo banco, schemas distintos) —
   isolamento forte, mas a gestão de migrations/conexões cresce
   linearmente com o número de tenants; também excessivo neste estágio.
3. **Schema único + Row Level Security (RLS) por `account_id`** —
   isolamento lógico, imposto pelo próprio Postgres (não pela
   aplicação), com uma única estrutura de tabelas pra todos os
   tenants.

Plataforma: **Supabase** (Postgres gerenciado + Auth + Storage +
Edge Functions) foi escolhida porque (a) é Postgres real, sem
abstração proprietária de banco; (b) tem suporte nativo e bem
documentado a RLS integrado com o Auth; (c) o stack combinado
(React + TS + Tailwind + shadcn + Supabase + Stripe + Vercel) foi
definido como objetivo de aprendizado do projeto.

## Decisão

- Schema único e compartilhado entre todos os tenants.
- Toda tabela cujo dado pertence a um tenant tem uma coluna
  `account_id uuid not null references accounts(id)`.
- **`account_id` é denormalizado em todas as tabelas filhas**
  (`machines`, `inspections`, `non_conformities`, `action_plans`) —
  mesmo quando já seria possível derivá-lo via join (ex:
  `inspections.machine_id → machines.account_id`). O motivo é que
  políticas de RLS que dependem de subquery/join em cada linha são
  mais lentas e mais difíceis de auditar do que uma comparação direta
  `account_id = current_account_id()`.
- RLS é **obrigatório e habilitado em toda tabela tenant-scoped**, sem
  exceção "vou confiar no filtro da aplicação". A aplicação nunca deve
  ser a única linha de defesa do isolamento de dados.
- Detalhe de implementação das políticas em
  [`database/05-row-level-security.md`](../database/05-row-level-security.md).

## Consequências

- (+) Uma única base de código de schema/migrations para todos os
  tenants — simples de operar e de evoluir.
- (+) Isolamento garantido no nível do banco, não da aplicação: mesmo
  um bug no backend não vaza dados entre tenants.
- (+) Padrão bem documentado e testado do próprio Supabase.
- (-) Exige disciplina: toda tabela nova precisa nascer com
  `account_id` + política RLS, e isso precisa ser testado
  explicitamente (ver estratégia de teste em `05-row-level-security.md`).
- (-) `account_id` denormalizado significa que a aplicação precisa
  sempre fornecê-lo corretamente no insert (mitigado com valor padrão
  via função/trigger, não confiado ao client).
