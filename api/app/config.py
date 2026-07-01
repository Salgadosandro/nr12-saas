"""Configuração: lê as variáveis de ambiente do .env de forma tipada."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_anon_key: str
    # Opcionais (entram mais adiante):
    supabase_service_role_key: str | None = None
    anthropic_api_key: str | None = None
    voyage_api_key: str | None = None          # embeddings (camada de conhecimento)
    stripe_secret_key: str | None = None       # billing (test mode: sk_test_...)
    stripe_webhook_secret: str | None = None   # webhook (whsec_...) — entra depois
    # URLs de retorno do Checkout (o frontend trata; default p/ dev)
    billing_success_url: str = "http://localhost:3000/billing/sucesso"
    billing_cancel_url: str = "http://localhost:3000/billing/cancelado"
    # CORS: lista separada por vírgula. Em dev fica "*"; em prod, ex: "https://nr12.relatoriorapido.com"
    cors_origins: str = "*"


settings = Settings()
