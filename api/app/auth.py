"""Autenticação: valida o JWT e entrega o usuário + um cliente já escopado.

Esta é a peça que usa o `Depends()` do FastAPI: qualquer endpoint que declarar
`user: CurrentUser = Depends(get_current_user)` recebe, de graça, o usuário
autenticado e um cliente Supabase pronto para falar com o banco em nome dele.
"""
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client

from .supabase import get_supabase_for_token

bearer = HTTPBearer()


@dataclass
class CurrentUser:
    id: str          # auth.users.id (o "sub" do JWT)
    token: str       # o JWT cru
    db: Client       # cliente Supabase já escopado a este usuário (RLS aplica)


def get_current_user(
    cred: HTTPAuthorizationCredentials = Depends(bearer),
) -> CurrentUser:
    token = cred.credentials
    db = get_supabase_for_token(token)

    # Valida o token perguntando ao próprio Supabase quem é o dono dele.
    # (Simples e sempre correto; depois dá pra otimizar com verificação local.)
    resp = db.auth.get_user(token)
    if resp is None or resp.user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )

    return CurrentUser(id=resp.user.id, token=token, db=db)
