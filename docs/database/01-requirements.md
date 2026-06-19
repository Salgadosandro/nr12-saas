# Requisitos do Banco de Dados — Marco 1

Documento de requisitos que o schema precisa suportar. Escrito antes
de qualquer linha de SQL — o schema é uma consequência destes
requisitos, não o contrário.

## Requisitos funcionais

### Isolamento e cadastro
| ID | Requisito |
|---|---|
| FR1 | Cada conta (tenant) só pode ver/alterar seus próprios dados. Isolamento garantido no banco (ver [ADR 0002](../adr/0002-postgres-supabase-multi-tenant-rls.md)). |
| FR2 | Uma conta gerencia múltiplos clientes (empresas inspecionadas). |
| FR3 | Um cliente possui múltiplas máquinas/equipamentos. Cada máquina tem um tipo (`machine_types`) e um tipo de local (`location_types`). |
| FR4 | Uma máquina possui um histórico de inspeções (1:N). |

### Norma e checklist
| ID | Requisito |
|---|---|
| FR5 | Uma norma (ex. NR-12) é estruturada hierarquicamente: `norma → versão → seção (módulo/anexo) → item`. Itens podem ter sub-itens aninhados. Modelado genérico para suportar outras normas (NR-10, NR-13…) no futuro. |
| FR6 | A norma é versionada. Cada versão é imutável após publicada, para que laudos antigos permaneçam fiéis à norma vigente no momento da inspeção (ver [ADR 0004](../adr/0004-immutable-versioning-and-freeze.md)). |
| FR7 | O "checklist geral" é uma versão da norma inteira, expandida em todos os seus itens. Não é uma entidade separada. |
| FR8 | Cada conta cria checklists próprios selecionando (desmarcando) módulos/itens da norma. Cada seleção publicada é uma `checklist_version` imutável. |
| FR9 | "Desmarcar" um item (não entra na inspeção) é diferente de respondê-lo como "não se aplica" durante a inspeção — são conceitos e momentos distintos. |

### Inspeção, respostas e laudo
| ID | Requisito |
|---|---|
| FR10 | Uma inspeção congela a `checklist_version` usada, garantindo rastreabilidade mesmo após mudanças posteriores no checklist/norma. |
| FR11 | A inspeção pode ser originada de um payload bruto coletado via WhatsApp/n8n (JSON), preservado em `raw_whatsapp_payload`. Status da inspeção: `in_field → completed`. |
| FR12 | Cada item respondido gera uma resposta: `compliant / non_compliant / not_applicable`. Respostas `non_compliant` exigem justificativa, classificação de risco e podem ter até 3 fotos. Justificativa **não** é obrigatória para `not_applicable`. |
| FR13 | Uma não-conformidade não é uma entidade própria — é uma resposta com `status = non_compliant` (ver [ADR 0005](../adr/0005-nonconformity-as-response-state.md)). |
| FR14 | Cada não-conformidade é classificada por matriz de risco (Probabilidade × Severidade → Nível), armazenada como dado (ver [ADR 0003](../adr/0003-data-driven-risk-matrix.md)), não fixa em código. |
| FR15 | Cada não-conformidade pode ter planos de ação simples: descrição, responsável (texto livre) e prazo. Sem workflow de aprovação no v1. |
| FR16 | Um laudo (`reports`) consolida várias inspeções (1:N) e é emitido para um cliente. A inspeção pertence a no máximo um laudo (`report_id` anulável até consolidar). |
| FR17 | A data de validade (`valid_until`) é por inspeção/máquina (não por laudo), calculada como `inspection_date + accounts.default_validity_months`. O prazo é política da conta, configurável, não um valor fixo da NR-12. |
| FR18 | O laudo segue o ciclo `draft → in_review → final`. O texto técnico é gerado por IA (`ai_generated_text`) e a versão final editada pelo engenheiro é armazenada separadamente (`final_text`) — guardamos o antes e o depois, para auditoria e melhoria de prompts. |

## Requisitos não funcionais

| ID | Requisito |
|---|---|
| NFR1 | RLS habilitado e testado em toda tabela tenant-scoped. A aplicação nunca é a única camada de isolamento. |
| NFR2 | Toda tabela tem colunas de auditoria `created_at` / `updated_at` (timestamptz, UTC). |
| NFR3 | Convenções de nomenclatura consistentes em todo o schema — ver [`03-naming-conventions.md`](03-naming-conventions.md). |
| NFR4 | Exclusão é lógica (soft delete via `deleted_at`) para `clients`, `machines`, `inspections`, `reports` e `checklists` — têm valor de auditoria/histórico e não devem ser apagados fisicamente por engano. Tabelas puramente operacionais (`account_members`) podem usar exclusão física. |
| NFR5 | Versões publicadas (`standard_versions`, `checklist_versions`) e registros transacionais de resposta (`inspection_responses`, `response_photos`) são imutáveis após criados — append-only, sem `updated_at`. |

## Fora de escopo no v1 (decisões já tomadas, ver memória do projeto)

- Cálculo/reminder automático de vencimento de laudo (fica pra v1.1 — a tabela já guarda `valid_until`, o que falta é só a rotina que lê isso e dispara aviso).
- Workflow de aprovação em múltiplas etapas para planos de ação.
- Papéis/permissões diferentes dentro de uma conta (todo membro é tratado como `owner` no v1; a tabela `account_members` já existe para não exigir migration disruptiva quando isso for adicionado).
- Cobrança/assinatura (Stripe) — ver decisão de sequenciamento na memória do projeto.

## Questões abertas — resolvidas

- **`valid_until` pode ser sobrescrito manualmente?** Sim, por design: `valid_until` é uma coluna comum (não gerada/computada), calculada automaticamente ao finalizar a inspeção, mas editável depois como qualquer outro campo. Não precisou de coluna extra nem migration — só uma decisão de não usar `generated always as`.
- **Validação de CNPJ:** formato básico (14 dígitos) como `check constraint` no banco — barato e pega erro de digitação na entrada. Validação completa (dígito verificador) fica na camada de aplicação, que pode evoluir sem precisar de migration. Constraint registrada no dicionário de dados.
- **Combinação inválida em `risk_matrix_rules`:** impossível a nível de banco (FK composta), não apenas aviso de UI — decisão já registrada no dicionário de dados e no [ADR 0003](../adr/0003-data-driven-risk-matrix.md).
