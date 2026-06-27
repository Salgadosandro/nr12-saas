# Dicionário de Dados

Identificadores em inglês; conteúdo de dados em português (domínio NR-12).
A **fonte de verdade exata** do schema é [`schema.dbml`](schema.dbml)
(colável no dbdiagram.io); o estado de **segurança (RLS)** está em
[`rls-status.md`](rls-status.md). Este documento descreve as tabelas
(agora **26**, com `profiles`).

> A camada auxiliar de **análise de dados** (foguinhos, base de
> conhecimento) e a de **marketplace** são de **fase posterior** —
> preservadas no histórico do Git.

> **Sincronizado com o banco (Supabase) — deltas desde a base v1:**
> - **+ `profiles`** (1:1 com `auth.users`): `full_name`, `cpf` (11 díg.), `phone`.
> - `accounts`: **− `default_validity_months`** (NR-12 não tem validade legal); **+ `cnpj`** (14 díg.) `unique`.
> - `account_members`: **+** `unique(user_id)` (1 conta/usuário) e índice parcial `unique(account_id) where role='owner'` (1 dono/conta).
> - `clients`: **+** `unique(account_id, cnpj)`.
> - `locations`: **+ `code`** (`not null`) `unique(client_id, code)`; nome pode repetir.
> - `machines`: **+ `code`** (`not null`) `unique(location_id, code)` e `unique(location_id, serial_number)`; `tag` é só rótulo.
> - `professionals`: **+ `cpf`** (11 díg.); `unique(account_id, crea)`.
> - `arts`: `unique(number)` global.
> - `checklist_templates`: `unique(account_id, standard_version_id, name)`.
> - `checklist_template_sections`/`_items`: **− `position`** (ordem vem da norma).
> - `checklists`: **+ `inspection_id`** (`not null`, FK→inspections) e `unique(inspection_id, machine_id, checklist_template_id)`.
>
> **Transacional (sincronizado):** `account_id` **denormalizado** nas 7 transacionais (hot path, política RLS direta — ADR 0006; default via `current_account_id()`). Mais:
> - **+ `action_plan_photos`** (nova, 27ª tabela): evidência da execução da ação (≤3 fotos).
> - `inspections`: **+ `name`** (not null) + **`sequence_number`** (not null), `unique(client_id, name, sequence_number)`.
> - `reports`: `inspection_id` → **not null + unique (1:1)**; **− `client_id`** (vem via inspection); **+ `report_number`** (int, nulo até finalizar), `unique(account_id, report_number)`.
> - `action_plans`: **`unique(answer_id)`** (1 por não-conformidade); status agora `pendente`(default)`→verificado`; **+ `verified_at`/`verified_by`** (FK profiles) + check; `due_date`/`responsible_name` agora **nullable** (rascunho/negociação).
> - **RLS habilitado em todas**; políticas em [`rls-status.md`](rls-status.md) (25/27 fechadas; faltam só `accounts`/`account_members` no Auth).
>
> O detalhamento por coluna abaixo cobre a base; para o estado **exato**
> atual (colunas/constraints) consulte sempre o `schema.dbml`.

## Convenções

- PK sempre `id uuid not null default gen_random_uuid()`.
- `created_at timestamptz not null default now()` em toda tabela.
- `updated_at` só onde o registro é editado após criado.
- `deleted_at timestamptz null` (soft delete) em `clients`, `locations`,
  `machines`, `checklist_templates`, `reports`.
- Enums = `text` + `check` (não `enum` nativo).
- **Tenancy normalizada**: `account_id` vive **apenas nas raízes do
  tenant** (`clients`, `checklist_templates`, `professionals`,
  `account_members`). As demais tabelas do tenant derivam a conta pela
  cadeia de FKs (ver [ADR 0006](../adr/0006-normalized-tenancy.md)).

---

# Camada 1 — Referência (global, sem `account_id`, sem RLS de tenant)

## `standards`
A norma. Sem soft delete (revogação acontece no nível da versão).

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `code` | text | não | `NR-12`, `NR-10`. `unique` |
| `title` | text | não | Título completo |
| `description` | text | sim | Contexto opcional |
| `created_at` | timestamptz | não | — |

## `standard_versions`
Versão estruturada (redação consolidada). O **checklist completo** = esta
versão + todos os seus itens. Identifica a portaria de origem nos próprios
campos. **Imutável após `published`.**

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `standard_id` | uuid | não | FK → `standards` |
| `version_label` | text | não | Ex. "Redação 916/2019" |
| `source_portaria_number` | text | sim | Portaria de origem, ex. `SEPRT n.º 916` |
| `source_issuing_body` | text | sim | Órgão emissor, ex. `SEPRT` |
| `source_signed_date` | date | sim | Data da portaria |
| `source_dou_date` | date | sim | Data no D.O.U. |
| `source_url` | text | sim | Link oficial |
| `effective_from` | date | sim | Início de vigência |
| `effective_until` | date | sim | Fim (null = vigente) |
| `status` | text | não | `check (draft, published, revoked)` |
| `published_at` | timestamptz | sim | — |
| `created_at` | timestamptz | não | — |

`unique (standard_id, version_label)`.

## `standard_sections`
Módulo ou anexo de uma versão.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `standard_version_id` | uuid | não | FK → `standard_versions` |
| `section_type` | text | não | `check (module, annex)` |
| `code` | text | não | `12.1`, `Anexo I` |
| `title` | text | não | "Princípios gerais" |
| `position` | integer | não | Ordem |
| `created_at` | timestamptz | não | — |

`unique (standard_version_id, code)`.

## `standard_items`
A cláusula. Filho de seção (a versão chega via seção).

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `standard_section_id` | uuid | não | FK → `standard_sections` |
| `parent_item_id` | uuid | sim | FK → `standard_items` (sub-item aninhado) |
| `number` | text | não | `12.1.1` |
| `text` | text | não | Texto da cláusula |
| `position` | integer | não | Ordem na seção/pai |
| `created_at` | timestamptz | não | — |

`unique (standard_section_id, number)`.

## `machine_types`
| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `name` | text | não | "Torno mecânico". `unique` |
| `created_at` | timestamptz | não | — |

## `machine_models`
Nível intermediário da hierarquia de máquina (`type → model → unit`).

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `machine_type_id` | uuid | não | FK → `machine_types` |
| `manufacturer` | text | não | "Siemens", "WEG" |
| `model_code` | text | não | "5123" |
| `created_at` | timestamptz | não | — |

`unique (machine_type_id, manufacturer, model_code)`. **Decisão aberta:**
catálogo global vs por-tenant.

## `location_types`
| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `name` | text | não | "Oficina", "Cozinha". `unique` |
| `created_at` | timestamptz | não | — |

## `risk_matrix_rules`
Referência global. PK composta `(probability, severity)`.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `probability` | text | não | `check (low, medium, high)` |
| `severity` | text | não | `check (minor, moderate, major)` |
| `risk_level` | text | não | `check (low, medium, high, critical)` |

---

# Camada de Formas de Checklist (tenant)

## `checklist_templates`
A "forma" (recorte da norma). **Raiz do tenant** (tem `account_id`).
Agnóstico de máquina.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `account_id` | uuid | não | FK → `accounts` (raiz do tenant) |
| `standard_version_id` | uuid | não | FK → `standard_versions` |
| `name` | text | não | "Checklist Prensas" |
| `description` | text | sim | — |
| `created_at` / `updated_at` | timestamptz | não | — |
| `deleted_at` | timestamptz | sim | Soft delete |

## `checklist_template_sections`
Filha do template, pai dos itens. Agrupa por módulo/anexo (espelha a seção
da norma).

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `checklist_template_id` | uuid | não | FK → `checklist_templates` |
| `standard_section_id` | uuid | não | FK → `standard_sections` (qual módulo/anexo) |
| `position` | integer | sim | Ordem |
| `created_at` | timestamptz | não | — |

`unique (checklist_template_id, standard_section_id)`. Conta deriva via template.

## `checklist_template_items`
A seleção: quais itens da norma entram nesta forma.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `checklist_template_section_id` | uuid | não | FK → `checklist_template_sections` |
| `standard_item_id` | uuid | não | FK → `standard_items` |
| `position` | integer | sim | Ordem |
| `created_at` | timestamptz | não | — |

`unique (checklist_template_section_id, standard_item_id)`. Conta deriva via
section → template. **Integridade (trigger):** o `standard_item` deve
pertencer à `standard_section` que a seção do template espelha.

---

# Camada 2 — Cadastro (tenant)

## `accounts`
O tenant. Tem `id` (é a própria conta).

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK (é o tenant) |
| `type` | text | não | `engineer` \| `company` (gancho fase posterior) |
| `name` | text | não | Nome da consultoria |
| `default_validity_months` | integer | não | default `12`, `check > 0` |
| `data_sharing_consent` | boolean | não | Gancho fase posterior (base de conhecimento) |
| `created_at` | timestamptz | não | — |

## `account_members`
Usuários da conta. **Raiz** (tem `account_id`).

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `account_id` | uuid | não | FK → `accounts` |
| `user_id` | uuid | não | FK → `auth.users` (Supabase Auth) |
| `role` | text | não | `check (owner)` no v1 |
| `created_at` | timestamptz | não | — |

`unique (account_id, user_id)`.

## `clients`
Empresa inspecionada (real ou simbólica). **Raiz do tenant**.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `account_id` | uuid | não | FK → `accounts` (engenheiro que gerencia) |
| `linked_account_id` | uuid | sim | FK → `accounts` (gancho fase posterior: empresa reivindica) |
| `name` | text | não | Razão social |
| `cnpj` | text | sim | `check (null ou 14 dígitos)` |
| `contact_name` / `contact_email` / `contact_phone` | text | sim | Contato (campos leves) |
| `created_at` / `updated_at` | timestamptz | não | — |
| `deleted_at` | timestamptz | sim | Soft delete |

## `locations`
Local de inspeção, filho do cliente. Contém as máquinas. Conta deriva via client.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `client_id` | uuid | não | FK → `clients` |
| `location_type_id` | uuid | sim | FK → `location_types` |
| `name` | text | não | "Oficina 2 — unidade Sorocaba" |
| `address` | text | sim | — |
| `created_at` / `updated_at` | timestamptz | não | — |
| `deleted_at` | timestamptz | sim | Soft delete |

## `machines`
Unidade física. Conta deriva via location → client.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `machine_model_id` | uuid | não | FK → `machine_models` (tipo vem via model) |
| `location_id` | uuid | não | FK → `locations` (cliente vem via location) |
| `tag` | text | não | "Prensa 02" |
| `serial_number` | text | sim | Número de série |
| `manufacture_year` | integer | sim | Ano de fabricação (na unidade) |
| `created_at` / `updated_at` | timestamptz | não | — |
| `deleted_at` | timestamptz | sim | Soft delete |

---

# Camada de Pessoas / Responsabilidade Técnica (tenant)

## `professionals`
Responsável técnico (pode ser inspetor de campo). **Raiz do tenant**.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `account_id` | uuid | não | FK → `accounts` |
| `member_id` | uuid | sim | FK → `account_members` (usuário ligado, opcional) |
| `full_name` | text | não | Nome |
| `crea` | text | sim | Registro profissional |
| `title` | text | sim | Título |
| `created_at` | timestamptz | não | — |

## `arts`
Anotação de Responsabilidade Técnica. Conta deriva via professional.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `professional_id` | uuid | não | FK → `professionals` |
| `number` | text | não | Número da ART |
| `issued_at` | date | sim | Emissão |
| `pdf_path` | text | sim | Caminho do PDF |
| `created_at` | timestamptz | não | — |

---

# Camada 3 — Transacional (tenant)

## `inspections`
Serviço do engenheiro, cobrindo 1..N locais (via `inspection_scope`).
Conta deriva via client.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `client_id` | uuid | não | FK → `clients` |
| `responsible_professional_id` | uuid | sim | FK → `professionals` |
| `art_id` | uuid | sim | FK → `arts` |
| `status` | text | não | `check (in_field, completed)` |
| `performed_on` | date | sim | Data do serviço |
| `notes` | text | sim | — |
| `created_at` / `updated_at` | timestamptz | não | — |
| `deleted_at` | timestamptz | sim | Soft delete |

## `inspection_scope`
Escopo da inspeção = quais **locais** o serviço cobre.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `inspection_id` | uuid | não | FK → `inspections` |
| `location_id` | uuid | não | FK → `locations` |
| `created_at` | timestamptz | não | — |

`unique (inspection_id, location_id)`.

## `checklists`
Checklist **aplicado**: forma X na máquina Y. Conta deriva via machine →
location → client.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `machine_id` | uuid | não | FK → `machines` |
| `checklist_template_id` | uuid | não | FK → `checklist_templates` (a forma aplicada) |
| `valid_until` | date | sim | Validade por máquina |
| `status` | text | sim | `in_progress` \| `completed` |
| `raw_whatsapp_payload` | jsonb | sim | Payload bruto do n8n/WhatsApp |
| `created_at` / `updated_at` | timestamptz | não | — |

> **Em aberto:** a ligação entre `checklists` e `inspections` foi deixada
> para uma decisão posterior (deliberadamente).

## `answers`
Resposta por item da forma.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `checklist_id` | uuid | não | FK → `checklists` |
| `checklist_template_item_id` | uuid | não | FK → `checklist_template_items` |
| `status` | text | não | `check (compliant, non_compliant, not_applicable)` |
| `justification` | text | sim | Obrigatória se `non_compliant` |
| `probability` | text | sim | Se `non_compliant` |
| `severity` | text | sim | Se `non_compliant` |
| `risk_level` | text | sim | Lookup em `risk_matrix_rules` |
| `measured_value` | decimal | sim | Medição opcional |
| `measured_unit` | text | sim | — |
| `created_at` | timestamptz | não | — |

`unique (checklist_id, checklist_template_item_id)`. **Check:** se
`non_compliant`, então `justification`+`probability`+`severity`+`risk_level`
NOT NULL.

## `answer_photos`
Até 3 fotos por não-conformidade.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `answer_id` | uuid | não | FK → `answers` |
| `storage_path` | text | não | Caminho no Supabase Storage |
| `position` | integer | não | `check in (1,2,3)` |
| `created_at` | timestamptz | não | — |

`unique (answer_id, position)`.

## `reports`
Laudo. Conta deriva via client.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `inspection_id` | uuid | sim | FK → `inspections` (**decisão aberta:** 1:1 vs consolida N) |
| `client_id` | uuid | não | FK → `clients` |
| `report_number` | text | sim | — |
| `issued_at` | date | sim | Emissão |
| `status` | text | não | `check (draft, in_review, final)` |
| `ai_generated_text` | text | sim | Rascunho da IA (preservado) |
| `final_text` | text | sim | Texto final do engenheiro |
| `pdf_path` | text | sim | PDF gerado |
| `created_at` / `updated_at` | timestamptz | não | — |
| `deleted_at` | timestamptz | sim | Soft delete |

## `action_plans`
Ação corretiva ligada a uma resposta não-conforme.

| Coluna | Tipo | Null? | Descrição |
|---|---|---|---|
| `id` | uuid | não | PK |
| `answer_id` | uuid | não | FK → `answers` (deve ser `non_compliant`) |
| `description` | text | não | O que fazer |
| `responsible_name` | text | não | Texto livre |
| `due_date` | date | não | Prazo |
| `status` | text | sim | `aberto` \| `verificado` (reinspeção — a definir) |
| `created_at` / `updated_at` | timestamptz | não | — |
