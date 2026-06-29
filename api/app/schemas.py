"""Modelos Pydantic (request/response).

Vazio por enquanto — vamos preencher conforme implementamos cada endpoint
(ex: o corpo do POST de revisão, a forma do "dossiê" do GET).
"""
from pydantic import BaseModel


class CreateRevisionIn(BaseModel):
    revision_reason: str | None = None


class PatchReportIn(BaseModel):
    final_text: str | None = None
    status: str | None = None            # draft | in_review | final
    revision_reason: str | None = None


class KnowledgeSearchIn(BaseModel):
    text: str                            # a NC nova (problema) que se procura
    standard_item_number: str | None = None   # filtrar por item da norma (ex.: "12.4.3")
    limit: int = 5


class RatingSuggestionIn(BaseModel):
    standard_item_number: str            # item da norma (ex.: "12.4.3")
    machine_type_id: str | None = None   # refina por tipo de máquina (opcional)


class SuggestPlanIn(BaseModel):
    text: str                            # a NC nova (problema) a resolver
    standard_item_number: str | None = None   # filtra os casos parecidos por item
    limit: int = 3                       # quantos casos alimentam a IA
