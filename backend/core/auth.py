"""
Clerk JWT auth + tier-gating dependencies for FastAPI routes.

Free routes: no dependency
Optional auth: `current_user_optional` — returns User or None
Required auth: `current_user`
Pro tier required: `current_pro_user` — 402 if not Pro
"""

import httpx
from datetime import datetime, timezone
from functools import lru_cache
from typing import Annotated
from fastapi import Depends, HTTPException, Header, status
from jose import jwt, JWTError
from sqlalchemy import select

from api.deps import DB
from core.config import settings
from models.user import User, Subscription


@lru_cache(maxsize=1)
def _jwks_url() -> str:
    return f"{settings.CLERK_ISSUER}/.well-known/jwks.json"


_jwks_cache: dict | None = None
_jwks_fetched_at: float = 0


async def _get_jwks() -> dict:
    """Cached JWKS fetch — refreshed hourly."""
    global _jwks_cache, _jwks_fetched_at
    now = datetime.now(timezone.utc).timestamp()
    if _jwks_cache and (now - _jwks_fetched_at) < 3600:
        return _jwks_cache
    async with httpx.AsyncClient() as client:
        resp = await client.get(_jwks_url(), timeout=10)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_fetched_at = now
    return _jwks_cache


async def _verify_clerk_jwt(token: str) -> dict:
    """Validate signature against Clerk JWKS, return claims."""
    jwks = await _get_jwks()
    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
        if not key:
            raise HTTPException(401, "Invalid signing key")
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=settings.CLERK_ISSUER,
            options={"verify_aud": False},
        )
        return claims
    except JWTError as e:
        raise HTTPException(401, f"Invalid token: {e}")


async def _resolve_user(claims: dict, db) -> User:
    """Look up our internal User row, creating it on first sight."""
    clerk_id = claims["sub"]
    rows = await db.execute(select(User).where(User.clerk_user_id == clerk_id))
    user = rows.scalar_one_or_none()
    if not user:
        # Race-safe upsert: first-touch creates the User row + Subscription
        # Founder flag is set if we're under the 1000-user threshold
        founder_count_rows = await db.execute(
            select(User).where(User.is_founder == True)
        )
        founder_count = len(founder_count_rows.scalars().all())
        is_founder = founder_count < settings.FOUNDER_LIMIT
        user = User(
            clerk_user_id=clerk_id,
            email=claims.get("email"),
            is_founder=is_founder,
            founder_locked_at=datetime.now(timezone.utc) if is_founder else None,
        )
        db.add(user)
        await db.flush()
        # Initial free subscription
        sub = Subscription(user_id=user.id, tier="free", status="inactive")
        db.add(sub)
        await db.commit()
        await db.refresh(user)
    return user


async def current_user_optional(
    db: DB,
    authorization: Annotated[str | None, Header()] = None,
) -> User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    try:
        claims = await _verify_clerk_jwt(token)
        return await _resolve_user(claims, db)
    except HTTPException:
        return None


async def current_user(
    db: DB,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in required")
    token = authorization.removeprefix("Bearer ").strip()
    claims = await _verify_clerk_jwt(token)
    return await _resolve_user(claims, db)


async def current_pro_user(
    user: Annotated[User, Depends(current_user)],
    db: DB,
) -> User:
    """Requires an active Pro subscription. 402 Payment Required if free."""
    sub_rows = await db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    sub = sub_rows.scalar_one_or_none()
    if not sub or sub.tier != "pro" or sub.status not in ("active", "trialing"):
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            detail={"error": "pro_required", "message": "This feature requires a Pro subscription."},
        )
    return user


CurrentUser = Annotated[User, Depends(current_user)]
CurrentUserOptional = Annotated[User | None, Depends(current_user_optional)]
CurrentProUser = Annotated[User, Depends(current_pro_user)]
