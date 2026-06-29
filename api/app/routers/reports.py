"""Os 5 endpoints do ciclo de vida do laudo.

Cada um exige autenticação via Depends e recebe `user.db` (cliente escopado)
para falar com o banco respeitando o RLS.
"""
from fastapi import APIRouter, Depends, HTTPException

from ..auth import CurrentUser, get_current_user
from ..schemas import CreateRevisionIn, PatchReportIn
from ..services import billing
from ..services.ai import draft_parecer
from ..services.dossier import build_dossier, get_report_or_404
from ..services.pdf import render_laudo

PDF_BUCKET = "laudos"
SIGNED_URL_TTL = 3600  # 1h

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
    report = get_report_or_404(user.db, report_id)
    dossier = build_dossier(user.db, report)
    texto = draft_parecer(dossier)

    updates = {"ai_generated_text": texto}
    # semeia o final_text com o rascunho, se ainda vazio (ponto de partida da edição)
    if not report.get("final_text"):
        updates["final_text"] = texto

    updated = user.db.table("reports").update(updates).eq("id", report_id).execute().data
    final_text = updated[0].get("final_text") if updated else texto
    return {"id": report_id, "ai_generated_text": texto, "final_text": final_text}


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
    """Renderiza o laudo, sobe no Storage (bucket `laudos`) e grava `pdf_path`.

    Devolve uma URL assinada (temporária) para download — o binário não trafega
    pela API. O caminho codifica a conta na 1ª pasta, e o RLS do Storage garante
    que só o dono acessa.
    """
    report = get_report_or_404(user.db, report_id)
    if not (report.get("final_text") or report.get("ai_generated_text")):
        raise HTTPException(status_code=400, detail="Gere o rascunho do parecer antes de emitir o PDF")

    # gate de billing: sem assinatura ativa nem pagamento avulso -> 402
    if not billing.is_entitled(user.db, report_id):
        raise HTTPException(
            status_code=402,
            detail="Laudo bloqueado. Assine ou pague o avulso (POST /reports/{id}/checkout).",
        )

    dossier = build_dossier(user.db, report)
    pdf_bytes = render_laudo(report, dossier)

    # {account_id}/{report_id}/v{version}.pdf — a 1ª pasta é conferida pelo RLS
    path = f"{report['account_id']}/{report_id}/v{report['version']}.pdf"
    storage = user.db.storage.from_(PDF_BUCKET)
    storage.upload(
        path,
        pdf_bytes,
        {"content-type": "application/pdf", "upsert": "true"},
    )

    user.db.table("reports").update({"pdf_path": path}).eq("id", report_id).execute()

    signed = storage.create_signed_url(path, SIGNED_URL_TTL)
    url = signed.get("signedURL") or signed.get("signedUrl")
    return {"pdf_path": path, "signed_url": url, "expires_in": SIGNED_URL_TTL}


@router.post("/reports/{report_id}/checkout")
def checkout_report(
    report_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Pagamento avulso (por máquina) para liberar o PDF deste laudo.

    Cria um report_payment pendente e devolve a URL do Stripe Checkout. O webhook
    marca como pago; aí o /pdf passa a liberar.
    """
    report = get_report_or_404(user.db, report_id)
    if billing.is_entitled(user.db, report_id):
        return {"already_entitled": True, "message": "Laudo já liberado (assinatura ou pagamento)."}

    plan = billing.get_plan(user.db, "por_maquina")
    dossier = build_dossier(user.db, report)
    machine_count = len(dossier.get("anexo1_machines") or []) or 1
    total = machine_count * plan["amount_cents"]

    pay = user.db.table("report_payments").insert({
        "report_id": report_id,
        "machine_count": machine_count,
        "unit_amount_cents": plan["amount_cents"],
        "total_amount_cents": total,
        "currency": plan["currency"],
    }).execute().data[0]

    session_id, url = billing.create_report_checkout(
        plan, pay["id"], report_id, machine_count, report["account_id"]
    )
    user.db.table("report_payments").update(
        {"stripe_checkout_session_id": session_id}
    ).eq("id", pay["id"]).execute()

    return {
        "checkout_url": url,
        "machine_count": machine_count,
        "unit_amount_cents": plan["amount_cents"],
        "total_amount_cents": total,
        "currency": plan["currency"],
    }
