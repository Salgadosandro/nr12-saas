# Plano de Execução — Backend (até a testagem)

Lista de tarefas até o **backend testado**, incluindo a **camada de estatística**
e a **integração com Stripe**. Ordem por dependência: o **produto (laudo)** vem
primeiro; estatística e Stripe constroem em cima; testes fecham.

Legenda: ⬜ a fazer · 🟡 em andamento · ✅ feito

## Estado atual (base já pronta)
- ✅ Banco: 27 tabelas, RLS, Auth, migrations 0001–0004, isolamento testado
- ✅ API FastAPI de pé; `GET /reports/{id}` (corpo + Anexos 1 e 2) com RLS
- ✅ Norma NR-12: 30 sections + 200 itens do corpo (12.2–12.18)

---

## Fase 1 — Completar a API do laudo (o produto)
- 🟡 Configurar **Supabase Storage** — bucket `laudos` (PDFs) + policies por conta ✅ (migration 0009); bucket de fotos ⬜
- ⬜ `GET /reports/{id}` — **Anexo 3** (não-conformidades: item da norma + fotos + risco + plano + execução)
- ⬜ `POST /inspections/{id}/reports` — criar **revisão** (version, revision_reason)
- ⬜ `PATCH /reports/{id}` — editar `final_text` + transições `draft→in_review→final` (com validação)
- ⬜ `POST /reports/{id}/draft` — **IA (Claude)** gera `ai_generated_text` *(usar skill `claude-api`)*
- ⬜ `POST /reports/{id}/pdf` — **reportlab** monta o PDF → Storage → `pdf_path`
- ⬜ Seed de um **checklist_template real** (itens da norma) + 1 inspeção com respostas, p/ exercitar o fluxo ponta a ponta

## Fase 2 — Referência: anexos da NR-12
- ⬜ Seed dos **anexos** relevantes (ex.: Anexo VIII – Prensas) — adaptar o parser à numeração dos anexos
- ⬜ (demais anexos sob demanda, por tipo de máquina)

## Fase 3 — Camada de estatística (analytics / embeddings)
- ✅ Habilitar **`pgvector`** no Postgres (migration 0006)
- ✅ Modelar o armazenamento de embeddings — tabela `knowledge_entries` (texto + vetor) — **ADR 0007**
- ✅ Serviço de **geração de embeddings** (Voyage `voyage-3`) + backfill de `answers.justification` + `action_plans.description`
- ✅ **Busca semântica**: `POST /knowledge/search` (fn `match_knowledge`, HNSW cosseno) — testado ponta a ponta
- ✅ **Sugestão de notas** (decision support): `POST /knowledge/rating-suggestion` (distribuição histórica de probability/severity, amostra mínima)
- ✅ **Foguinho do item** (Wilson lower bound, escala 1–5): `POST /knowledge/foguinho` — risco do item honesto com a amostra
- ✅ **Problemas típicos**: `POST /knowledge/common-problems` (o que verificar/marcar no item)
- ✅ Matriz de risco populada (`risk_matrix_rules` seed) — destrava o ADR 0003
- ✅ **RAG**: `POST /knowledge/suggest` (IA adapta um plano a partir dos casos parecidos) — testado (fundamentou no caso pertinente e descartou o não-pertinente)
- ⬜ **Agregados cross-tenant** ("foguinhos"): Wilson lower bound + k-anonimato (design) — usa `account_id`
- ⬜ `solution_embedding` (agrupar planos parecidos) — fase posterior
- ✅ Serviço/endpoints próprios (router `knowledge`, separado da API do laudo)

## Fase 4 — Stripe (assinatura OU avulso por máquina)
- ✅ Modelar `plans` / `subscriptions` / `report_payments` + RLS — **ADR 0008** (migration 0010)
- ✅ Stripe test mode (BRL); preço inline (price_data) — sem Price pré-criado
- ✅ Checkout: `POST /billing/subscribe` (assinatura) e `POST /reports/{id}/checkout` (avulso N×preço) — testados
- ✅ **Gating**: `POST /reports/{id}/pdf` → 402 sem entitlement (assinatura ativa OU laudo pago)
- 🟡 **Webhook** `POST /billing/webhook` (código pronto) — falta testar com Stripe CLI (whsec_)

## Fase 5 — Testagem do backend (o objetivo)
- ✅ Testes automatizados de **RLS** (2 contas, isolamento) — pytest (`api/tests/`, 4 testes verdes)
- 🟡 Testes de **integração**: billing (entitlement liga/desliga) ✅; demais endpoints via HTTP ⬜
- ⬜ **E2E** do laudo: criar → draft (IA) → editar → PDF
- ✅ Testes da **camada de estatística** (foguinho/Wilson, sugestão de notas)
- ⬜ Teste do fluxo **Stripe** (test mode)
- ✅ Testes de **segurança**: auth 401 (token inválido — bug corrigido), webhook 400 (assinatura falsa), Storage cross-tenant, RLS em subscriptions
- ⬜ Conferir que **tudo está em migrations** (schema reproduzível do zero)

---

## Transversal (contínuo)
- ⬜ Toda mudança de schema = **nova migration** + sync de docs (`schema.dbml`, dicionário, rls-status)
- ⬜ **Ingestão WhatsApp/n8n** = track **paralelo** (alimenta `answers` em produção; para teste, usamos seed)

> Nota de sequência: Stripe é a Fase 4 de propósito — só faz sentido cobrar
> depois que o laudo (o produto) funciona. A estatística vem antes porque é
> diferencial de valor, mas depois do laudo porque depende dos dados que o laudo gera.
