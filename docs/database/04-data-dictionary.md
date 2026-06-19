# Dicionário de Dados

Identificadores em inglês; conteúdo de dados em português (domínio NR-12).

> **Status da revisão de propriedades (fase atual).** Estamos
> redocumentando o dicionário entidade por entidade, com revisão
> deliberada de cada propriedade.
> - ✅ **Norma** (`standards`, `standard_amendments`, `standard_versions`,
>   `standard_sections`, `standard_items`) — confirmada.
> - ⏳ Demais tabelas abaixo: ainda no rascunho do remodel anterior e
>   **não refletem** as decisões conceituais recentes (hierarquia de
>   máquina `type → model → unit`, `locations`, `professionals`/`arts`,
>   ganchos de marketplace, base de conhecimento). Serão revisadas nos
>   próximos blocos.

Convenções aplicadas em todas as tabelas (ver
[`03-naming-conventions.md`](03-naming-conventions.md)):
- PK sempre `id uuid not null default gen_random_uuid()`.
- `created_at timestamptz not null default now()` em toda tabela.
- `updated_at` apenas onde o registro é editado depois de criado.
- `deleted_at timestamptz null` (soft delete) apenas em `clients`,
  `machines`, `inspections`, `reports`, `checklists`.
- Enums = `text` + `check` (não `enum` nativo).
- Toda tabela tenant-scoped tem `account_id uuid not null` + índice + RLS.

---

# Camada 1 — Referência (global, sem `account_id`, sem RLS de tenant)

## `standards`
A norma regulamentadora. Sem soft delete (norma não se "apaga"; revogação
acontece no nível da versão/portaria).

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `code` | text | não | — | Código da norma, ex. `NR-12`. `unique` |
| `title` | text | não | — | Título completo, ex. "Segurança no trabalho em máquinas e equipamentos" |
| `description` | text | sim | `null` | Contexto opcional |
| `created_at` | timestamptz | não | `now()` | — |

## `standard_amendments`
As portarias da norma: a *Publicação* original + cada *Alteração/
Atualização*. É o ramo legal/proveniência — dá rastreabilidade pra
citação no laudo, sem custo de reestruturar os itens a cada alteração.

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `standard_id` | uuid | não | — | FK → `standards.id` |
| `type` | text | não | — | `check in ('publication','amendment')` — "Publicação" vs "Alteração/Atualização" |
| `number` | text | não | — | Ex. `n.º 916` |
| `issuing_body` | text | não | — | Órgão emissor (muda no tempo): `MTb`, `SSST`, `SIT`, `MTE`, `MTPS`, `SEPRT`, `MTP`… |
| `signed_date` | date | não | — | Data da portaria (ex. 30/07/2019) |
| `dou_date` | date | sim | `null` | Data de publicação no D.O.U. (ex. 31/07/2019) |
| `url` | text | sim | `null` | Link pro texto oficial |
| `position` | integer | sim | — | Ordem cronológica na lista |
| `created_at` | timestamptz | não | `now()` | — |

A *Publicação* original (Portaria MTb 3.214/1978) é `type = 'publication'`;
todo o resto é `'amendment'`.

## `standard_versions`
Versão **estruturada** (a redação consolidada) sobre a qual se montam
checklists. **Imutável após `published`.** Mantemos a versão vigente +
o histórico de `standard_amendments`; cria-se versão nova só em
consolidações relevantes (ver [ADR 0004](../adr/0004-immutable-versioning-and-freeze.md)).

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `standard_id` | uuid | não | — | FK → `standards.id` |
| `defining_amendment_id` | uuid | sim | `null` | FK → `standard_amendments.id` — a portaria que deu esta redação (ex. 916/2019) |
| `version_label` | text | não | — | Etiqueta da redação, ex. "Redação 916/2019, consolidada até 4.219/2022" |
| `effective_from` | date | sim | — | Início de vigência |
| `effective_until` | date | sim | `null` | Fim de vigência (null = vigente) — facilita "qual versão valia na data da inspeção" |
| `status` | text | não | `'draft'` | `check in ('draft','published','revoked')` |
| `published_at` | timestamptz | sim | — | Quando foi publicada |
| `created_at` | timestamptz | não | `now()` | — |

`unique (standard_id, version_label)`.

## `standard_sections`
Módulo ou anexo de uma versão da norma.

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `standard_version_id` | uuid | não | — | FK → `standard_versions.id` |
| `section_type` | text | não | — | `check in ('module','annex')` |
| `code` | text | não | — | Ex. `12.1`, `Anexo I` |
| `title` | text | não | — | Ex. "Princípios gerais" |
| `position` | integer | não | — | Ordem de exibição |
| `created_at` | timestamptz | não | `now()` | — |

`unique (standard_version_id, code)`.

## `standard_items`
A cláusula da norma. Suporta aninhamento via `parent_item_id`.

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `standard_section_id` | uuid | não | — | FK → `standard_sections.id` |
| `standard_version_id` | uuid | não | — | **Denormalizado** (filosofia do [ADR 0002](../adr/0002-postgres-supabase-multi-tenant-rls.md)): permite `unique (standard_version_id, number)` e consultar todos os itens da versão sem join |
| `parent_item_id` | uuid | sim | `null` | FK → `standard_items.id` (sub-item aninhado, ex. 12.1.1.1) |
| `number` | text | não | — | Ex. `12.1.1` |
| `text` | text | não | — | Texto da cláusula |
| `position` | integer | não | — | Ordem dentro da seção/pai |
| `created_at` | timestamptz | não | `now()` | — |

`unique (standard_version_id, number)`.

## `machine_types`
| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `name` | text | não | — | Ex. "Prensa hidráulica". `unique` |
| `created_at` | timestamptz | não | `now()` | — |

## `location_types`
| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `name` | text | não | — | Ex. "Oficina", "Cozinha". `unique` |
| `created_at` | timestamptz | não | `now()` | — |

## `risk_matrix_rules`
Referência global (sem `account_id`). PK composta `(probability, severity)`.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `probability` | text | não | `check in ('low','medium','high')` |
| `severity` | text | não | `check in ('minor','moderate','major')` |
| `risk_level` | text | não | `check in ('low','medium','high','critical')` |

Deve ter as 9 linhas (3×3) seedadas antes de qualquer resposta
não-conforme. Os valores de cada combinação são decisão de negócio do
Sandro (a fechar antes da migration de seed).

---

# Camada de Checklist (tenant-scoped)

## `checklists`
Checklist nomeado do tenant, construído sobre uma versão da norma.

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (RLS) |
| `standard_version_id` | uuid | não | — | FK → `standard_versions.id` |
| `machine_type_id` | uuid | sim | `null` | FK → `machine_types.id` (destino opcional) |
| `name` | text | não | — | Ex. "Checklist Prensas — Linha 3" |
| `description` | text | sim | — | — |
| `created_at` / `updated_at` | timestamptz | não | `now()` | — |
| `deleted_at` | timestamptz | sim | `null` | Soft delete |

## `checklist_versions`
Versão imutável (uma seleção publicada). **Imutável após `published`.**

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (RLS) |
| `checklist_id` | uuid | não | — | FK → `checklists.id` |
| `version_number` | integer | não | — | 1, 2, 3… |
| `status` | text | não | `'draft'` | `check in ('draft','published')` |
| `published_at` | timestamptz | sim | — | — |
| `created_at` | timestamptz | não | `now()` | — |

`unique (checklist_id, version_number)`.

## `checklist_version_items`
A seleção: quais itens da norma entram nesta versão (só os incluídos).

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (RLS) |
| `checklist_version_id` | uuid | não | — | FK → `checklist_versions.id` |
| `standard_item_id` | uuid | não | — | FK → `standard_items.id` |
| `position` | integer | sim | — | Ordem (default: a do item na norma) |
| `created_at` | timestamptz | não | `now()` | — |

`unique (checklist_version_id, standard_item_id)`.

---

# Camada 2 — Quem / O quê (tenant-scoped)

## `accounts`
| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK (é o próprio tenant) |
| `name` | text | não | — | Nome da consultoria |
| `default_validity_months` | integer | não | `12` | Prazo padrão de validade do laudo. `check > 0` |
| `created_at` | timestamptz | não | `now()` | — |

## `account_members`
| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` |
| `user_id` | uuid | não | — | FK → `auth.users.id` (Supabase Auth) |
| `role` | text | não | `'owner'` | `check in ('owner')` no v1 |
| `created_at` | timestamptz | não | `now()` | — |

`unique (account_id, user_id)`.

## `clients`
| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (RLS) |
| `name` | text | não | — | Razão social/nome |
| `cnpj` | text | sim | — | `check (cnpj is null or cnpj ~ '^\d{14}$')` |
| `created_at` / `updated_at` | timestamptz | não | `now()` | — |
| `deleted_at` | timestamptz | sim | `null` | Soft delete |

## `machines`
| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (RLS) |
| `client_id` | uuid | não | — | FK → `clients.id` |
| `machine_type_id` | uuid | sim | — | FK → `machine_types.id` |
| `location_type_id` | uuid | sim | — | FK → `location_types.id` |
| `tag` | text | não | — | Identificação no parque (ex. "Prensa 02") |
| `manufacturer` | text | sim | — | Fabricante |
| `model` | text | sim | — | Modelo |
| `serial_number` | text | sim | — | Número de série |
| `location_detail` | text | sim | — | Local físico livre (setor/linha) |
| `created_at` / `updated_at` | timestamptz | não | `now()` | — |
| `deleted_at` | timestamptz | sim | `null` | Soft delete |

---

# Camada 3 — Transacional (tenant-scoped)

## `inspections`
Evento de campo de uma máquina. Congela uma versão de checklist.

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (RLS) |
| `machine_id` | uuid | não | — | FK → `machines.id` |
| `checklist_version_id` | uuid | não | — | FK → `checklist_versions.id` (**versão congelada**) |
| `report_id` | uuid | sim | `null` | FK → `reports.id` (preenchido ao consolidar) |
| `status` | text | não | `'in_field'` | `check in ('in_field','completed')` |
| `inspection_date` | date | não | — | Data da inspeção em campo |
| `valid_until` | date | sim | `null` | Calculada ao concluir (`inspection_date + account.default_validity_months`); editável |
| `raw_whatsapp_payload` | jsonb | sim | `null` | Payload bruto do fluxo n8n/WhatsApp |
| `created_at` / `updated_at` | timestamptz | não | `now()` | — |
| `deleted_at` | timestamptz | sim | `null` | Soft delete |

## `inspection_responses`
Uma resposta por item do checklist. Append-only.

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (RLS) |
| `inspection_id` | uuid | não | — | FK → `inspections.id` |
| `checklist_version_item_id` | uuid | não | — | FK → `checklist_version_items.id` (o item respondido) |
| `status` | text | não | — | `check in ('compliant','non_compliant','not_applicable')` |
| `justification` | text | sim | — | Obrigatória se `non_compliant` (ver check abaixo) |
| `probability` | text | sim | — | `check in ('low','medium','high')`; preenchida se `non_compliant` |
| `severity` | text | sim | — | `check in ('minor','moderate','major')`; preenchida se `non_compliant` |
| `risk_level` | text | sim | — | Lookup em `risk_matrix_rules`; preenchida se `non_compliant` |
| `created_at` | timestamptz | não | `now()` | — |

Constraints:
- `unique (inspection_id, checklist_version_item_id)` — uma resposta por item.
- FK composta `(probability, severity)` → `risk_matrix_rules` (nulos permitidos via `MATCH SIMPLE`).
- `check`: se `status = 'non_compliant'` então `justification`, `probability`, `severity`, `risk_level` **NOT NULL**; caso contrário esses quatro são **NULL**. (Decisão: justificativa obrigatória só para não-conforme — `not_applicable` não exige.)

## `response_photos`
Até 3 fotos de uma resposta não-conforme (tabela-filha).

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (RLS) |
| `response_id` | uuid | não | — | FK → `inspection_responses.id` |
| `storage_path` | text | não | — | Caminho no Supabase Storage |
| `position` | integer | não | — | `check in (1,2,3)` |
| `created_at` | timestamptz | não | `now()` | — |

Constraints: `unique (response_id, position)` + trigger/aplicação
garantindo no máximo 3 por resposta. Limite rígido de 3 (ADR 0005).

## `reports`
Laudo que consolida várias inspeções.

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (RLS) |
| `client_id` | uuid | não | — | FK → `clients.id` (laudo emitido para um cliente) |
| `report_number` | text | sim | — | Número/referência do laudo |
| `issued_at` | date | sim | — | Data de emissão |
| `status` | text | não | `'draft'` | `check in ('draft','in_review','final')` |
| `ai_generated_text` | text | sim | — | Rascunho do parecer gerado por IA (preservado) |
| `final_text` | text | sim | — | Texto final, após revisão do engenheiro |
| `pdf_path` | text | sim | — | Caminho do PDF gerado |
| `created_at` / `updated_at` | timestamptz | não | `now()` | — |
| `deleted_at` | timestamptz | sim | `null` | Soft delete |

## `action_plans`
Ação corretiva ligada a uma resposta não-conforme.

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (RLS) |
| `response_id` | uuid | não | — | FK → `inspection_responses.id` (deve ser `non_compliant`) |
| `description` | text | não | — | O que precisa ser feito |
| `responsible_name` | text | não | — | Texto livre (pode ser alguém fora do sistema) |
| `due_date` | date | não | — | Prazo |
| `created_at` / `updated_at` | timestamptz | não | `now()` | — |
