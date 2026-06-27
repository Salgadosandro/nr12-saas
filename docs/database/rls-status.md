# Tracker de RLS & Regras de Negócio

Checklist vivo do estado de **segurança (RLS)** e **regras de negócio** por
tabela. Reflete o banco real no Supabase. Atualizar conforme avança.

Legenda: ✅ feito · ⬜ pendente · 🔒 bloqueado de propósito · 🔜 no marco do Auth.

**RLS habilitado em TODAS as 28 tabelas.** Funções auxiliares:
`current_account_ids()` (setof, usada nas políticas) e `current_account_id()`
(escalar, usada como default do `account_id` denormalizado nas transacionais).

## Camada de Referência (9) — ✅ completa
Leitura aberta (`SELECT` para `authenticated`), escrita só `service_role`.

| Tabela | RLS | Política |
|---|---|---|
| `standards` | ✅ | `standards_read` (SELECT) |
| `standard_item_images` 🆕 | ✅ | `standard_item_images_read` (SELECT) — figuras da norma |
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
| `accounts` | ✅ | `accounts_select` + `accounts_update` (membro) | unique(cnpj) | ✅ |
| `account_members` | ✅ | `members_select` (membro) | unique(user), 1 owner/conta | ✅ |

## Transacional (8) — ✅ completa
`account_id` **denormalizado** em todas (política direta, ADR 0006).

| Tabela | RLS | Política | Regras |
|---|---|---|---|
| `inspections` | ✅ | `own_account` (ALL) | + name/sequence; unique(client, name, seq) |
| `inspection_scope` | ✅ | `own_account` (ALL) | unique(inspection, location) |
| `checklists` | ✅ | `own_account` (ALL) | unique(inspection, machine, template) + gate `nr_applies` (12.1.3/12.1.4) + check exclusion |
| `answers` | ✅ | `own_account` (ALL) | unique(checklist, item) + check non_compliant |
| `answer_photos` | ✅ | `own_account` (ALL) | unique(answer, position) + check 1-3 |
| `reports` | ✅ | `own_account` (ALL) | 1:N inspection (revisões); unique(inspection, version) + unique(account, report_number, version) |
| `action_plans` | ✅ | `own_account` (ALL) | unique(answer); status pendente→verificado + check |
| `action_plan_photos` 🆕 | ✅ | `own_account` (ALL) | unique(action_plan, position) + check 1-3 |

## Placar
**28 de 28 tabelas 100% fechadas.** ✅ Marco de banco + Auth COMPLETO.
(28ª = `standard_item_images`, migration 0005 — figuras da norma.)

## Auth & Bootstrap (resolve o "ovo-e-galinha")

O usuário não consegue inserir direto em `accounts`/`account_members` (RLS
nega quem ainda não é membro). O bootstrap usa duas funções `security definer`:

**1. Trigger no signup → cria só o `profile`:**
```sql
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();
```

**2. RPC `create_account` → usuário logado cria a própria conta e vira owner:**
```sql
create or replace function create_account(account_name text, account_cnpj text default null)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_account_id uuid;
begin
  if exists (select 1 from account_members where user_id = auth.uid()) then
    raise exception 'Usuario ja pertence a uma conta';
  end if;
  insert into accounts (name, cnpj) values (account_name, account_cnpj) returning id into v_account_id;
  insert into account_members (account_id, user_id, role) values (v_account_id, auth.uid(), 'owner');
  return v_account_id;
end; $$;
```

Fluxo: **signup → profile** (auto) → **create_account → conta + membership owner**.
Convites pra entrar na conta de outro (`account_invites`) ficam pra fase posterior.

### Políticas de `accounts` / `account_members`
```sql
create policy "accounts_select" on accounts for select using (id in (select current_account_ids()));
create policy "accounts_update" on accounts for update using (id in (select current_account_ids())) with check (id in (select current_account_ids()));
create policy "members_select" on account_members for select using (account_id in (select current_account_ids()));
```
(INSERT em ambas é feito só via `create_account`/`service_role` — usuário comum
nunca insere direto, por isso não há política de insert exposta.)

## ✅ Teste de isolamento — PASSOU (27/06/2026)
Validação manual antes de qualquer app tocar no banco:
1. 2 usuários (A, B); A criou conta, B criou conta via `create_account`.
2. 1 cliente em cada conta.
3. `set local role authenticated` + `set_config('request.jwt.claims', ...)` simulando cada um:
   - **olhos do A** → `select name from clients` retornou **só "Cliente do A"** 🔒
   - **olhos do B** → retornou **só "Cliente do B"** 🔒

Isolamento multi-tenant comprovado pelo banco. Vira teste automatizado no Marco 2.

## Padrões de política usados
- **Referência:** `for select to authenticated using (true)` (leitura aberta).
- **Raiz / denormalizada** (tem `account_id`): `for all using (account_id in (select current_account_ids()))`.
- **Filha normalizada** (cadastro): `for all using (exists (... join até a raiz ...))`.
- **profiles:** `for all using (id = auth.uid())`.
