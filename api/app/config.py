"""Configuração: lê as variáveis de ambiente do .env de forma tipada."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_anon_key: str
    # Opcionais (entram mais adiante):
    supabase_service_role_key: str | None = None
    anthropic_api_key: str | None = None


settings = Settings()
