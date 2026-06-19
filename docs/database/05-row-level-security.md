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

## Padrão de política, por tabela tenant-scoped

Toda tabela com `account_id` (todas exceto `risk_matrix_rules`) recebe
exatamente este padrão — usando `inspections` como exemplo:

```sql
alter table inspections enable row level security;

create policy "select_own_account" on inspections
  for select
  using (account_id in (select current_account_ids()));

create policy "insert_own_account" on inspections
  for insert
  with check (account_id in (select current_account_ids()));

create policy "update_own_account" on inspections
  for update
  using (account_id in (select current_account_ids()))
  with check (account_id in (select current_account_ids()));

create policy "delete_own_account" on inspections
  for delete
  using (account_id in (select current_account_ids()));
```

Mesmo padrão, mesmos 4 comandos, trocando só o nome da tabela — é
exatamente por isso que `account_id` denormalizado (ADR 0002) compensa:
nenhuma política aqui precisa de join.

## `account_id` nunca vem do client

Confiar no client (frontend/n8n) para enviar o `account_id` correto no
insert seria reabrir a porta que o RLS existe pra fechar. Decisão:
`account_id` é preenchido no banco via `default`, derivado da sessão
autenticada — não é um campo que a aplicação escolhe livremente:

```sql
alter table inspections
  alter column account_id set default (select current_account_ids() limit 1);
```

(Ajuste fino — ex: o que acontece se o usuário pertencer a mais de uma
conta — é uma decisão de v1.1, já que no v1 cada usuário pertence a
exatamly uma conta.)

## `risk_matrix_rules` é a exceção deliberada

Não tem `account_id`, não tem RLS de escrita por tenant — é dado de
referência global. Política: leitura liberada pra qualquer usuário
autenticado, escrita restrita a uma role administrativa (não exposta
ao usuário final). Isso é coerente com ela representar uma regra de
domínio compartilhada (ver ADR 0003), não um dado de um cliente
específico.

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
