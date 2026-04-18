"""
User account, profile, and the anonymous → authenticated migration flow.
"""

import json
from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel
from sqlalchemy import select, update
from svix.webhooks import Webhook, WebhookVerificationError

from api.deps import DB
from core.auth import CurrentUser, CurrentUserOptional
from core.config import settings
from models.user import User, Subscription
from models.alert import Alert
from models.favorite import Favorite

router = APIRouter(prefix="/accounts", tags=["accounts"])


class MeOut(BaseModel):
    id: int
    email: str | None
    is_founder: bool
    tier: str           # free | pro
    status: str         # active | trialing | inactive | canceled | past_due
    billing_interval: str | None
    is_founder_pricing: bool
    current_period_end: str | None
    cancel_at_period_end: bool


@router.get("/me", response_model=MeOut)
async def me(user: CurrentUser, db: DB):
    sub_rows = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    sub = sub_rows.scalar_one_or_none()
    return MeOut(
        id=user.id,
        email=user.email,
        is_founder=user.is_founder,
        tier=sub.tier if sub else "free",
        status=sub.status if sub else "inactive",
        billing_interval=sub.billing_interval if sub else None,
        is_founder_pricing=sub.is_founder_pricing if sub else False,
        current_period_end=sub.current_period_end.isoformat() if sub and sub.current_period_end else None,
        cancel_at_period_end=sub.cancel_at_period_end if sub else False,
    )


class MigrateDeviceRequest(BaseModel):
    device_id: str


@router.post("/migrate-device")
async def migrate_anonymous_device(body: MigrateDeviceRequest, user: CurrentUser, db: DB):
    """
    Move all favorites + alerts created under an anonymous device_id into
    the authenticated user's account. Idempotent — re-runs are safe.
    Called once on first sign-in from the frontend.
    """
    # Reassign favorites
    fav_result = await db.execute(
        update(Favorite)
        .where(Favorite.device_id == body.device_id, Favorite.user_id.is_(None))
        .values(user_id=user.id)
    )
    # Reassign alerts
    alert_result = await db.execute(
        update(Alert)
        .where(Alert.device_id == body.device_id, Alert.user_id.is_(None))
        .values(user_id=user.id)
    )

    # Track which devices have been merged into this account
    merged = list(user.merged_device_ids or [])
    if body.device_id not in merged:
        merged.append(body.device_id)
        user.merged_device_ids = merged

    await db.commit()
    return {
        "favorites_migrated": fav_result.rowcount,
        "alerts_migrated": alert_result.rowcount,
    }


@router.post("/clerk-webhook")
async def clerk_webhook(request: Request, db: DB):
    """
    Handles Clerk events — primarily user.deleted to wipe our local row.
    user.created is handled lazily on first auth-required call instead.
    """
    payload = await request.body()
    headers = {k: v for k, v in request.headers.items()}

    try:
        wh = Webhook(settings.CLERK_WEBHOOK_SECRET)
        evt = wh.verify(payload, headers)
    except WebhookVerificationError:
        raise HTTPException(400, "Invalid signature")

    if evt["type"] == "user.deleted":
        clerk_id = evt["data"]["id"]
        rows = await db.execute(select(User).where(User.clerk_user_id == clerk_id))
        user = rows.scalar_one_or_none()
        if user:
            await db.delete(user)
            await db.commit()

    elif evt["type"] in ("user.created", "user.updated"):
        clerk_id = evt["data"]["id"]
        emails = evt["data"].get("email_addresses", [])
        primary_email = next((e["email_address"] for e in emails if e.get("id") == evt["data"].get("primary_email_address_id")), None)

        rows = await db.execute(select(User).where(User.clerk_user_id == clerk_id))
        user = rows.scalar_one_or_none()
        if user and primary_email and user.email != primary_email:
            user.email = primary_email
            await db.commit()

    return {"received": True}
