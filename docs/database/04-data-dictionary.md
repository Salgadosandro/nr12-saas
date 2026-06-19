# Dicionário de Dados

Convenções gerais usadas em todas as tabelas abaixo (ver
[`03-naming-conventions.md`](03-naming-conventions.md) para o
raciocínio completo):
- `id uuid not null default gen_random_uuid()` é sempre a PK.
- `created_at timestamptz not null default now()` em toda tabela.
- `updated_at` só nas tabelas onde o registro é editado depois de
  criado (não em tabelas "append-only" como `non_conformities` ou
  `account_members`).
- `deleted_at timestamptz null` = soft delete, só em `clients`,
  `machines`, `inspections` (ver NFR4 em [`01-requirements.md`](01-requirements.md)).

---

## `accounts`

Um tenant. Tabela raiz — todo o resto pende dela.

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `name` | text | não | — | Nome da conta/consultoria |
| `default_validity_months` | integer | não | `12` | Prazo padrão (em meses) de validade de um laudo finalizado nesta conta. `check > 0`. Política de negócio da conta, não da NR-12 (ver FR7). |
| `created_at` | timestamptz | não | `now()` | — |

## `account_members`

Usuários (Supabase Auth) vinculados a uma conta.

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` |
| `user_id` | uuid | não | — | FK → `auth.users.id` (Supabase Auth) |
| `role` | text | não | `'owner'` | `check in ('owner')` no v1 — coluna existe para suportar papéis futuros sem migration disruptiva |
| `created_at` | timestamptz | não | `now()` | — |

Constraint: `unique (account_id, user_id)` — um usuário não se repete na mesma conta.

## `clients`

Empresa cliente da consultoria (dona das máquinas inspecionadas).

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (isolamento RLS) |
| `name` | text | não | — | Razão social/nome do cliente |
| `cnpj` | text | sim | — | Documento da empresa. `check (cnpj is null or cnpj ~ '^\d{14}$')` — só formato (14 dígitos); dígito verificador é validado na aplicação |
| `created_at` | timestamptz | não | `now()` | — |
| `updated_at` | timestamptz | não | `now()` | — |
| `deleted_at` | timestamptz | sim | `null` | Soft delete |

## `machines`

Máquina/equipamento de um cliente, sujeita a inspeção.

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (isolamento RLS) |
| `client_id` | uuid | não | — | FK → `clients.id` |
| `tag` | text | não | — | Identificação da máquina no parque do cliente (ex: "Prensa 02") |
| `manufacturer` | text | sim | — | Fabricante |
| `model` | text | sim | — | Modelo |
| `serial_number` | text | sim | — | Número de série |
| `location` | text | sim | — | Setor/local físico no cliente |
| `created_at` | timestamptz | não | `now()` | — |
| `updated_at` | timestamptz | não | `now()` | — |
| `deleted_at` | timestamptz | sim | `null` | Soft delete |

## `inspections`

Uma inspeção realizada numa máquina.

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (isolamento RLS) |
| `machine_id` | uuid | não | — | FK → `machines.id` |
| `status` | text | não | `'rascunho'` | `check in ('rascunho','em_revisao','finalizado')` — ver ciclo de vida em `02-data-model.md` |
| `inspection_date` | date | não | — | Data em que a inspeção foi realizada em campo |
| `valid_until` | date | sim | `null` | Calculada **somente ao finalizar**: `inspection_date + accounts.default_validity_months`. `null` enquanto `rascunho`/`em_revisao` |
| `raw_whatsapp_payload` | jsonb | sim | `null` | Payload bruto recebido do fluxo n8n/WhatsApp, antes da estruturação em `non_conformities` |
| `ai_generated_text` | text | sim | `null` | Rascunho do parecer técnico gerado por IA, preservado mesmo após edição (auditoria) |
| `final_report_text` | text | sim | `null` | Texto final do laudo, após revisão/edição do engenheiro. É o que vai pro PDF |
| `created_at` | timestamptz | não | `now()` | — |
| `updated_at` | timestamptz | não | `now()` | — |
| `deleted_at` | timestamptz | sim | `null` | Soft delete |

## `non_conformities`

Item de não-conformidade encontrado numa inspeção. Append-only — uma
vez registrada, não é editada (uma correção entra como observação
nova, mesma lógica do FR6 pra inspeções).

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (isolamento RLS) |
| `inspection_id` | uuid | não | — | FK → `inspections.id` |
| `description` | text | não | — | Descrição da não-conformidade |
| `probability` | text | não | — | `check in ('baixa','media','alta')` |
| `severity` | text | não | — | `check in ('leve','moderada','grave')` |
| `risk_level` | text | não | — | Resultado do lookup em `risk_matrix_rules` no momento da gravação (ver [ADR 0003](../adr/0003-data-driven-risk-matrix.md)) |
| `created_at` | timestamptz | não | `now()` | — |

Constraint adicional: FK composta `(probability, severity)` →
`risk_matrix_rules(probability, severity)`. **Decisão de design**:
combinação inválida é impossível a nível de banco, não apenas avisada
na UI — é a camada de defesa mais barata e a mais difícil de
contornar por engano.

## `action_plans`

Ação corretiva simples associada a uma não-conformidade.

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` | PK |
| `account_id` | uuid | não | — | FK → `accounts.id` (isolamento RLS) |
| `non_conformity_id` | uuid | não | — | FK → `non_conformities.id` |
| `description` | text | não | — | O que precisa ser feito |
| `responsible_name` | text | não | — | Texto livre no v1 (não é FK pra usuário — responsável pode ser alguém do lado do cliente, fora do sistema) |
| `due_date` | date | não | — | Prazo da ação |
| `created_at` | timestamptz | não | `now()` | — |
| `updated_at` | timestamptz | não | `now()` | — |

## `risk_matrix_rules`

Tabela de referência **global** (não tenant-scoped, sem `account_id`,
sem RLS) — é regra de domínio compartilhada por todas as contas.

| Coluna | Tipo | Null? | Default | Descrição |
|---|---|---|---|---|
| `probability` | text | não | — | `check in ('baixa','media','alta')` — parte da PK composta |
| `severity` | text | não | — | `check in ('leve','moderada','grave')` — parte da PK composta |
| `risk_level` | text | não | — | `check in ('baixo','medio','alto','critico')` — resultado da combinação |

PK composta: `(probability, severity)`. Precisa ter exatamente 9 linhas
(3 x 3) seedadas via migration antes de qualquer `non_conformity`
poder ser gravada — a matriz de valores em si (qual combinação vira
"crítico" vs "alto") é uma decisão de negócio do Sandro, a fechar
antes da migration de seed.
