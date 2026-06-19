# 0003 - Matriz de risco (Probabilidade x Severidade) como dado, não como código

- **Status:** Aceito
- **Data:** 2026-06-19

## Contexto

Cada não-conformidade encontrada numa inspeção precisa de uma
classificação de risco. Foi decidido usar uma matriz de risco
(Probabilidade x Severidade), alinhada à prática de análise de risco
usada em NR-12/ISO 12100, em vez de um campo único simples
(Baixo/Médio/Alto).

O problema: matrizes de risco na prática variam — empresas diferentes
podem pesar probabilidade e severidade de formas diferentes, e a
classificação resultante pode precisar de ajuste sem depender de
deploy de código.

## Decisão

A combinação `(probability, severity) → risk_level` é armazenada numa
tabela de referência (`risk_matrix_rules`), não calculada em código de
aplicação nem em `CASE WHEN` espalhado.

- `non_conformities` grava `probability` e `severity` (os dois inputs,
  brutos, como reportados na inspeção).
- `risk_level` é o resultado do lookup em `risk_matrix_rules` para
  aquele par — calculado no momento da gravação (aplicação faz o
  lookup) e armazenado em `non_conformities.risk_level`, não apenas
  derivado em tempo de leitura.

## Consequências

- (+) A matriz pode ser ajustada (ex: trocar a classificação de uma
  combinação específica) editando uma linha de dados, sem deploy.
- (+) Fácil de testar e auditar: a matriz inteira é visível numa
  consulta `SELECT * FROM risk_matrix_rules`.
- (+) `risk_level` armazenado (não calculado on-the-fly) permite
  indexar e filtrar/ordenar rapidamente no dashboard ("mostrar tudo
  que é Crítico") sem precisar recalcular ou joinar a cada consulta.
- (-) Precisa de uma rotina de seed/migration pra popular
  `risk_matrix_rules` antes que qualquer não-conformidade possa ser
  classificada — e de validação pra garantir que toda combinação
  possível tem uma linha correspondente (sem "buracos" na matriz).
- (-) Se a matriz for editada depois, `risk_level` de não-conformidades
  já gravadas **não** é recalculado automaticamente (decisão
  deliberada: o laudo reflete a classificação vigente no momento da
  inspeção, não retroativa).
