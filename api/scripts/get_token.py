"""Gera um access_token (JWT) de um usuário, pra colar no 'Authorize' do Swagger.

Uso (a partir da pasta api/, com o .venv ativado):
    python scripts/get_token.py
"""
import getpass
import sys
from pathlib import Path

# permite rodar de dentro de api/ e achar o pacote app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from supabase import create_client  # noqa: E402


def main():
    email = input("email do usuário de teste: ").strip()
    password = getpass.getpass("senha: ")

    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    res = client.auth.sign_in_with_password({"email": email, "password": password})

    print("\n=== ACCESS TOKEN (cole no Authorize do /docs) ===\n")
    print(res.session.access_token)
    print()


if __name__ == "__main__":
    main()
