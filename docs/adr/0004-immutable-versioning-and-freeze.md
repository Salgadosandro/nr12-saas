# 0004 - Versionamento imutável da norma e do checklist, com congelamento na inspeção

- **Status:** Aceito
- **Data:** 2026-06-19

## Contexto

O laudo NR-12 é um documento técnico/legal. Ele precisa refletir
exatamente o que foi inspecionado, sob a norma e o checklist vigentes
**no momento da inspeção** — não sob versões que vierem depois.

Duas coisas mudam ao longo do tempo, por motivos independentes:

1. **A norma** (`standards`) é revisada (novas portarias da NR-12).
2. **O checklist** de cada conta muda quando ela decide incluir/excluir
   módulos ou itens (ver [ADR 0005](0005-nonconformity-as-response-state.md)
   para a estrutura de respostas; aqui o foco é a seleção de itens).

Se editássemos a norma ou o checklist "no lugar" (in-place), todas as
inspeções passadas que apontassem para eles passariam a "mentir":
mostrariam itens que não existiam quando foram feitas, ou perderiam
itens que foram removidos. Inaceitável para um documento de auditoria.

O modelo de checklist do cliente segue a prática de mercado
(Petrobras): o checklist lista os itens da norma; o "checklist geral" é
a norma inteira; o cliente cria seleções desmarcando módulos/itens.

## Decisão

**Dois eixos de versão, ambos imutáveis após publicação:**

- `standards` → `standard_versions` → `standard_sections` (módulo/
  anexo) → `standard_items` (com `parent_item_id` para sub-itens).
  Uma `standard_version` com `status = 'published'` é imutável.
- `checklists` → `checklist_versions` → `checklist_version_items`
  (a seleção de `standard_items` incluídos). Uma `checklist_version`
  com `status = 'published'` é imutável.

**Editar = criar versão nova.** Mudar uma norma ou um checklist publicado
nunca altera o registro existente; cria-se uma nova versão. As antigas
permanecem para sempre.

**A inspeção congela a versão.** `inspections.checklist_version_id`
aponta para a versão exata usada — que por sua vez referencia a versão
da norma. O laudo gerado a partir dela é, portanto, reproduzível.

**O "checklist geral" não é entidade.** É a `standard_version` inteira,
expandida. A app pré-preenche a seleção de um novo checklist com todos
os itens e o usuário desmarca o que não interessa.

**Imutabilidade via trigger, não via RLS.** Um trigger
`BEFORE UPDATE/DELETE` bloqueia alteração de versões publicadas e de
registros append-only. RLS cuida de isolamento, não de imutabilidade.

## Consequências

- (+) Laudos antigos são reproduzíveis e fiéis — requisito de auditoria.
- (+) "Desmarcar" (escopo do checklist) fica claramente separado de
  "não se aplica" (resposta na inspeção) — são tabelas e momentos
  diferentes.
- (+) Suporte a múltiplas normas (NR-10, NR-13…) sai de graça, porque
  `standards` é genérico.
- (-) Mais tabelas e mais disciplina: publicar uma versão é um passo
  explícito, e a app precisa de fluxo de "rascunho → publicar".
- (-) Seleção armazenada como itens incluídos (`checklist_version_items`)
  significa que "o que foi desmarcado" é derivado por diferença contra
  a `standard_version`, não armazenado diretamente. Aceitável: o que
  importa registrar é o que entrou.
- (-) Triggers de imutabilidade precisam ser testados explicitamente
  (tentar editar uma versão publicada deve falhar).
