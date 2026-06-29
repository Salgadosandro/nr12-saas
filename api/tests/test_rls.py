"""RLS / isolamento multi-tenant — o coração do produto.

Duas contas distintas: cada uma só pode ver o próprio dado. Se este teste passar,
o isolamento que sustenta o SaaS está garantido no nível do banco.
"""
import uuid

from conftest import account_id


def _make_client(db, name: str) -> dict:
    return db.table("clients").insert({
        "account_id": account_id(db),                 # tabela-raiz: account_id explícito
        "name": name,
        "cnpj": f"{uuid.uuid4().int % 10**14:014d}",   # 14 dígitos (passa no check)
    }).execute().data[0]


def test_contas_diferentes(client_a, client_b):
    """Pré-condição: A e B são contas distintas."""
    assert account_id(client_a) != account_id(client_b)


def test_isolamento_clients(client_a, client_b):
    tag = uuid.uuid4().hex[:8]
    a = _make_client(client_a, f"Empresa A {tag}")
    b = _make_client(client_b, f"Empresa B {tag}")

    a_ids = {r["id"] for r in client_a.table("clients").select("id").execute().data}
    b_ids = {r["id"] for r in client_b.table("clients").select("id").execute().data}

    # cada um vê o próprio
    assert a["id"] in a_ids
    assert b["id"] in b_ids
    # nenhum vê o do outro
    assert b["id"] not in a_ids
    assert a["id"] not in b_ids


def test_acesso_direto_por_id_bloqueado(client_a, client_b):
    """Mesmo sabendo o id do registro do outro, o RLS devolve vazio (não 403)."""
    a = _make_client(client_a, f"Empresa A {uuid.uuid4().hex[:8]}")
    visto_por_b = client_b.table("clients").select("*").eq("id", a["id"]).execute().data
    assert visto_por_b == []


def test_update_alheio_nao_afeta(client_a, client_b):
    """B tentando atualizar o registro de A não altera nada (RLS filtra o UPDATE)."""
    a = _make_client(client_a, "Original A")
    client_b.table("clients").update({"name": "Invadido por B"}).eq("id", a["id"]).execute()
    atual = client_a.table("clients").select("name").eq("id", a["id"]).execute().data[0]
    assert atual["name"] == "Original A"
