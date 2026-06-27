"""Os 5 endpoints do ciclo de vida do laudo.

Por enquanto são STUBS — a estrutura está aqui (rota, método, auth), mas a
lógica vamos preencher um a um. Cada um já exige autenticação via Depends e
recebe `user.db` (cliente escopado) para falar com o banco respeitando o RLS.
"""
from fastapi import APIRouter, Depends, HTTPException

from ..auth import CurrentUser, get_current_user
from ..schemas import CreateRevisionIn, PatchReportIn
from ..services.dossier import build_dossier, get_report_or_404

router = APIRouter(tags=["reports"])

# transições de status permitidas (draft -> in_review -> final, com volta p/ editar)
ALLOWED_TRANSITIONS = {
    "draft": {"draft", "in_review"},
    "in_review": {"in_review", "final", "draft"},
    "final": {"final", "in_review"},
}


@router.post("/inspections/{inspection_id}/reports", status_code=201)
def create_report_revision(
    inspection_id: str,
    body: CreateRevisionIn,
    user: CurrentUser = Depends(get_current_user),
):
    """Abre uma nova revisão do laudo da inspeção."""
    # a inspeção precisa ser do usuário (o RLS esconde as de outras contas)
    insp = user.db.table("inspections").select("id").eq("id", inspection_id).execute().data
    if not insp:
        raise HTTPException(status_code=404, detail="Inspeção não encontrada")

    # próxima versão; o número do laudo é herdado das revisões anteriores
    prev = (
        user.db.table("reports")
        .select("version,report_number")
        .eq("inspection_id", inspection_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
        .data
    )
    next_version = prev[0]["version"] + 1 if prev else 1
    report_number = prev[0]["report_number"] if prev else None

    # account_id é preenchido pelo DEFAULT current_account_id() (cliente carrega o JWT)
    created = (
        user.db.table("reports")
        .insert({
            "inspection_id": inspection_id,
            "version": next_version,
            "status": "draft",
            "revision_reason": body.revision_reason,
            "report_number": report_number,
        })
        .execute()
        .data
    )
    return created[0]


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
    body: PatchReportIn,
    user: CurrentUser = Depends(get_current_user),
):
    """Edita final_text e/ou move o status (draft -> in_review -> final)."""
    report = get_report_or_404(user.db, report_id)

    updates: dict = {}
    if body.final_text is not None:
        updates["final_text"] = body.final_text
    if body.revision_reason is not None:
        updates["revision_reason"] = body.revision_reason

    if body.status is not None:
        atual = report["status"]
        if body.status not in ALLOWED_TRANSITIONS.get(atual, set()):
            raise HTTPException(
                status_code=400, detail=f"Transição inválida: {atual} -> {body.status}"
            )
        # finalizar exige texto final (do body ou já gravado)
        if body.status == "final":
            texto = body.final_text if body.final_text is not None else report.get("final_text")
            if not texto:
                raise HTTPException(status_code=400, detail="Não dá para finalizar sem final_text")
        updates["status"] = body.status

    if not updates:
        return report

    updated = user.db.table("reports").update(updates).eq("id", report_id).execute().data
    return updated[0] if updated else report


@router.post("/reports/{report_id}/pdf")
def render_pdf(
    report_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Renderiza o PDF, sobe no Storage e grava pdf_path."""
    raise HTTPException(status_code=501, detail="Não implementado")
