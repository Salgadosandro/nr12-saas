# Convenções de Nomenclatura SQL

Padrão único para todo o schema — qualquer pessoa lendo uma tabela
nova deve conseguir adivinhar a convenção sem precisar perguntar.

## Tabelas

- `snake_case`, sempre no **plural**: `clients`, `machines`, `inspections`.
- Tabela de associação N:N (quando existir): nome combinado das duas
  entidades em ordem alfabética, ex: `account_members` (não
  `members_accounts`).
- Tabelas de referência/lookup (dado global, não tenant-scoped):
  sufixo `_rules` ou `_types` deixa explícito que não é dado
  transacional: `risk_matrix_rules`.

## Colunas

- `snake_case`, sempre no **singular**.
- Chave primária: sempre `id`, tipo `uuid`, `default gen_random_uuid()`.
- Chave estrangeira: `<entidade_singular>_id`, ex: `client_id`,
  `account_id`, `inspection_id`. Nunca abreviar (`cli_id` ❌).
- Booleanos: prefixo `is_` ou `has_` (`is_active`, `has_action_plan`).
  Nunca `flag` genérico.
- Datas sem hora: tipo `date` (ex: `inspection_date`, `valid_until`,
  `due_date`).
- Timestamps com hora: tipo `timestamptz`, sempre UTC, sufixo `_at`
  (`created_at`, `updated_at`, `deleted_at`).
- Enums implementados como `text` + `check constraint` (não `enum`
  nativo do Postgres) — motivo: alterar um `enum` nativo (adicionar/
  remover valor) é uma operação de schema mais cara e menos flexível
  do que ajustar um `check constraint`. Para este projeto, onde as
  regras de negócio (status, severidade) ainda podem mudar nos
  próximos marcos, `text + check` é a escolha mais segura.

## Constraints e índices

- Chave estrangeira: `fk_<tabela>_<coluna_referenciada>` quando nomeada
  explicitamente.
- Check constraint: `chk_<tabela>_<regra>`.
- Índice: `idx_<tabela>_<coluna(s)>`.
- Toda FK de isolamento multi-tenant (`account_id`) tem índice — é a
  coluna mais filtrada do banco inteiro (toda política de RLS passa
  por ela).

## Não abreviar

Exceção apenas para siglas já padronizadas no domínio (`cnpj`, `nr12`
se aparecer em algum nome). Fora isso, nome completo sempre
(`responsible_name`, não `resp_nm`).
