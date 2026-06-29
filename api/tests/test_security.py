"""Testes de SEGURANÇA — o que protege o produto, além do isolamento básico.

1. Auth: token inválido -> 401 (não pode virar 500 nem passar).
2. Webhook: assinatura inválida -> 400 (não aceitar evento forjado).
3. Storage cross-tenant: B não baixa o PDF de A.
4. RLS em outra tabela sensível (subscriptions): B não vê a assinatura de A.
"""
import asyncio
import uuid

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.auth import get_current_user
from app.config import settings
from app.routers.billing import stripe_webhook
from conftest import account_id


# 1. AUTH ---------------------------------------------------------------
def test_token_invalido_vira_401():
    cred = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token.invalido.xyz")
    with pytest.raises(HTTPException) as exc:
        get_current_user(cred)
    assert exc.value.status_code == 401


# 2. WEBHOOK ------------------------------------------------------------
class _FakeReq:
    def __init__(self, body, headers):
        self._b, self.headers = body, headers

    async def body(self):
        return self._b


def test_webhook_assinatura_invalida_vira_400():
    settings.stripe_webhook_secret = "whsec_testlocal"
    req = _FakeReq(b'{"type":"checkout.session.completed"}',
                   {"stripe-signature": "t=1,v1=assinaturafalsa"})
    with pytest.raises(HTTPException) as exc:
        asyncio.run(stripe_webhook(req))
    assert exc.value.status_code == 400


# 3. STORAGE CROSS-TENANT ----------------------------------------------
def test_storage_isolado_entre_contas(client_a, client_b):
    path = f"{account_id(client_a)}/sec-test/{uuid.uuid4().hex}.txt"
    client_a.storage.from_("laudos").upload(path, b"segredo de A", {"upsert": "true"})

    # A baixa o proprio (sanidade)
    assert client_a.storage.from_("laudos").download(path) == b"segredo de A"

    # B (outra conta) NAO consegue baixar o arquivo de A
    with pytest.raises(Exception):
        client_b.storage.from_("laudos").download(path)


# 4. RLS EM OUTRA TABELA SENSIVEL --------------------------------------
def test_rls_subscriptions(client_a, client_b):
    a = client_a.table("subscriptions").insert({"status": "incomplete"}).execute().data[0]
    visto_por_b = client_b.table("subscriptions").select("id").eq("id", a["id"]).execute().data
    assert visto_por_b == []
