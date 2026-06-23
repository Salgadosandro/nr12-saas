# Estratégia de Row Level Security

Pré-requisito de leitura: [ADR 0002](../adr/0002-postgres-supabase-multi-tenant-rls.md)
explica o *porquê*. Este documento é o *como* — ainda em design, será
aplicado como migration no início da implementação do schema (próximo
passo do Marco 1).

## Conceito-base: "conta atual do usuário logado"

Toda política de RLS precisa responder: "a linha que estou tentando
ler/escrever pertence a uma conta da qual o usuário autenticado é
membro?". Em vez de repetir essa lógica em toda política, criamos uma
função SQL auxiliar:

```sql
create or replace function current_account_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select account_id
  from account_members
  where user_id = auth.uid()
$$;
```

- `security definer` porque um usuário comum não tem permissão de
  `select` direta em `account_members` de outras contas — a função
  roda com privilégio elevado só para resolver "quais contas são
  minhas", nunca para ler dado de negócio.
- `stable` (não `volatile`) — dentro de uma mesma query, o resultado
  não muda, o que ajuda o planner do Postgres a otimizar.
- Retorna `setof uuid` porque no v1 um usuário só deveria pertencer a
  uma conta, mas a função já suporta múltiplas sem migration futura.

## Tenancy normalizada (base v1)

A base usa **tenancy normalizada** (ver [ADR 0006](../adr/0006-normalized-tenancy.md)):
`account_id` vive só nas **raízes** do tenant; as filhas derivam pela
cadeia de FKs. Isso muda como as políticas são escritas: nas raízes é uma
comparação direta; nas filhas é um `EXISTS`/join até a raiz.

| Grupo | Tabelas | Política |
|---|---|---|
| **Referência (global)** | `standards`, `standard_versions`, `standard_sections`, `standard_items`, `machine_types`, `machine_models`, `location_types`, `risk_matrix_rules` | Sem `account_id`. Leitura para qualquer autenticado; escrita só por role admin. |
| **Raízes do tenant** | `account_members`, `clients`, `checklist_templates`, `professionals` (e `accounts` via `id`) | Comparação direta em `account_id`. |
| **Filhas (derivam)** | `locations`, `machines`, `checklist_template_sections`, `checklist_template_items`, `arts`, `inspections`, `inspection_scope`, `checklists`, `answers`, `answer_photos`, `reports`, `action_plans` | `EXISTS` subindo até a raiz. |

## Padrão A — política numa raiz (comparação direta)

Ex. `clients` (tem `account_id`):

```sql
alter table clients enable row level security;

create policy "select_own_account" on clients
  for select using (account_id in (select current_account_ids()));
-- insert/update (with check)/delete seguem o mesmo molde.
```

## Padrão B — política numa filha (join até a raiz)

Ex. `locations` (deriva via `client_id`):

```sql
alter table locations enable row level security;

create policy "select_own_account" on locations
  for select using (
    exists (
      select 1 from clients c
      where c.id = locations.client_id
        and c.account_id in (select current_account_ids())
    )
  );
-- insert/update/delete: mesmo EXISTS no with check/using.
```

Para tabelas mais fundas (ex. `answers`), o `EXISTS` sobe mais um nível
(`answers → checklists → machines → locations → clients`). Verboso, porém
seguro. Se a performance pesar em escala, a otimização é denormalizar
`account_id` de volta nas tabelas quentes (ADR 0006).

## A inserção numa filha valida o pai

Numa filha, a política de `insert` (no `with check`) garante que o **pai
referenciado pertence à sua conta** — é o mesmo `EXISTS`. Assim não dá pra
pendurar um filho num pai de outro tenant.

(Ajuste fino — ex: o que acontece se o usuário pertencer a mais de uma
conta — é uma decisão de v1.1, já que no v1 cada usuário pertence a
exatamly uma conta.)

## A camada de referência é a exceção deliberada

As 7 tabelas de referência (norma e sua hierarquia, tipos, matriz de
risco) não têm `account_id` nem RLS de escrita por tenant — são regra
de domínio compartilhada. Política: leitura liberada para qualquer
usuário autenticado, escrita restrita a uma role administrativa (não
exposta ao usuário final). É coerente com elas representarem o
conhecimento normativo comum (ver ADR 0002 e 0003), não dado de um
cliente.

Ponto de atenção: os **checklists** são tenant-scoped (cada conta tem
os seus), mas eles **referenciam** dados globais (`standard_items` via
`checklist_version_items`). Isso é seguro: ler um `standard_item` não
vaza nada de outro tenant — a norma é pública. O que é isolado é a
*seleção* que cada conta fez.

## Imutabilidade não é RLS — é constraint/trigger separado

RLS controla *quem vê o quê*, não *o que pode mudar*. A imutabilidade
de versões publicadas (`standard_versions`/`checklist_versions` com
`status = 'published'`) e de registros append-only
(`inspection_responses`, `response_photos`) é imposta por **trigger**
`BEFORE UPDATE/DELETE` que bloqueia a alteração, não por política de
RLS. Manter os dois mecanismos separados deixa claro qual problema cada
um resolve.

## Estratégia de teste (antes de escrever qualquer linha de app)

Antes de conectar qualquer API/frontend ao banco, validar isolamento
manualmente:

1. Seed de duas contas fake (`account_a`, `account_b`), cada uma com
   1 cliente, 1 máquina, 1 inspeção.
2. Autenticar como usuário de `account_a` (via Supabase Auth local) e
   confirmar que `select * from inspections` retorna **só** a linha
   de `account_a`.
3. Tentar `insert`/`update` forçando manualmente um `account_id` de
   `account_b` autenticado como usuário de `account_a` — deve falhar.
4. Repetir para cada tabela tenant-scoped antes de considerar o Marco 1
   "pronto".

Esse teste manual vira, no Marco 2 (Backend/API), um teste automatizado
de RLS — mas a primeira verificação é sempre manual, olhando o
resultado com os próprios olhos.
