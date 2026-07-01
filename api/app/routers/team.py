"""Equipe: convidar inspetores e listar membros da conta."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from ..auth import CurrentUser, get_current_user
from ..supabase import get_supabase_service

router = APIRouter(prefix="/team", tags=["team"])


class InviteRequest(BaseModel):
    email: EmailStr


@router.get("/members")
def list_members(user: CurrentUser = Depends(get_current_user)):
    """Membros ativos + convites pendentes da conta."""
    # Membros confirmados (via RLS — já filtrado pela conta)
    raw_members = (
        user.db.table("account_members")
        .select("id,role,created_at,user_id")
        .execute()
        .data
    ) or []

    # Busca perfis separadamente
    user_ids = [m["user_id"] for m in raw_members]
    profiles = {}
    if user_ids:
        profile_rows = (
            user.db.table("profiles")
            .select("id,full_name,email")
            .in_("id", user_ids)
            .execute()
            .data
        ) or []
        profiles = {p["id"]: p for p in profile_rows}

    members = [
        {
            "id": m["id"],
            "role": m["role"],
            "created_at": m["created_at"],
            "profile": profiles.get(m["user_id"], {"full_name": None, "email": None}),
        }
        for m in raw_members
    ]

    # Convites ainda não aceitos
    pending = (
        user.db.table("account_invitations")
        .select("id,email,created_at,expires_at")
        .is_("accepted_at", "null")
        .gt("expires_at", "now()")
        .execute()
        .data
    )

    return {"members": members, "pending_invitations": pending}


@router.post("/invite")
def invite_member(
    body: InviteRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Convida um inspector por email. Usa a service role para chamar o Admin Auth."""
    email = body.email.lower().strip()

    # Busca account_id da conta do usuário logado
    account_rows = (
        user.db.table("account_members")
        .select("account_id")
        .eq("user_id", user.id)
        .limit(1)
        .execute()
        .data
    )
    if not account_rows:
        raise HTTPException(status_code=403, detail="Conta não encontrada")

    account_id = account_rows[0]["account_id"]

    # Verifica se já é membro
    existing_member = (
        user.db.table("account_members")
        .select("id")
        .eq("account_id", account_id)
        .execute()
        .data
    )
    # Busca qualquer membro com esse email via profiles
    existing_emails = (
        user.db.table("profiles")
        .select("id,email")
        .eq("email", email)
        .limit(1)
        .execute()
        .data
    )
    if existing_emails:
        existing_ids = {m["user_id"] for m in existing_member}
        if existing_emails[0]["id"] in existing_ids:
            raise HTTPException(status_code=409, detail="Este usuário já é membro da conta")

    # Cria o convite na tabela (ignora se já existe)
    invite_resp = (
        user.db.table("account_invitations")
        .upsert(
            {"account_id": account_id, "email": email, "invited_by": user.id},
            on_conflict="account_id,email",
        )
        .execute()
    )
    if not invite_resp.data:
        raise HTTPException(status_code=500, detail="Não foi possível criar o convite")

    # Envia o email de convite via Supabase Admin Auth
    try:
        svc = get_supabase_service()
        svc.auth.admin.invite_user_by_email(email)
    except Exception as exc:
        # Se o usuário já existe no Auth, o convite na tabela já foi criado.
        # O inspetor só precisa fazer login — o trigger vai linká-lo na conta.
        # Não tratamos como erro fatal.
        if "already registered" not in str(exc).lower():
            raise HTTPException(status_code=502, detail=f"Erro ao enviar convite: {exc}")

    return {"message": f"Convite enviado para {email}"}


@router.delete("/invite/{invitation_id}")
def cancel_invite(
    invitation_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Cancela um convite pendente."""
    result = (
        user.db.table("account_invitations")
        .delete()
        .eq("id", invitation_id)
        .is_("accepted_at", "null")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    return {"message": "Convite cancelado"}
