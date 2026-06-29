"""Fábrica de cliente Supabase escopado ao usuário.

A ideia central do isolamento: criamos um cliente com a chave ANON (pública) e
nele injetamos o JWT do usuário. Assim, toda query que esse cliente fizer chega
ao PostgREST com a identidade do usuário — e o RLS se aplica sozinho, como se
ele estivesse logado no banco.
"""
from supabase import create_client, Client, ClientOptions

from .config import settings


def get_supabase_for_token(access_token: str) -> Client:
    # o JWT vai no header global -> chega ao postgrest E ao storage (RLS em ambos)
    client = create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=ClientOptions(headers={"Authorization": f"Bearer {access_token}"}),
    )
    client.postgrest.auth(access_token)
    return client


def get_supabase_service() -> Client:
    """Cliente com a chave de SERVIÇO — IGNORA o RLS.

    Uso restrito: o webhook do Stripe chega SEM o JWT do usuário, então não dá
    para escopar por conta. Atualizamos linhas por id (vindo do metadata do
    Stripe), nunca por entrada livre do usuário.
    """
    if not settings.supabase_service_role_key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY ausente no .env (necessária ao webhook)")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
