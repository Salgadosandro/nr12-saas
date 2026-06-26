# Tracker de RLS & Regras de Negócio

Checklist vivo do estado de **segurança (RLS)** e **regras de negócio** por
tabela. Reflete o banco real no Supabase. Atualizar conforme avança.

Legenda: ✅ feito · ⬜ pendente · 🔒 bloqueado de propósito · 🔜 no marco do Auth.

**RLS habilitado em TODAS as 26 tabelas.** Função auxiliar
`current_account_ids()` criada (resolve as contas do usuário logado via
`auth.uid()`), reusada por todas as políticas de tenant.

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

## Transacional (7) — ⬜ a fazer
| Tabela | RLS | Política | Regras |
|---|---|---|---|
| `inspections` | ✅ | ⬜ | ⬜ |
| `inspection_scope` | ✅ | ⬜ | unique(inspection, location) |
| `checklists` | ✅ | ⬜ | unique(inspection, machine, template) |
| `answers` | ✅ | ⬜ | unique(checklist, item) + check non_compliant |
| `answer_photos` | ✅ | ⬜ | unique(answer, position) + check 1-3 |
| `reports` | ✅ | ⬜ | ⬜ |
| `action_plans` | ✅ | ⬜ | ⬜ |

## Placar
**19 de 26 tabelas 100% fechadas** (referência 8 + checklist 3 + cadastro-folhas 6 + nada do transacional ainda... ver detalhe).

Pendências:
- `accounts` + `account_members` → política no **marco do Auth** (precisam de uma função `security definer` de signup que crie conta + dono atomicamente — o "bootstrap").
- **7 transacionais** → regras de negócio + política (cadeias de `exists` mais profundas; avaliar denormalizar `account_id` aqui — [ADR 0006](../adr/0006-normalized-tenancy.md)).

## Padrões de política usados
- **Referência:** `for select to authenticated using (true)` (leitura aberta).
- **Raiz do tenant** (tem `account_id`): `for all using (account_id in (select current_account_ids()))`.
- **Filha** (deriva): `for all using (exists (... join até a raiz ... and account_id in (select current_account_ids())))`.
- **profiles:** `for all using (id = auth.uid())`.
