"""Camada de conhecimento — funções de estatística (sem rede).

Não exercita embeddings/IA (Voyage/Claude, externos); cobre as funções SQL:
foguinho (Wilson) e sugestão de notas.
"""


def _item_id(db, number: str) -> str:
    rows = db.table("standard_items").select("id").eq("number", number).limit(1).execute().data
    assert rows, f"item {number} deve existir (seed da norma)"
    return rows[0]["id"]


def test_foguinho_wilson(client_a):
    iid = _item_id(client_a, "12.4.3")
    r = client_a.rpc("nc_item_foguinho", {"p_standard_item_id": iid}).execute().data[0]
    # foguinhos na faixa 0..5
    assert 0 <= r["flames"] <= 5
    # o piso de Wilson nunca passa da taxa observada (é um LIMITE INFERIOR)
    assert float(r["wilson_lb"]) <= float(r["rate"]) + 1e-9


def test_rating_suggestion_estrutura(client_a):
    iid = _item_id(client_a, "12.4.3")
    rows = client_a.rpc(
        "nc_rating_suggestion", {"p_standard_item_id": iid, "p_machine_type_id": None}
    ).execute().data
    for r in rows:
        assert r["dimension"] in ("probability", "severity")
        assert 0 <= float(r["pct"]) <= 100
