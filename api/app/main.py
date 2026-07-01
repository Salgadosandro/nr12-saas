"""Ponto de entrada da API de laudos NR-12."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .config import settings
from .routers import billing, knowledge, reports, team

# Rate limiter — usa IP como chave. Rotas de IA têm limite próprio.
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(title="NR-12 Laudos API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS: em dev aceita tudo; em prod, restringir via CORS_ORIGINS no .env
origins = [o.strip() for o in settings.cors_origins.split(",")] if settings.cors_origins != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports.router)
app.include_router(knowledge.router)
app.include_router(billing.router)
app.include_router(team.router)


@app.get("/health")
def health():
    return {"status": "ok"}
