"""Modelos Pydantic (request/response).

Vazio por enquanto — vamos preencher conforme implementamos cada endpoint
(ex: o corpo do POST de revisão, a forma do "dossiê" do GET).
"""
from pydantic import BaseModel


class CreateRevisionIn(BaseModel):
    revision_reason: str | None = None
