"""Fábrica de cliente Supabase escopado ao usuário.

A ideia central do isolamento: criamos um cliente com a chave ANON (pública) e
nele injetamos o JWT do usuário. Assim, toda query que esse cliente fizer chega
ao PostgREST com a identidade do usuário — e o RLS se aplica sozinho, como se
ele estivesse logado no banco.
"""
from supabase import create_client, Client

from .config import settings


def get_supabase_for_token(access_token: str) -> Client:
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    # repassa o crachá (JWT) do usuário para todas as chamadas ao banco
    client.postgrest.auth(access_token)
    return client
