"""E2E da máquina de estados do laudo (sem IA/HTTP).

Chama os handlers dos endpoints direto, com um CurrentUser escopado, exercitando
ALLOWED_TRANSITIONS e as validações (finalizar exige texto).
"""
import pytest
from fastapi import HTTPException

from app.auth import CurrentUser
from app.routers.reports import create_report_revision, update_report
from app.schemas import CreateRevisionIn, PatchReportIn


def _user(db):
    return CurrentUser(id="test", token="test", db=db)


def test_ciclo_e_transicoes_de_status(client_a):
    user = _user(client_a)
    insp = client_a.table("inspections").select("id").limit(1).execute().data
    assert insp, "conta A precisa de uma inspeção (seed da demo)"

    rep = create_report_revision(insp[0]["id"], CreateRevisionIn(revision_reason="teste e2e"), user)
    rid = rep["id"]
    assert rep["status"] == "draft"

    # draft -> final direto é inválido (pula in_review)
    with pytest.raises(HTTPException) as e:
        update_report(rid, PatchReportIn(status="final"), user)
    assert e.value.status_code == 400

    # draft -> in_review ok
    assert update_report(rid, PatchReportIn(status="in_review"), user)["status"] == "in_review"

    # finalizar sem final_text -> 400
    with pytest.raises(HTTPException) as e2:
        update_report(rid, PatchReportIn(status="final"), user)
    assert e2.value.status_code == 400

    # finalizar com final_text -> ok
    final = update_report(rid, PatchReportIn(status="final", final_text="Parecer final."), user)
    assert final["status"] == "final"
    assert final["final_text"] == "Parecer final."


def test_revisao_incrementa_versao(client_a):
    user = _user(client_a)
    insp = client_a.table("inspections").select("id").limit(1).execute().data[0]["id"]
    r1 = create_report_revision(insp, CreateRevisionIn(), user)
    r2 = create_report_revision(insp, CreateRevisionIn(), user)
    assert r2["version"] == r1["version"] + 1
    # número do laudo é herdado entre revisões
    assert r2["report_number"] == r1["report_number"]
