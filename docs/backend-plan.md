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
- ⬜ Configurar **Supabase Storage** (buckets de fotos e de PDFs + policies por conta)
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
- ⬜ Habilitar **`pgvector`** no Postgres
- ⬜ Modelar o armazenamento de embeddings (coluna `vector` ou tabela de conhecimento) — **ADR**
- ⬜ Serviço de **geração de embeddings** (backfill de `answers.justification` + `action_plans.description`)
- ⬜ **Busca semântica**: sugerir plano de ação para não-conformidade parecida
- ⬜ **Agregados de frequência** ("foguinhos"): Wilson lower bound + k-anonimato (design)
- ⬜ Serviço/endpoints próprios (separado da API do laudo)

## Fase 4 — Stripe (assinatura)
- ⬜ Modelar **planos/assinaturas** (tabelas `plans` / `subscriptions` + RLS) — **ADR de billing**
- ⬜ Configurar produtos/preços no **Stripe (test mode)**
- ⬜ Endpoint de **checkout session**
- ⬜ **Webhook** (FastAPI) para eventos (assinatura criada/atualizada/cancelada)
- ⬜ **Gating** de features por plano (ex.: nº de laudos, acesso à estatística)

## Fase 5 — Testagem do backend (o objetivo)
- ⬜ Testes automatizados de **RLS** (2 contas, isolamento) — pytest
- ⬜ Testes de **integração** dos endpoints (pytest + httpx)
- ⬜ **E2E** do laudo: criar → draft (IA) → editar → PDF
- ⬜ Testes da **camada de estatística**
- ⬜ Teste do fluxo **Stripe** (test mode)
- ⬜ Conferir que **tudo está em migrations** (schema reproduzível do zero)

---

## Transversal (contínuo)
- ⬜ Toda mudança de schema = **nova migration** + sync de docs (`schema.dbml`, dicionário, rls-status)
- ⬜ **Ingestão WhatsApp/n8n** = track **paralelo** (alimenta `answers` em produção; para teste, usamos seed)

> Nota de sequência: Stripe é a Fase 4 de propósito — só faz sentido cobrar
> depois que o laudo (o produto) funciona. A estatística vem antes porque é
> diferencial de valor, mas depois do laudo porque depende dos dados que o laudo gera.
