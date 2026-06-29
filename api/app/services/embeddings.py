"""Serviço de embeddings — transforma texto em vetor (Voyage AI).

O vetor é o ÍNDICE de busca da camada de conhecimento; o texto é guardado junto
(o embedding é mão-única: dele NÃO se recupera o texto).

voyage-3 -> 1024 dimensões (bate com o vector(1024) da migration 0006).

input_type melhora a qualidade da recuperação ao distinguir os dois lados:
  - "document": ao GUARDAR (backfill) — o que vai ser encontrado
  - "query":    ao BUSCAR — a pergunta que procura
"""
from functools import lru_cache

import voyageai

from ..config import settings

MODEL = "voyage-3"
DIMS = 1024


@lru_cache(maxsize=1)
def _client() -> voyageai.Client:
    if not settings.voyage_api_key:
        raise RuntimeError("VOYAGE_API_KEY ausente no .env — camada de conhecimento indisponível")
    return voyageai.Client(api_key=settings.voyage_api_key)


def embed_documents(texts: list[str]) -> list[list[float]]:
    """Vetores de textos que vão ser GUARDADOS (backfill)."""
    if not texts:
        return []
    res = _client().embed(texts, model=MODEL, input_type="document")
    return res.embeddings


def embed_query(text: str) -> list[float]:
    """Vetor de uma PERGUNTA (busca semântica)."""
    res = _client().embed([text], model=MODEL, input_type="query")
    return res.embeddings[0]
