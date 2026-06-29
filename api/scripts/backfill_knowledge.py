"""Backfill da base de conhecimento.

Varre as não-conformidades (answers.status = 'non_compliant') que TÊM plano de
ação, gera o embedding do problema (Voyage) e faz upsert em knowledge_entries.

Idempotente: a constraint unique(source_answer_id) + upsert deixam rodar várias
vezes sem duplicar. account_id é preenchido pelo DEFAULT current_account_id()
(rodamos logado, como a API).

Uso (de api/, com .venv ativado):
    python scripts/backfill_knowledge.py
"""
import getpass
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from app.services.embeddings import MODEL, embed_documents  # noqa: E402
from supabase import create_client  # noqa: E402


def _scoped_client():
    # aceita credenciais por env (automação) ou pergunta (uso manual)
    email = os.environ.get("BACKFILL_EMAIL") or input("email do usuário: ").strip()
    password = os.environ.get("BACKFILL_PASSWORD") or getpass.getpass("senha: ")
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    res = client.auth.sign_in_with_password({"email": email, "password": password})
    client.postgrest.auth(res.session.access_token)   # RLS aplica como esse usuário
    return client


def _one(db, table, row_id):
    if not row_id:
        return None
    r = db.table(table).select("*").eq("id", row_id).execute().data
    return r[0] if r else None


def main():
    db = _scoped_client()

    # NCs do tenant (RLS já filtra para a conta do usuário logado)
    ncs = (
        db.table("answers").select("*").eq("status", "non_compliant").execute().data
    )
    print(f"{len(ncs)} não-conformidades encontradas.")

    rows, problems = [], []
    for a in ncs:
        plans = db.table("action_plans").select("*").eq("answer_id", a["id"]).execute().data
        if not plans:
            continue  # sem solução registrada ainda -> nada a aprender
        plan = plans[0]

        # item da norma
        cti = _one(db, "checklist_template_items", a["checklist_template_item_id"])
        standard_item_id = cti and cti.get("standard_item_id")
        if not standard_item_id:
            continue

        # contexto da máquina (tipo + modelo) via checklist -> machine -> model -> type
        ck = _one(db, "checklists", a["checklist_id"])
        machine = _one(db, "machines", ck["machine_id"]) if ck else None
        model = _one(db, "machine_models", machine["machine_model_id"]) if machine else None
        machine_type_id = model and model.get("machine_type_id")
        machine_model_id = model and model.get("id")

        problem_text = (a.get("justification") or "").strip()
        if not problem_text:
            continue

        problems.append(problem_text)
        rows.append({
            "machine_type_id": machine_type_id,
            "machine_model_id": machine_model_id,
            "standard_item_id": standard_item_id,
            "source_answer_id": a["id"],
            "problem_text": problem_text,
            "solution_text": (plan.get("description") or "").strip() or None,
            "risk_level": a.get("risk_level"),
            "model": MODEL,
        })

    if not rows:
        print("Nada para indexar (NCs sem plano de ação ou sem justificativa).")
        return

    print(f"Gerando {len(rows)} embeddings na Voyage ({MODEL})...")
    vectors = embed_documents(problems)
    for row, vec in zip(rows, vectors):
        row["problem_embedding"] = vec

    db.table("knowledge_entries").upsert(rows, on_conflict="source_answer_id").execute()
    print(f"OK — {len(rows)} entradas na base de conhecimento.")


if __name__ == "__main__":
    main()
