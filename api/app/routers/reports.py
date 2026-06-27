"""Os 5 endpoints do ciclo de vida do laudo.

Por enquanto são STUBS — a estrutura está aqui (rota, método, auth), mas a
lógica vamos preencher um a um. Cada um já exige autenticação via Depends e
recebe `user.db` (cliente escopado) para falar com o banco respeitando o RLS.
"""
from fastapi import APIRouter, Depends, HTTPException

from ..auth import CurrentUser, get_current_user
from ..schemas import CreateRevisionIn
from ..services.dossier import build_dossier, get_report_or_404

router = APIRouter(tags=["reports"])


@router.post("/inspections/{inspection_id}/reports", status_code=201)
def create_report_revision(
    inspection_id: str,
    body: CreateRevisionIn,
    user: CurrentUser = Depends(get_current_user),
):
    """Abre uma nova revisão do laudo da inspeção."""
    raise HTTPException(status_code=501, detail="Não implementado")


@router.post("/reports/{report_id}/draft")
def generate_draft(
    report_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Monta o dossiê, chama a IA e grava o rascunho (ai_generated_text)."""
    raise HTTPException(status_code=501, detail="Não implementado")


@router.get("/reports/{report_id}")
def get_report(
    report_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Retorna o laudo + o dossiê estruturado dos anexos."""
    report = get_report_or_404(user.db, report_id)
    dossier = build_dossier(user.db, report)
    return {"report": report, "dossier": dossier}


@router.patch("/reports/{report_id}")
def update_report(
    report_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Edita final_text e/ou move o status (draft -> in_review -> final)."""
    raise HTTPException(status_code=501, detail="Não implementado")


@router.post("/reports/{report_id}/pdf")
def render_pdf(
    report_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Renderiza o PDF, sobe no Storage e grava pdf_path."""
    raise HTTPException(status_code=501, detail="Não implementado")
