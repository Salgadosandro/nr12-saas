# Requisitos do Banco de Dados — Marco 1

Documento de requisitos que o schema precisa suportar. Escrito antes
de qualquer linha de SQL — o schema é uma consequência destes
requisitos, não o contrário.

## Requisitos funcionais

| ID | Requisito |
|---|---|
| FR1 | Cada conta (tenant) só pode ver/alterar seus próprios dados. Isolamento garantido no banco (ver [ADR 0002](../adr/0002-postgres-supabase-multi-tenant-rls.md)). |
| FR2 | Uma conta gerencia múltiplos clientes (empresas inspecionadas). |
| FR3 | Um cliente possui múltiplas máquinas/equipamentos. |
| FR4 | Uma máquina possui um histórico de inspeções (1:N). |
| FR5 | Uma inspeção chega ao sistema como rascunho, originada de um payload bruto coletado via WhatsApp/n8n (JSON), antes de ser estruturada. |
| FR6 | Uma inspeção segue um ciclo de vida de 3 estados: `rascunho → em_revisao → finalizado`. Transições são sempre "pra frente" (não existe voltar de finalizado pra rascunho — uma correção pós-finalização gera observação nova, não reabre o registro). |
| FR7 | Uma inspeção finalizada tem uma data de validade (`valid_until`), calculada como `data_da_inspecao + meses_validade_padrao_da_conta`. O prazo de validade é uma política de negócio da própria conta (consultoria), não um valor fixo da NR-12 — é configurável por conta (`accounts.default_validity_months`). |
| FR8 | Uma inspeção pode ter múltiplas não-conformidades. |
| FR9 | Cada não-conformidade é classificada por uma matriz de risco (Probabilidade x Severidade → Nível de Risco), com a matriz armazenada como dado (ver [ADR 0003](../adr/0003-data-driven-risk-matrix.md)), não fixa em código. |
| FR10 | Cada não-conformidade pode ter um plano de ação simples: descrição em texto livre, responsável e prazo. Sem workflow de aprovação no v1. |
| FR11 | O texto técnico do laudo é gerado por IA a partir dos dados brutos da inspeção, mas a versão final (editada/aprovada pelo engenheiro) é armazenada separadamente do rascunho gerado pela IA — precisamos do antes e do depois, para auditoria e para melhorar os prompts no futuro. |

## Requisitos não funcionais

| ID | Requisito |
|---|---|
| NFR1 | RLS habilitado e testado em toda tabela tenant-scoped. A aplicação nunca é a única camada de isolamento. |
| NFR2 | Toda tabela tem colunas de auditoria `created_at` / `updated_at` (timestamptz, UTC). |
| NFR3 | Convenções de nomenclatura consistentes em todo o schema — ver [`03-naming-conventions.md`](03-naming-conventions.md). |
| NFR4 | Exclusão é lógica (soft delete via `deleted_at`) para `clients`, `machines` e `inspections` — dados de inspeção têm valor de auditoria/histórico e não devem ser apagados fisicamente por engano. Tabelas puramente operacionais (`account_members`) podem usar exclusão física. |

## Fora de escopo no v1 (decisões já tomadas, ver memória do projeto)

- Cálculo/reminder automático de vencimento de laudo (fica pra v1.1 — a tabela já guarda `valid_until`, o que falta é só a rotina que lê isso e dispara aviso).
- Workflow de aprovação em múltiplas etapas para planos de ação.
- Papéis/permissões diferentes dentro de uma conta (todo membro é tratado como `owner` no v1; a tabela `account_members` já existe para não exigir migration disruptiva quando isso for adicionado).
- Cobrança/assinatura (Stripe) — ver decisão de sequenciamento na memória do projeto.

## Questões abertas — resolvidas

- **`valid_until` pode ser sobrescrito manualmente?** Sim, por design: `valid_until` é uma coluna comum (não gerada/computada), calculada automaticamente ao finalizar a inspeção, mas editável depois como qualquer outro campo. Não precisou de coluna extra nem migration — só uma decisão de não usar `generated always as`.
- **Validação de CNPJ:** formato básico (14 dígitos) como `check constraint` no banco — barato e pega erro de digitação na entrada. Validação completa (dígito verificador) fica na camada de aplicação, que pode evoluir sem precisar de migration. Constraint registrada no dicionário de dados.
- **Combinação inválida em `risk_matrix_rules`:** impossível a nível de banco (FK composta), não apenas aviso de UI — decisão já registrada no dicionário de dados e no [ADR 0003](../adr/0003-data-driven-risk-matrix.md).
