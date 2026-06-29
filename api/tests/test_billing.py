"""Billing — a regra de entitlement (o cérebro do gate do PDF).

Sem rede: simulamos o resultado do pagamento (o que o webhook gravaria) e
verificamos que o direito ao laudo liga/desliga corretamente.
"""
import random

from app.services import billing


def test_entitlement_liga_com_pagamento(client_a):
    insp = client_a.table("inspections").select("id").limit(1).execute().data
    assert insp, "conta A precisa de uma inspeção (seed da demo)"
    rep = client_a.table("reports").insert({
        "inspection_id": insp[0]["id"],
        "version": random.randint(10000, 99999),
        "status": "draft",
    }).execute().data[0]
    rid = rep["id"]

    # sem assinatura e sem pagamento -> bloqueado
    assert billing.is_entitled(client_a, rid) is False

    # simula o pagamento aprovado (o que o webhook marcaria)
    client_a.table("report_payments").insert({
        "report_id": rid, "machine_count": 1,
        "unit_amount_cents": 1500, "total_amount_cents": 1500,
        "currency": "brl", "status": "paid",
    }).execute()

    # agora tem direito
    assert billing.is_entitled(client_a, rid) is True


def test_planos_visiveis(client_a):
    codes = {p["code"] for p in client_a.table("plans").select("code").execute().data}
    assert {"sub_anual", "por_maquina"} <= codes
