"""Define a senha de um usuário via Admin API (uso único, local/dev).

Precisa do SUPABASE_SERVICE_ROLE_KEY no .env (a chave 'secret' do dashboard).
Essa chave é ADMIN: ignora o RLS e pode alterar qualquer usuário — por isso só
deve existir no .env (gitignored) e, idealmente, ser removida depois do uso.

Uso (na pasta api/, com .venv ativado):
    python scripts/set_password.py <email> <nova_senha>
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from supabase import create_client  # noqa: E402


def main():
    if len(sys.argv) != 3:
        print("uso: python scripts/set_password.py <email> <nova_senha>")
        return

    email, new_password = sys.argv[1], sys.argv[2]

    if not settings.supabase_service_role_key:
        print("Falta SUPABASE_SERVICE_ROLE_KEY no .env (a chave 'secret').")
        return

    admin = create_client(settings.supabase_url, settings.supabase_service_role_key)

    result = admin.auth.admin.list_users()
    users = result if isinstance(result, list) else getattr(result, "users", [])
    user = next((u for u in users if (u.email or "").lower() == email.lower()), None)
    if user is None:
        print(f"Usuário {email} não encontrado.")
        return

    admin.auth.admin.update_user_by_id(user.id, {"password": new_password})
    print(f"OK: senha de {email} atualizada.")


if __name__ == "__main__":
    main()
