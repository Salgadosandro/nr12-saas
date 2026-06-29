"""Billing: assinar, ver status e o webhook do Stripe."""
import json
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request

from ..auth import CurrentUser, get_current_user
from ..config import settings
from ..services import billing
from ..supabase import get_supabase_service

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/me")
def my_billing(user: CurrentUser = Depends(get_current_user)):
    """Estado de billing da conta (assinatura ativa?)."""
    subs = (
        user.db.table("subscriptions").select("status,current_period_end")
        .eq("status", "active").limit(1).execute().data
    )
    return {"has_active_subscription": bool(subs), "subscription": subs[0] if subs else None}


@router.post("/subscribe")
def subscribe(user: CurrentUser = Depends(get_current_user)):
    """Inicia o Checkout de assinatura. Devolve a URL para o cliente pagar."""
    plan = billing.get_plan(user.db, "sub_anual")
    account_id = billing.get_account_id(user.db)
    url = billing.create_subscription_checkout(plan, account_id)
    return {"checkout_url": url}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Fonte da verdade dos pagamentos. O Stripe chama aqui (sem JWT) — por isso
    usamos o cliente de SERVIÇO e atualizamos só por id vindo do metadata."""
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=500, detail="STRIPE_WEBHOOK_SECRET não configurada no .env")

    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    try:
        # verifica a assinatura (segurança); levanta se inválida
        stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Assinatura do webhook inválida")

    # lê como dict puro (o objeto do Stripe não é dict comum)
    event = json.loads(payload)
    db = get_supabase_service()
    etype = event["type"]
    obj = event["data"]["object"]

    if etype == "checkout.session.completed":
        meta = obj.get("metadata") or {}
        kind = meta.get("kind")
        if kind == "report_payment" and meta.get("report_payment_id"):
            db.table("report_payments").update({
                "status": "paid",
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "stripe_payment_intent_id": obj.get("payment_intent"),
            }).eq("id", meta["report_payment_id"]).execute()
        elif kind == "subscription" and meta.get("account_id"):
            db.table("subscriptions").upsert({
                "account_id": meta["account_id"],
                "plan_id": meta.get("plan_id"),
                "stripe_customer_id": obj.get("customer"),
                "stripe_subscription_id": obj.get("subscription"),
                "status": "active",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }, on_conflict="stripe_subscription_id").execute()

    elif etype == "customer.subscription.deleted":
        db.table("subscriptions").update({
            "status": "canceled",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("stripe_subscription_id", obj.get("id")).execute()

    return {"received": True}
