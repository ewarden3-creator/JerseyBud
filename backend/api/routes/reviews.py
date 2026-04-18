"""
Reviews + the credit ledger that turns reviews into free months.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func

from api.deps import DB
from core.auth import CurrentUser, CurrentUserOptional
from core.config import settings
from models.user import Review, Credit, User

router = APIRouter(prefix="/reviews", tags=["reviews"])

MIN_BODY_LEN = 80   # gate for credit eligibility — encourages substantive reviews


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    body: str | None = None
    product_id: int | None = None
    strain_name: str | None = None
    effects_felt: list[str] = []
    terps_noted: list[str] = []
    would_buy_again: bool | None = None


class ReviewOut(BaseModel):
    id: int
    user_id: int
    product_id: int | None
    strain_name: str | None
    rating: int
    body: str | None
    effects_felt: list | None
    terps_noted: list | None
    would_buy_again: bool | None
    is_credit_eligible: bool
    credit_awarded: bool
    created_at: str

    model_config = {"from_attributes": True}


@router.post("", response_model=ReviewOut, status_code=201)
async def create_review(body: ReviewCreate, user: CurrentUser, db: DB):
    if not body.product_id and not body.strain_name:
        raise HTTPException(400, "Provide product_id or strain_name")

    is_quality = bool(body.body) and len(body.body) >= MIN_BODY_LEN

    review = Review(
        user_id=user.id,
        product_id=body.product_id,
        strain_name=body.strain_name,
        rating=body.rating,
        body=body.body,
        effects_felt=body.effects_felt or None,
        terps_noted=body.terps_noted or None,
        would_buy_again=body.would_buy_again,
        is_credit_eligible=is_quality,
        status="published",
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    # If quality review, award credit progress and grant free month every Nth review
    if is_quality:
        await _maybe_award_free_month(user, review, db)

    return ReviewOut.model_validate(review)


@router.get("/me", response_model=list[ReviewOut])
async def my_reviews(user: CurrentUser, db: DB):
    rows = await db.execute(
        select(Review).where(Review.user_id == user.id).order_by(Review.created_at.desc())
    )
    return [ReviewOut.model_validate(r) for r in rows.scalars().all()]


@router.get("/product/{product_id}", response_model=list[ReviewOut])
async def product_reviews(product_id: int, db: DB, limit: int = Query(20)):
    rows = await db.execute(
        select(Review)
        .where(Review.product_id == product_id, Review.status == "published")
        .order_by(Review.created_at.desc())
        .limit(limit)
    )
    return [ReviewOut.model_validate(r) for r in rows.scalars().all()]


@router.get("/strain/{strain_name}", response_model=list[ReviewOut])
async def strain_reviews(strain_name: str, db: DB, limit: int = Query(20)):
    rows = await db.execute(
        select(Review)
        .where(Review.strain_name.ilike(strain_name), Review.status == "published")
        .order_by(Review.created_at.desc())
        .limit(limit)
    )
    return [ReviewOut.model_validate(r) for r in rows.scalars().all()]


# ----- Credit ledger -----

class CreditOut(BaseModel):
    id: int
    amount_cents: int
    source: str
    description: str | None
    applied_at: str | None
    created_at: str

    model_config = {"from_attributes": True}


@router.get("/credits/me", tags=["credits"])
async def my_credits(user: CurrentUser, db: DB):
    rows = await db.execute(
        select(Credit).where(Credit.user_id == user.id).order_by(Credit.created_at.desc())
    )
    entries = [CreditOut.model_validate(c) for c in rows.scalars().all()]

    # Net unredeemed balance in cents
    balance = sum(c.amount_cents for c in rows.scalars().all() if not c.applied_at) if False else 0
    # (Simpler: re-query the sum)
    balance_row = await db.execute(
        select(func.coalesce(func.sum(Credit.amount_cents), 0))
        .where(Credit.user_id == user.id, Credit.applied_at.is_(None))
    )
    balance = balance_row.scalar_one()

    # Progress to next free month
    review_count_row = await db.execute(
        select(func.count(Review.id)).where(
            Review.user_id == user.id,
            Review.is_credit_eligible == True,
            Review.credit_awarded == False,
        )
    )
    progress = review_count_row.scalar_one() or 0

    return {
        "balance_cents": balance,
        "balance_dollars": round(balance / 100, 2),
        "next_reward_progress": progress,
        "next_reward_threshold": settings.REVIEWS_PER_FREE_MONTH,
        "entries": entries,
    }


async def _maybe_award_free_month(user: User, review: Review, db):
    """Every Nth quality review unlocks a free month credit ($6.99 default value)."""
    pending_row = await db.execute(
        select(func.count(Review.id)).where(
            Review.user_id == user.id,
            Review.is_credit_eligible == True,
            Review.credit_awarded == False,
        )
    )
    pending = pending_row.scalar_one() or 0

    if pending >= settings.REVIEWS_PER_FREE_MONTH:
        # Grant credit
        credit = Credit(
            user_id=user.id,
            amount_cents=699,           # $6.99 — auto-applies to next invoice
            source="review",
            source_ref_id=review.id,
            description=f"Free month for {settings.REVIEWS_PER_FREE_MONTH} quality reviews",
        )
        db.add(credit)

        # Mark contributing reviews as awarded
        contributing_rows = await db.execute(
            select(Review).where(
                Review.user_id == user.id,
                Review.is_credit_eligible == True,
                Review.credit_awarded == False,
            ).limit(settings.REVIEWS_PER_FREE_MONTH)
        )
        for r in contributing_rows.scalars().all():
            r.credit_awarded = True

        await db.commit()
