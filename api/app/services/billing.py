"""Billing (Stripe): planos, checkout e a regra de entitlement.

Entitlement = direito a emitir o PDF final. Verdadeiro se a conta tem assinatura
ativa OU pagamento avulso pago para aquele laudo (ADR 0008). O Checkout monta o
preço inline (price_data), então não dependemos de Prices pré-criados no Stripe.
"""
import stripe
from fastapi import HTTPException

from ..config import settings

if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key


def _require_stripe():
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY não configurada no .env")


def get_plan(db, code: str) -> dict:
    rows = db.table("plans").select("*").eq("code", code).eq("active", True).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail=f"Plano '{code}' não encontrado")
    return rows[0]


def get_account_id(db) -> str:
    """account_id do usuário logado (via helper SQL current_account_id())."""
    return db.rpc("current_account_id", {}).execute().data


def is_entitled(db, report_id: str) -> bool:
    """Tem direito ao PDF: assinatura ativa OU pagamento avulso pago do laudo."""
    subs = db.table("subscriptions").select("id").eq("status", "active").limit(1).execute().data
    if subs:
        return True
    pays = (
        db.table("report_payments").select("id")
        .eq("report_id", report_id).eq("status", "paid").limit(1).execute().data
    )
    return bool(pays)


def create_subscription_checkout(plan: dict, account_id: str) -> str:
    """Checkout de assinatura (recorrente). Devolve a URL do Stripe."""
    _require_stripe()
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{
            "quantity": 1,
            "price_data": {
                "currency": plan["currency"],
                "product_data": {"name": plan["name"]},
                "unit_amount": plan["amount_cents"],
                "recurring": {"interval": plan["interval"]},
            },
        }],
        success_url=settings.billing_success_url,
        cancel_url=settings.billing_cancel_url,
        metadata={"kind": "subscription", "account_id": account_id, "plan_id": plan["id"]},
        subscription_data={"metadata": {"account_id": account_id, "plan_id": plan["id"]}},
    )
    return session.url


def create_report_checkout(
    plan: dict, report_payment_id: str, report_id: str, machine_count: int, account_id: str
) -> tuple[str, str]:
    """Checkout avulso (N máquinas × preço). Devolve (session_id, url)."""
    _require_stripe()
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{
            "quantity": machine_count,
            "price_data": {
                "currency": plan["currency"],
                "product_data": {"name": f"Laudo NR-12 — {machine_count} máquina(s)"},
                "unit_amount": plan["amount_cents"],
            },
        }],
        success_url=settings.billing_success_url,
        cancel_url=settings.billing_cancel_url,
        metadata={
            "kind": "report_payment",
            "report_payment_id": report_payment_id,
            "account_id": account_id,
        },
    )
    return session.id, session.url
