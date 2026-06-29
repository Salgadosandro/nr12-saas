"""Cobertura de RLS — nenhuma tabela pode ficar sem proteção.

Usa a função rls_audit() (migration 0011). Se uma tabela nova nascer sem RLS ou
sem política, este teste falha e mostra qual.
"""


def test_todas_as_tabelas_tem_rls(client_a):
    faltando = client_a.rpc("rls_audit", {}).execute().data
    assert faltando == [], f"Tabelas sem RLS/política: {faltando}"
