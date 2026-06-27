# Roadmap

Plano de entrega vivo do NR-12 SaaS. A ordem aqui é por **dependência
técnica**, não por preferência: cada item constrói em cima do anterior.
Atualizar conforme avança.

> **Princípio que rege a sequência:** o Stripe (catraca de cobrança) só
> entra **depois** que o produto entrega valor de ponta a ponta
> (auth + laudo + dashboard). Não se cobra por um prédio que ainda não
> está de pé. Decisão tomada no início do projeto e mantida.

Legenda: 🟢 feito · 🟡 em andamento · ⚪ não iniciado · 🔵 fase posterior

## Onde estamos

O **backend está completo e validado**:
- 27 tabelas modeladas, documentadas e no Supabase.
- RLS + regras de negócio em todas as tabelas.
- Auth com bootstrap (signup → profile → `create_account` → owner).
- **Teste de isolamento multi-tenant passou** (cada conta só enxerga os
  próprios dados). Ver [`docs/database/rls-status.md`](docs/database/rls-status.md).

~~A única lacuna do backend é reprodutibilidade.~~ ✅ **Resolvida (2026-06-27):**
o schema foi capturado como migrations versionadas em
[`supabase/migrations/`](supabase/migrations/) (baseline via `pg_dump 17.6` +
trigger do Auth à parte). O banco agora é reconstruível a partir do repo.

## Sequência

| # | Peça | Estado | Por que está nesta posição |
|---|---|---|---|
| **0** | **Migrations versionadas** | 🟢 | ✅ **Feito (2026-06-27).** Schema capturado em `supabase/migrations/` (baseline via `pg_dump 17.6` + trigger do Auth à parte). Backend agora reconstruível do zero a partir do repo. |
| **1** | **Criação dos laudos** | ⚪ | **É o produto.** O laudo é o que o cliente paga pra receber. A tabela `reports` já prevê o ciclo `draft → in_review → final` com `ai_generated_text` / `final_text` / `pdf_path`. Trabalho: puxar não-conformidades + risco + planos de ação → IA gera rascunho → engenheiro revisa → gera PDF. Camada de lógica (FastAPI ou Edge Function) — zona de força do autor. |
| **2** | **Frontend / Dashboard** | ⚪ | A interface pro engenheiro fazer CRUD de cadastro, revisar inspeções e editar/finalizar laudos. Next.js + React + TS + Tailwind + shadcn. Onde o autor mais quer aprender. |
| **3** | **Stripe (assinatura)** | ⚪ | A catraca. Só faz sentido com o core (laudo + dashboard) já de pé. |
| **4** | **Consolidação + embeddings** | 🔵 | Fase 2. Indexa planos de ação passados com `pgvector` e sugere recomendações pra não-conformidades parecidas (busca semântica + frequência / "foguinhos"). Só fica útil **depois que houver dado acumulado** — por isso é o último. Desenho preservado no histórico do Git. |

## Em aberto (encaixam quando o autor decidir)

- **Ingestão via WhatsApp + n8n** — coleta de respostas de checklist em
  campo, escrita no Supabase. Pode entrar junto do #1 (alimenta os laudos).
- **Convites de equipe** (`account_invites` + fluxo de aceite) — hoje cada
  usuário cria a própria conta; convidar colegas pra uma conta existente
  fica pra quando precisar de multi-usuário por conta.
- **App mobile** — em aberto; pode ser desnecessário já que o WhatsApp
  cobre a coleta de campo.

## Dívidas técnicas conhecidas

- Reabilitar confirmação de e-mail no Auth antes de produção (está OFF
  pra facilitar o dev).
- Relaxar `unique(user_id)` em `account_members` quando for permitir um
  usuário em múltiplas contas.
- Limpar dados de teste do banco (usuários/contas/clientes fake) antes do
  primeiro uso real.
