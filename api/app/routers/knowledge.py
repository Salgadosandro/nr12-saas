"""Camada de conhecimento — busca semântica de não-conformidades e planos de ação.

Serviço próprio, separado da API do laudo. Fluxo da busca:
  1. recebe o texto de uma NC nova (o "problema");
  2. gera o vetor da pergunta (Voyage, input_type=query);
  3. pede ao pgvector as linhas MAIS PRÓXIMAS (RPC match_knowledge, sob RLS);
  4. devolve o texto guardado (problema + solução) + similaridade.

O embedding só ACHA; o texto guardado é o que se mostra e preenche.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..auth import CurrentUser, get_current_user
from ..schemas import ItemQueryIn, KnowledgeSearchIn, RatingSuggestionIn, SuggestPlanIn
from ..services.ai import suggest_action_plan
from ..services.embeddings import embed_query

router = APIRouter(prefix="/knowledge", tags=["knowledge"])
limiter = Limiter(key_func=get_remote_address)

# abaixo disso, a distribuição não é estatisticamente honesta -> não sugerir
MIN_SAMPLE = 5


def _resolve_item_id(db, number: str) -> str:
    item = (
        db.table("standard_items").select("id").eq("number", number).limit(1).execute().data
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item da norma não encontrado")
    return item[0]["id"]


@router.post("/search")
@limiter.limit("30/minute")
def search_knowledge(
    request: Request,
    body: KnowledgeSearchIn,
    user: CurrentUser = Depends(get_current_user),
):
    """Busca casos parecidos: NC nova -> problemas/soluções semelhantes do tenant."""
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Texto da busca vazio")

    # filtro opcional por item da norma: número (ex.: "12.4.3") -> id
    filter_item_id = None
    if body.standard_item_number:
        filter_item_id = _resolve_item_id(user.db, body.standard_item_number)

    query_vec = embed_query(body.text)

    matches = user.db.rpc(
        "match_knowledge",
        {
            "query_embedding": query_vec,
            "match_count": body.limit,
            "filter_standard_item_id": filter_item_id,
        },
    ).execute().data

    return {"query": body.text, "matches": matches}


@router.post("/suggest")
@limiter.limit("20/minute")
def suggest_plan(
    request: Request,
    body: SuggestPlanIn,
    user: CurrentUser = Depends(get_current_user),
):
    """RAG: acha casos parecidos e a IA escreve um plano de ação adaptado.

    O embedding ACHA os casos; o texto deles alimenta a IA, que ESCREVE o plano
    (a IA não decodifica o vetor — trabalha sobre o texto recuperado). Devolve o
    plano sugerido + as fontes, para transparência.
    """
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Texto da NC vazio")

    filter_item_id = None
    if body.standard_item_number:
        filter_item_id = _resolve_item_id(user.db, body.standard_item_number)

    query_vec = embed_query(body.text)
    matches = user.db.rpc(
        "match_knowledge",
        {
            "query_embedding": query_vec,
            "match_count": body.limit,
            "filter_standard_item_id": filter_item_id,
        },
    ).execute().data

    if not matches:
        return {
            "problem": body.text,
            "suggested_plan": None,
            "sources": [],
            "message": "Nenhum caso parecido na base para fundamentar uma sugestão.",
        }

    plan = suggest_action_plan(body.text, matches)
    return {"problem": body.text, "suggested_plan": plan, "sources": matches}


@router.post("/foguinho")
def item_foguinho(
    body: ItemQueryIn,
    user: CurrentUser = Depends(get_current_user),
):
    """Risco do item em foguinhos (1–5), pelo limite inferior de Wilson.

    Mostrado quando o engenheiro abre o item: quão problemático ele costuma ser,
    com a honestidade da amostra embutida (pouca evidência → poucos foguinhos).
    """
    item_id = _resolve_item_id(user.db, body.standard_item_number)
    rows = user.db.rpc(
        "nc_item_foguinho",
        {"p_standard_item_id": item_id, "p_machine_type_id": body.machine_type_id},
    ).execute().data
    r = rows[0] if rows else {"n": 0, "k": 0, "rate": 0, "wilson_lb": 0, "flames": 0}
    return {"standard_item_number": body.standard_item_number, **r}


@router.post("/common-problems")
def common_problems(
    body: ItemQueryIn,
    user: CurrentUser = Depends(get_current_user),
):
    """Problemas típicos já encontrados no item — o que verificar/marcar."""
    item_id = _resolve_item_id(user.db, body.standard_item_number)
    rows = user.db.rpc(
        "nc_common_problems",
        {
            "p_standard_item_id": item_id,
            "p_machine_type_id": body.machine_type_id,
            "p_limit": body.limit,
        },
    ).execute().data
    return {"standard_item_number": body.standard_item_number, "problems": rows}


@router.post("/common-plans")
def common_plans(
    body: ItemQueryIn,
    user: CurrentUser = Depends(get_current_user),
):
    """Planos de ação típicos para um item da norma — chips de preenchimento rápido.

    Agrega suggested_plan de knowledge_entries por frequência. Sem função SQL dedicada:
    o volume por item é pequeno e a agregação em Python é suficiente.
    """
    item_id = _resolve_item_id(user.db, body.standard_item_number)

    q = (
        user.db.table("knowledge_entries")
        .select("solution_text")
        .eq("standard_item_id", item_id)
    )
    if body.machine_type_id:
        q = q.eq("machine_type_id", body.machine_type_id)

    rows = q.execute().data

    from collections import Counter
    counts = Counter(r["solution_text"] for r in rows if r.get("solution_text", "").strip())
    plans = [
        {"plan_text": text, "vezes": n}
        for text, n in counts.most_common(body.limit or 5)
    ]

    return {"standard_item_number": body.standard_item_number, "plans": plans}


@router.post("/rating-suggestion")
def rating_suggestion(
    body: RatingSuggestionIn,
    user: CurrentUser = Depends(get_current_user),
):
    """Referência histórica das notas (frequência/gravidade) para um item da norma.

    Decision support: mostra como casos passados foram avaliados. O engenheiro
    continua decidendo. Se a amostra for pequena (< MIN_SAMPLE), não sugere —
    avisa que não há base suficiente, em vez de enganar com percentual frágil.
    """
    item_id = _resolve_item_id(user.db, body.standard_item_number)

    rows = user.db.rpc(
        "nc_rating_suggestion",
        {"p_standard_item_id": item_id, "p_machine_type_id": body.machine_type_id},
    ).execute().data

    # separa as duas distribuições e mede o tamanho da amostra
    distrib: dict[str, list] = {"probability": [], "severity": []}
    for r in rows:
        distrib.setdefault(r["dimension"], []).append(
            {"value": r["value"], "n": r["n"], "pct": float(r["pct"])}
        )
    sample = sum(d["n"] for d in distrib["severity"])  # nº de NCs avaliadas no item

    if sample < MIN_SAMPLE:
        return {
            "standard_item_number": body.standard_item_number,
            "sample_size": sample,
            "sufficient": False,
            "message": f"Amostra insuficiente ({sample}); são necessários ≥ {MIN_SAMPLE} casos.",
        }

    return {
        "standard_item_number": body.standard_item_number,
        "sample_size": sample,
        "sufficient": True,
        "frequencia": distrib["probability"],
        "gravidade": distrib["severity"],
    }
