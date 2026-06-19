# 0001 - Registrar decisões de arquitetura em ADRs

- **Status:** Aceito
- **Data:** 2026-06-19

## Contexto

Ao longo do projeto vamos tomar decisões técnicas que não são óbvias a
partir do código sozinho (por que Supabase e não outro provedor? por
que RLS e não schema por tenant? por que matriz de risco e não um
campo simples?). Sem um registro, essas decisões — e principalmente o
*porquê* — se perdem, e qualquer pessoa (incluindo o próprio autor, no
futuro) acaba refazendo a mesma discussão ou, peor, revertendo uma
decisão deliberada por não saber que ela foi deliberada.

## Decisão

Vamos usar **Architecture Decision Records (ADR)**, no formato
popularizado por Michael Nygard: um arquivo Markdown por decisão,
numerado sequencialmente, em `docs/adr/`, contendo Contexto, Decisão e
Consequências.

Regras:
- ADRs aceitos não são editados retroativamente. Se uma decisão muda,
  cria-se um novo ADR que referencia e supersede o anterior.
- Nem toda escolha vira ADR — só decisões com impacto estrutural
  (afetam múltiplos módulos, são caras de reverter, ou não são a
  opção "óbvia" e alguém vai perguntar "por que assim?").

## Consequências

- (+) Qualquer pessoa que entrar no projeto entende o "porquê", não só
  o "o quê".
- (+) Decisões reversíveis vs. irreversíveis ficam explícitas.
- (-) Disciplina extra: exige parar e escrever antes de seguir.
