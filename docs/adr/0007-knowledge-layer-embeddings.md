# 0007 - Camada de conhecimento: embeddings + texto na mesma linha

- **Status:** Aceito
- **Data:** 2026-06-29

## Contexto

Cada inspeção gera não-conformidades (NCs) com uma constatação
(`answers.justification`) e, quando resolvida, um plano de ação
(`action_plans.description`). Esse histórico tem valor: ao encontrar uma NC
nova, queremos sugerir constatações/planos de casos parecidos e traçar
estatística por item da norma e por tipo de máquina ("qual item é mais
problemático", "problemas típicos deste item").

"Parecido" não é igualdade de texto: *"proteção sem trava"* e
*"enclausuramento destravado"* significam o mesmo sem compartilhar palavras.
Isso pede **busca semântica** (embeddings), não `LIKE`.

## Decisão

Uma tabela dedicada `knowledge_entries` (1 linha por NC) que guarda
**texto E vetor lado a lado**:

- `problem_embedding vector(1024)` — o ÍNDICE de busca (provedor **Voyage AI**,
  modelo `voyage-3`). Habilitado via extensão **pgvector**; índice **HNSW** com
  `vector_cosine_ops`.
- `problem_text` / `solution_text` — o CONTEÚDO. O embedding é uma transformação
  de **mão única** (do vetor não se recupera o texto), então o texto guardado é
  o que se mostra ao engenheiro, o que se copia para preencher, e o que alimenta
  a IA num RAG futuro.
- `machine_type_id` / `machine_model_id` / `standard_item_id` — dimensões de
  filtro e estatística.
- `source_answer_id unique` — proveniência; backfill idempotente (upsert).

Acesso:
- Busca por vizinhança via função `match_knowledge(...)` (PostgREST não ordena
  por distância de vetor). `SECURITY INVOKER` ⇒ o RLS de `knowledge_entries`
  ainda filtra por conta.
- Estatística via **view** `knowledge_stats_by_item` — agregados com `GROUP BY`
  (fatos vs. contadores: nunca colunas `count_*`, que dessincronizam; e "mesmo
  problema" é semântico, não string igual). View marcada `security_invoker = on`
  (sem isso a view roda como dono e ignora o RLS das tabelas de baixo).
- Sugestão de notas (`nc_rating_suggestion`): distribuição histórica de
  `probability`/`severity` por item, calculada sobre **`answers`** (população
  completa de NCs avaliadas, não só as que já têm plano). Decision support — o
  engenheiro decide; só sugere acima de uma amostra mínima.

Provedor de embeddings = Voyage (recomendado pela Anthropic), `VOYAGE_API_KEY`
no `.env`, serviço próprio (`services/embeddings.py`), separado da API do laudo.

## Consequências

- (+) Busca por significado, não por palavra; o texto guardado serve para
  mostrar/preencher e para RAG (a IA escreve a partir do texto que o vetor achou,
  nunca decodificando o vetor).
- (+) Estatística sempre correta (`GROUP BY`), sem lógica de incremento.
- (+) `account_id` mantido: isola por tenant hoje e habilita o agregado
  cross-tenant ("foguinhos") com k-anonimato depois — sem expor texto cru.
- (-) Depende de um provedor externo (Voyage) e de backfill para popular a base;
  re-embed futuro exige saber o `model` (guardado na linha).
- (-) Snapshot: `knowledge_entries` é cópia do texto no momento do backfill; se a
  `answer` mudar depois, a base de conhecimento não se atualiza sozinha (mesmo
  princípio de congelamento da matriz de risco, ADR 0003).
- (-) Cross-tenant ("foguinhos") e `solution_embedding` (agrupar planos) ficam
  para fase posterior.
