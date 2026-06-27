"""Ponto de entrada da API de laudos NR-12."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import reports

app = FastAPI(title="NR-12 Laudos API", version="0.1.0")

# CORS liberado para dev (o frontend vai chamar daqui). Restringir em produção.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports.router)


@app.get("/health")
def health():
    return {"status": "ok"}
