"""Fixtures de teste.

Usa dois usuários REAIS (cada um na sua conta) para exercitar o RLS de verdade:
o cliente Supabase escopado pelo JWT é o mesmo que a API usa, então o que o teste
enxerga é exatamente o que o RLS permite.

User A já existe; User B é criado via Admin API (idempotente) se faltar.
São contas de TESTE do projeto de desenvolvimento.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # api/

from app.config import settings  # noqa: E402
from supabase import create_client  # noqa: E402

USER_A = {"email": "salgadosan_99@hotmail.com", "password": "Teste1234"}
USER_B = {"email": "rls_b@nr12test.dev", "password": "Teste1234"}


def _scoped(email: str, password: str):
    c = create_client(settings.supabase_url, settings.supabase_anon_key)
    sess = c.auth.sign_in_with_password({"email": email, "password": password}).session
    c.postgrest.auth(sess.access_token)
    # onboarding: garante que o usuário tem uma conta (o que o app faz no 1º login)
    if c.rpc("current_account_id", {}).execute().data is None:
        c.rpc("create_account", {"account_name": f"Conta de teste {email}"}).execute()
    return c


def _ensure_user_b():
    admin = create_client(settings.supabase_url, settings.supabase_service_role_key)
    try:
        admin.auth.admin.create_user({
            "email": USER_B["email"],
            "password": USER_B["password"],
            "email_confirm": True,
        })
    except Exception:
        pass  # já existe


@pytest.fixture(scope="session")
def client_a():
    return _scoped(**USER_A)


@pytest.fixture(scope="session")
def client_b():
    _ensure_user_b()
    return _scoped(**USER_B)


def account_id(db) -> str:
    return db.rpc("current_account_id", {}).execute().data
