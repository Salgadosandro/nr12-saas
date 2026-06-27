# Contrato da API — Geração de Laudos (Marco 2)

Pré-requisito de leitura: [ROADMAP](../../ROADMAP.md) (passo 1 = laudos) e
[modelo de dados](../database/02-data-model.md).

## Princípio de fronteira

> **O fluxo do laudo é uma API (FastAPI). Todo o resto (CRUD de cadastro e
> inspeção) vai direto no Supabase via PostgREST, protegido por RLS.**

O Supabase já entrega REST automática + auth + isolamento multi-tenant (RLS) +
storage. A FastAPI existe só onde há **lógica pesada** que não cabe no banco:

- chamar a **IA** para redigir o parecer técnico;
- **renderizar o PDF** (corpo + 4 anexos) com reportlab;
- **regras de negócio** do laudo (numerar a revisão, controlar transições de status).

Tudo que é CRUD simples (clientes, locais, máquinas, inspeções, respostas,
planos de ação) **não passa pela API** — o frontend fala direto com o Supabase.

## Autenticação e isolamento

Toda chamada carrega o **JWT do usuário**: `Authorization: Bearer <access_token>`
(emitido pelo Supabase Auth). A API:

1. **valida** o token (assinatura conferida com o segredo/JWKS do Supabase);
2. usa **a identidade do usuário** para falar com o banco — então o **RLS
   continua valendo automaticamente** (cada engenheiro só acessa o que é dele).

A API **não** usa `service_role` (que ignora o RLS) no fluxo normal — ela carrega
a credencial do usuário, não a de admin. `service_role` fica reservado a operações
administrativas conscientes (nenhuma necessária neste marco).

## Pipeline (humano no meio)

```
abrir revisão → [IA rascunha] → engenheiro revisa/edita → finaliza → [renderiza PDF]
   draft              draft            in_review            final         final
```

Nada é automático de ponta a ponta: a IA **rascunha**, o engenheiro **revisa,
edita e assina**. O PDF só é gerado a partir do texto que o engenheiro aprovou.

## Endpoints

### 1. `POST /inspections/{inspection_id}/reports`
Abre uma **nova revisão** do laudo da inspeção.
- **Regra:** `version` = (maior version existente da inspeção) + 1; `status = 'draft'`.
  O `report_number` é mantido entre revisões (a v1 define; as seguintes herdam).
- **Body:** `{ "revision_reason": "string|null" }` (nulo na emissão inicial).
- **Resposta:** `201` → `{ id, inspection_id, version, status, report_number }`.

### 2. `POST /reports/{id}/draft`
Monta os dados da inspeção, chama a **IA** e grava o rascunho.
- **Faz:** assembla o dossiê (NCs + risco + planos + máquinas + empresa/engenheiro)
  → envia ao modelo (Claude) → grava `ai_generated_text` e semeia `final_text`.
- **Regra:** permitido enquanto `status = 'draft'` (re-rascunhar sobrescreve).
- **Resposta:** `200` → `{ id, ai_generated_text }`.

### 3. `GET /reports/{id}`
Retorna o laudo + o **dossiê estruturado** dos anexos (para o front exibir/editar).
- **Resposta:** `200` →
  ```json
  {
    "report": { "id": "...", "version": 1, "status": "draft",
                "ai_generated_text": "...", "final_text": "...", "pdf_path": null },
    "dossier": {
      "company": { "...": "clients" },
      "engineer": { "...": "professionals + arts" },
      "anexo1_machines": [ { "tag": "...", "type": "...", "model": "...", "...": "" } ],
      "anexo2_dashboard": { "compliant": 0, "nonconformities": 0, "not_applicable": 0 },
      "anexo3_nonconformities": [
        { "norm_item": "12.x", "justification": "...", "risk_level": "high",
          "photos": ["url"], "action_plan": { "description": "...", "status": "pendente",
          "execution_photos": ["url"] } }
      ],
      "anexo4_art": { "number": "...", "pdf_path": "..." }
    }
  }
  ```

### 4. `PATCH /reports/{id}`
Engenheiro edita o texto final e/ou move o status.
- **Body:** `{ "final_text": "string?", "status": "draft|in_review|final ?" }`.
- **Regra:** transições válidas `draft → in_review → final`; ir para `final`
  exige `final_text` preenchido.
- **Resposta:** `200` → o report atualizado.

### 5. `POST /reports/{id}/pdf`
**Renderiza o PDF** (corpo + 4 anexos), sobe no Supabase Storage e grava `pdf_path`.
- **Regra:** exige `final_text` preenchido (`status` `in_review` ou `final`).
  Cada revisão gera seu próprio PDF — o **artefato legal congelado** daquela data.
- **Resposta:** `200` → `{ pdf_path, url }`.

## Fora de escopo (deliberado)

- **CRUD** de cadastro/inspeção/respostas → Supabase direto (PostgREST + RLS).
- **Embeddings / análise** (planos de ação, NCs) → **passo 4 (Fase 2)**, serviço
  próprio. Geração por *backfill* a partir de `answers.justification` +
  `action_plans.description` (texto já preservado). Não entra nesta API.
- **Texto boilerplate do corpo** (linguagem técnica padrão) → template no código
  da API por enquanto; editável por engenheiro numa fase posterior.

## Stack

FastAPI · supabase-py (com o JWT do usuário) · Anthropic SDK (Claude, para o
rascunho) · reportlab (PDF) · Supabase Storage (PDFs e fotos).
