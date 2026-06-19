# 0005 - Não-conformidade como estado de uma resposta; fotos como tabela-filha

- **Status:** Aceito
- **Data:** 2026-06-19

## Contexto

Na inspeção, o técnico percorre os itens do checklist (que são os itens
da norma selecionados) e responde cada um. O fluxo real, conforme a
prática de mercado:

```
item do checklist → item da norma → resposta
  (conforme / não conforme / não se aplica
   + justificativa + até 3 fotos da não-conformidade)
```

Surge a pergunta de modelagem: "não-conformidade" é uma entidade
própria, ou é apenas um estado de uma resposta?

E as "3 fotos da não-conformidade": modelar como três colunas
(`photo1`, `photo2`, `photo3`) ou como tabela-filha?

## Decisão

**Não-conformidade NÃO é uma entidade.** Existe uma resposta por item
do checklist em `inspection_responses`, com:

- `status in ('compliant','non_compliant','not_applicable')`.
- Quando `status = 'non_compliant'`: `justification`, `probability`,
  `severity` e `risk_level` (lookup na matriz, ver
  [ADR 0003](0003-data-driven-risk-matrix.md)) tornam-se obrigatórios.
- Caso contrário, esses quatro campos ficam nulos.

Isso é imposto por um `check` condicional na própria tabela. A
justificativa é obrigatória **apenas** para `non_compliant`;
`not_applicable` não exige texto (decisão de negócio do Sandro).

Uma "não-conformidade", portanto, é a consulta
`where status = 'non_compliant'`. Planos de ação (`action_plans`) e
fotos (`response_photos`) penduram-se na resposta, não numa entidade
separada.

**Fotos como tabela-filha, com teto rígido de 3.** `response_photos`
tem `response_id` (FK), `storage_path`, `position` (`check in (1,2,3)`),
e `unique (response_id, position)`. O máximo de 3 é garantido por
trigger/aplicação.

## Consequências

- (+) Sem duplicação: o item respondido já carrega tudo; não há uma
  segunda tabela "espelhando" itens reprovados.
- (+) Cobre o caso real (achado = item do checklist), que é a regra no
  modelo Petrobras onde todo item da norma é avaliado.
- (+) Tabela-filha de fotos é normalizada: contar, ordenar e renderizar
  no PDF fica trivial, e o limite (3) pode mudar no futuro sem alterar o
  schema de colunas.
- (+) O `check` condicional garante a nível de banco que uma
  não-conformidade nunca fica sem risco/justificativa.
- (-) Achados **fora** do checklist (algo que o inspetor viu mas não
  estava na lista) não têm lugar neste modelo. Decisão consciente: no
  modelo Petrobras, a norma inteira está no checklist, então isso não
  deveria acontecer. Se virar necessidade real, será um novo ADR (ex:
  resposta "avulsa" sem `checklist_version_item_id`).
- (-) O `check` condicional com quatro colunas é um pouco verboso; é o
  preço de manter a integridade no banco em vez de confiar na app.
