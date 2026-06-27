# Tracker de RLS & Regras de Negócio

Checklist vivo do estado de **segurança (RLS)** e **regras de negócio** por
tabela. Reflete o banco real no Supabase. Atualizar conforme avança.

Legenda: ✅ feito · ⬜ pendente · 🔒 bloqueado de propósito · 🔜 no marco do Auth.

**RLS habilitado em TODAS as 27 tabelas.** Funções auxiliares:
`current_account_ids()` (setof, usada nas políticas) e `current_account_id()`
(escalar, usada como default do `account_id` denormalizado nas transacionais).

## Camada de Referência (8) — ✅ completa
Leitura aberta (`SELECT` para `authenticated`), escrita só `service_role`.

| Tabela | RLS | Política |
|---|---|---|
| `standards` | ✅ | `standards_read` (SELECT) |
| `standard_versions` | ✅ | `standard_versions_read` (SELECT) |
| `standard_sections` | ✅ | `standard_sections_read` (SELECT) |
| `standard_items` | ✅ | `standard_items_read` (SELECT) |
| `machine_types` | ✅ | `machine_types_read` (SELECT) |
| `machine_models` | ✅ | `machine_models_read` (SELECT) |
| `location_types` | ✅ | `location_types_read` (SELECT) |
| `risk_matrix_rules` | ✅ | `risk_matrix_rules_read` (SELECT) |

## Formas de Checklist (3) — ✅ completa
| Tabela | RLS | Política | Regras |
|---|---|---|---|
| `checklist_templates` | ✅ | `own_account` (ALL) | unique(account, version, name) |
| `checklist_template_sections` | ✅ | `own_account` (ALL) | unique(template, section) |
| `checklist_template_items` | ✅ | `own_account` (ALL) | unique(section, item) |

## Cadastro (8)
| Tabela | RLS | Política | Regras | Status |
|---|---|---|---|---|
| `clients` | ✅ | `own_account` (ALL) | unique(account, cnpj) | ✅ |
| `locations` | ✅ | `own_account` (ALL) | unique(client, code) | ✅ |
| `machines` | ✅ | `own_account` (ALL) | unique(location, code) + unique(location, serial) | ✅ |
| `profiles` | ✅ | `own_profile` (ALL) | 1:1 auth.users | ✅ |
| `professionals` | ✅ | `own_account` (ALL) | unique(account, crea) | ✅ |
| `arts` | ✅ | `own_account` (ALL) | unique(number) global | ✅ |
| `accounts` | ✅ | 🔜 Auth (bootstrap) | unique(cnpj) | regras ✅ |
| `account_members` | ✅ | 🔜 Auth (bootstrap) | unique(user), 1 owner/conta | regras ✅ |

## Transacional (8) — ✅ completa
`account_id` **denormalizado** em todas (política direta, ADR 0006).

| Tabela | RLS | Política | Regras |
|---|---|---|---|
| `inspections` | ✅ | `own_account` (ALL) | + name/sequence; unique(client, name, seq) |
| `inspection_scope` | ✅ | `own_account` (ALL) | unique(inspection, location) |
| `checklists` | ✅ | `own_account` (ALL) | unique(inspection, machine, template) |
| `answers` | ✅ | `own_account` (ALL) | unique(checklist, item) + check non_compliant |
| `answer_photos` | ✅ | `own_account` (ALL) | unique(answer, position) + check 1-3 |
| `reports` | ✅ | `own_account` (ALL) | 1:1 inspection (unique); unique(account, report_number) |
| `action_plans` | ✅ | `own_account` (ALL) | unique(answer); status pendente→verificado + check |
| `action_plan_photos` 🆕 | ✅ | `own_account` (ALL) | unique(action_plan, position) + check 1-3 |

## Placar
**25 de 27 tabelas 100% fechadas.** Só faltam:
- `accounts` + `account_members` → política no **marco do Auth** (precisam de uma função `security definer` de signup que crie conta + dono atomicamente — o "bootstrap").

## Padrões de política usados
- **Referência:** `for select to authenticated using (true)` (leitura aberta).
- **Raiz / denormalizada** (tem `account_id`): `for all using (account_id in (select current_account_ids()))`.
- **Filha normalizada** (cadastro): `for all using (exists (... join até a raiz ...))`.
- **profiles:** `for all using (id = auth.uid())`.
