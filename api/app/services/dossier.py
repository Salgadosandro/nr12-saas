"""Montagem do dossiê do laudo — os dados que viram corpo + 4 anexos.

A lógica de assemblagem fica aqui, separada do router (que só cuida do HTTP).
Todas as queries usam o cliente já escopado ao usuário, então o RLS se aplica:
se um dado é de outra conta, ele simplesmente não volta.
"""
from fastapi import HTTPException
from supabase import Client


def _one(db: Client, table: str, row_id: str | None) -> dict | None:
    """Busca uma linha por id (ou None se não existir / o RLS esconder)."""
    if not row_id:
        return None
    res = db.table(table).select("*").eq("id", row_id).execute()
    return res.data[0] if res.data else None


def get_report_or_404(db: Client, report_id: str) -> dict:
    report = _one(db, "reports", report_id)
    if report is None:
        # Não existe OU é de outra conta (o RLS esconde) — 404 nos dois casos.
        # Não revelar "existe, mas não é seu" é mais seguro.
        raise HTTPException(status_code=404, detail="Laudo não encontrado")
    return report


def build_dossier(db: Client, report: dict) -> dict:
    """Monta o dossiê a partir do laudo. Corpo pronto; anexos virão a seguir."""
    inspection = _one(db, "inspections", report["inspection_id"])
    company = engineer = art = None
    if inspection:
        company = _one(db, "clients", inspection["client_id"])
        engineer = _one(db, "professionals", inspection.get("responsible_professional_id"))
        art = _one(db, "arts", inspection.get("art_id"))

    return {
        "company": company,            # dados da empresa (corpo)
        "engineer": engineer,          # dados do engenheiro (corpo)
        "anexo1_machines": [],         # TODO: lista de máquinas da inspeção
        "anexo2_dashboard": {},        # TODO: conformes / NCs / não-se-aplica
        "anexo3_nonconformities": [],  # TODO: NCs + risco + plano + fotos
        "anexo4_art": art,             # ART
    }
