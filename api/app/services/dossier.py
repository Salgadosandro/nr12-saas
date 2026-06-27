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
    """Monta o dossiê a partir do laudo."""
    inspection = _one(db, "inspections", report["inspection_id"])
    company = engineer = art = None
    machines: list[dict] = []
    dashboard: dict = {}
    if inspection:
        company = _one(db, "clients", inspection["client_id"])
        engineer = _one(db, "professionals", inspection.get("responsible_professional_id"))
        art = _one(db, "arts", inspection.get("art_id"))
        # cada checklist = uma máquina analisada nesta inspeção
        checklists = (
            db.table("checklists").select("*").eq("inspection_id", inspection["id"]).execute().data
        )
        machines = _anexo1_machines(db, checklists)
        dashboard = _anexo2_dashboard(db, checklists)

    return {
        "company": company,                  # dados da empresa (corpo)
        "engineer": engineer,                # dados do engenheiro (corpo)
        "anexo1_machines": machines,         # Anexo 1 — lista de máquinas
        "anexo2_dashboard": dashboard,       # Anexo 2 — consolidado
        "anexo3_nonconformities": [],        # TODO (próximo passo)
        "anexo4_art": art,                   # Anexo 4 — ART
    }


def _anexo1_machines(db: Client, checklists: list[dict]) -> list[dict]:
    """Anexo 1 — máquinas analisadas (uma linha por checklist da inspeção)."""
    rows = []
    for ck in checklists:
        machine = _one(db, "machines", ck["machine_id"])
        model = _one(db, "machine_models", machine["machine_model_id"]) if machine else None
        mtype = _one(db, "machine_types", model["machine_type_id"]) if model else None
        location = _one(db, "locations", machine["location_id"]) if machine else None
        rows.append({
            "tag": machine and machine.get("tag"),
            "code": machine and machine.get("code"),
            "type": mtype and mtype.get("name"),
            "manufacturer": model and model.get("manufacturer"),
            "model": model and model.get("model_code"),
            "serial_number": machine and machine.get("serial_number"),
            "year": machine and machine.get("manufacture_year"),
            "location": location and location.get("name"),
            "nr_applies": ck.get("nr_applies"),
            "exclusion_code": ck.get("exclusion_code"),
        })
    return rows


def _anexo2_dashboard(db: Client, checklists: list[dict]) -> dict:
    """Anexo 2 — consolidado: conformes / não-conformidades / NR não se aplica."""
    checklist_ids = [c["id"] for c in checklists]
    answers = []
    if checklist_ids:
        answers = (
            db.table("answers")
            .select("checklist_id,status")
            .in_("checklist_id", checklist_ids)
            .execute()
            .data
        )

    nc_por_checklist: dict[str, int] = {}
    for a in answers:
        if a["status"] == "non_compliant":
            nc_por_checklist[a["checklist_id"]] = nc_por_checklist.get(a["checklist_id"], 0) + 1

    nao_se_aplica = sum(1 for c in checklists if not c.get("nr_applies"))
    aplicaveis = [c for c in checklists if c.get("nr_applies")]
    conformes = sum(1 for c in aplicaveis if nc_por_checklist.get(c["id"], 0) == 0)

    return {
        "machines_total": len(checklists),
        "machines_compliant": conformes,
        "machines_not_applicable": nao_se_aplica,
        "nonconformities": sum(nc_por_checklist.values()),
    }
