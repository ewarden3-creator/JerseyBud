"""
Stripe Checkout + webhook integration. Founder-pricing-aware.
"""

import stripe
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel
from sqlalchemy import select

from api.deps import DB
from core.auth import CurrentUser
from core.config import settings
from models.user import User, Subscription

stripe.api_key = settings.STRIPE_SECRET_KEY
router = APIRouter(prefix="/billing", tags=["billing"])


def _price_id_for(user: User, interval: str) -> str:
    """Pick the Stripe Price ID matching this user's founder status."""
    if user.is_founder:
        return settings.STRIPE_PRICE_MONTHLY_FOUNDER if interval == "monthly" else settings.STRIPE_PRICE_ANNUAL_FOUNDER
    return settings.STRIPE_PRICE_MONTHLY if interval == "monthly" else settings.STRIPE_PRICE_ANNUAL


class CheckoutRequest(BaseModel):
    interval: str             # "monthly" | "annual"
    success_url: str
    cancel_url: str


@router.post("/checkout")
async def create_checkout_session(body: CheckoutRequest, user: CurrentUser, db: DB):
    if body.interval not in ("monthly", "annual"):
        raise HTTPException(400, "interval must be 'monthly' or 'annual'")

    sub_rows = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    sub = sub_rows.scalar_one_or_none()
    if sub and sub.tier == "pro" and sub.status in ("active", "trialing"):
        raise HTTPException(400, "Already subscribed")

    # Reuse existing Stripe customer or create one
    customer_id = sub.stripe_customer_id if sub else None
    if not customer_id:
        customer = stripe.Customer.create(
            email=user.email,
            metadata={"user_id": str(user.id), "is_founder": str(user.is_founder)},
        )
        customer_id = customer.id
        if sub:
            sub.stripe_customer_id = customer_id
            await db.commit()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        mode="subscription",
        line_items=[{"price": _price_id_for(user, body.interval), "quantity": 1}],
        subscription_data={
            "trial_period_days": 7,
            "metadata": {"user_id": str(user.id), "is_founder_pricing": str(user.is_founder)},
        },
        success_url=body.success_url,
        cancel_url=body.cancel_url,
    )
    return {"url": session.url}


@router.post("/portal")
async def create_billing_portal(user: CurrentUser, db: DB):
    """Self-service portal for subscription management (cancel, swap card, etc)."""
    sub_rows = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    sub = sub_rows.scalar_one_or_none()
    if not sub or not sub.stripe_customer_id:
        raise HTTPException(400, "No customer record")

    portal = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url="https://njcanna.app/account",
    )
    return {"url": portal.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: DB, stripe_signature: str = Header(None)):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(400, "Invalid signature")

    obj = event["data"]["object"]
    et = event["type"]

    if et in ("customer.subscription.created", "customer.subscription.updated"):
        await _sync_subscription(obj, db)
    elif et == "customer.subscription.deleted":
        await _mark_subscription_canceled(obj, db)

    return {"received": True}


async def _sync_subscription(stripe_sub: dict, db):
    customer_id = stripe_sub["customer"]
    rows = await db.execute(select(Subscription).where(Subscription.stripe_customer_id == customer_id))
    sub = rows.scalar_one_or_none()
    if not sub:
        return  # Unknown customer — possibly a stale event

    # Pull interval from price metadata
    item = stripe_sub["items"]["data"][0]
    price_id = item["price"]["id"]
    is_founder_price = price_id in (settings.STRIPE_PRICE_MONTHLY_FOUNDER, settings.STRIPE_PRICE_ANNUAL_FOUNDER)
    is_annual = price_id in (settings.STRIPE_PRICE_ANNUAL, settings.STRIPE_PRICE_ANNUAL_FOUNDER)

    sub.tier = "pro"
    sub.billing_interval = "annual" if is_annual else "monthly"
    sub.is_founder_pricing = is_founder_price
    sub.stripe_subscription_id = stripe_sub["id"]
    sub.status = stripe_sub["status"]
    sub.current_period_end = datetime.fromtimestamp(stripe_sub["current_period_end"], tz=timezone.utc)
    sub.cancel_at_period_end = stripe_sub.get("cancel_at_period_end", False)
    if stripe_sub.get("trial_end"):
        sub.trial_end = datetime.fromtimestamp(stripe_sub["trial_end"], tz=timezone.utc)
    await db.commit()


async def _mark_subscription_canceled(stripe_sub: dict, db):
    rows = await db.execute(select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub["id"]))
    sub = rows.scalar_one_or_none()
    if sub:
        sub.tier = "free"
        sub.status = "canceled"
        await db.commit()
