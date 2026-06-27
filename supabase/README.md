# Supabase — migrations versionadas

Esta pasta torna o banco **reprodutível a partir do repositório**. As migrations
em [`migrations/`](migrations/) recriam o schema inteiro do zero, em ordem.

## Conteúdo

| Arquivo | O que cria |
|---|---|
| `20260627090000_initial_schema.sql` | **Baseline.** 27 tabelas + funções (`current_account_ids`, `current_account_id`, `create_account`, `handle_new_user`) + RLS + todas as políticas. Capturado do projeto "Portfolio NR12" com `pg_dump 17.6` (schema-only, schema `public`). |
| `20260627090001_auth_signup_trigger.sql` | Trigger `on_auth_user_created` em `auth.users` (chama `handle_new_user`). Fica à parte porque mora no schema `auth`, fora do dump de `public`. |

> Os dados de teste (usuários/contas/clientes) **não** entram aqui — só estrutura.
> Seeds de dados de referência (norma NR-12, matriz de risco) virão como migrations
> próprias quando forem inseridos.

## Como o schema foi capturado (sem Docker)

O `supabase db dump` exige Docker (roda o `pg_dump` num container). Nesta máquina
não há Docker, então usamos um `pg_dump` nativo (binários do PostgreSQL 17.6,
mesma versão do servidor) conectando direto ao pooler da nuvem:

```
pg_dump --schema-only --schema=public --no-owner --no-privileges \
  -h aws-1-us-west-2.pooler.supabase.com -p 5432 \
  -U postgres.<project-ref> -d postgres -f <arquivo>.sql
```

Ajustes manuais no baseline para permitir replay: removidas as linhas
`\restrict`/`\unrestrict` (meta-comandos do psql) e neutralizado o
`CREATE SCHEMA public` (já existe em todo projeto Supabase).

## Como reconstruir num projeto novo

1. Criar um projeto Supabase vazio e linká-lo: `supabase link --project-ref <novo-ref>`.
2. Aplicar as migrations: `supabase db push` (aplica em ordem de timestamp).
   - `db push` **não** precisa de Docker (roda o SQL direto na nuvem).
3. Conferir: 27 tabelas, RLS ativo em todas, e o teste de isolamento de
   [`../docs/database/rls-status.md`](../docs/database/rls-status.md).

## Nota sobre o projeto atual ("Portfolio NR12")

O baseline foi capturado **depois** de o schema já existir no projeto atual.
Para alinhar o histórico de migrations sem reaplicar (evitar erro de "já existe"),
marcar o baseline como aplicado uma vez:

```
supabase migration repair --status applied 20260627090000
supabase migration repair --status applied 20260627090001
```

Assim, daqui pra frente, `supabase db push` aplica só as migrations **novas**.
