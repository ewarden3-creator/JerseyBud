"""
Taste judgments — fast tap-to-rate. Drives the "you didn't like this" warnings
that prevent users from re-buying products they previously rejected.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.dialects.postgresql import insert as pg_insert

from api.deps import DB
from core.auth import CurrentUserOptional
from models.shopping import TasteJudgment

router = APIRouter(prefix="/taste", tags=["taste"])

VALID_VERDICTS = {"loved", "liked", "neutral", "disliked", "avoid"}


class JudgmentIn(BaseModel):
    verdict: str                  # loved | liked | neutral | disliked | avoid
    product_id: int | None = None
    strain_name: str | None = None
    brand_name: str | None = None
    note: str | None = None
    device_id: str | None = None


class JudgmentOut(BaseModel):
    id: int
    verdict: str
    product_id: int | None
    strain_name: str | None
    brand_name: str | None
    note: str | None
    created_at: str

    model_config = {"from_attributes": True}


@router.post("", response_model=JudgmentOut)
async def upsert_judgment(body: JudgmentIn, user: CurrentUserOptional, db: DB):
    if body.verdict not in VALID_VERDICTS:
        raise HTTPException(400, f"verdict must be one of {VALID_VERDICTS}")
    if not user and not body.device_id:
        raise HTTPException(401, "Provide auth or device_id")
    if not any([body.product_id, body.strain_name, body.brand_name]):
        raise HTTPException(400, "Provide product_id, strain_name, or brand_name")

    # Upsert: re-judging same target replaces the prior verdict
    values = dict(
        user_id=user.id if user else None,
        device_id=body.device_id if not user else None,
        verdict=body.verdict,
        product_id=body.product_id,
        strain_name=body.strain_name,
        brand_name=body.brand_name,
        note=body.note,
    )
    # Pick the unique constraint to use based on what's being judged
    if body.product_id:
        idx = ["user_id", "product_id"]
    elif body.strain_name:
        idx = ["user_id", "strain_name"]
    else:
        idx = ["user_id", "brand_name"]

    stmt = pg_insert(TasteJudgment).values(**values).on_conflict_do_update(
        index_elements=idx,
        set_={"verdict": body.verdict, "note": body.note},
    ).returning(TasteJudgment)
    result = await db.execute(stmt)
    judgment = result.scalar_one()
    await db.commit()
    return JudgmentOut.model_validate(judgment)


@router.get("/me", response_model=list[JudgmentOut])
async def my_judgments(
    user: CurrentUserOptional, db: DB,
    device_id: str | None = Query(None),
    verdict: str | None = Query(None),  # filter to "disliked,avoid" etc
):
    if not user and not device_id:
        raise HTTPException(401, "Provide auth or device_id")
    scope = (TasteJudgment.user_id == user.id) if user else (TasteJudgment.device_id == device_id)
    stmt = select(TasteJudgment).where(scope).order_by(TasteJudgment.updated_at.desc())
    if verdict:
        verdicts = [v.strip() for v in verdict.split(",") if v.strip() in VALID_VERDICTS]
        stmt = stmt.where(TasteJudgment.verdict.in_(verdicts))
    rows = await db.execute(stmt)
    return [JudgmentOut.model_validate(j) for j in rows.scalars().all()]


@router.get("/check")
async def check_target(
    user: CurrentUserOptional, db: DB,
    product_id: int | None = Query(None),
    strain_name: str | None = Query(None),
    brand_name: str | None = Query(None),
    device_id: str | None = Query(None),
):
    """
    Returns the most relevant prior judgment for a target — used to flag the UI
    before a user adds something to their list or revisits a product.
    """
    if not user and not device_id:
        return {"verdict": None}
    scope = (TasteJudgment.user_id == user.id) if user else (TasteJudgment.device_id == device_id)

    conditions = []
    if product_id:    conditions.append(TasteJudgment.product_id == product_id)
    if strain_name:   conditions.append(TasteJudgment.strain_name == strain_name)
    if brand_name:    conditions.append(TasteJudgment.brand_name == brand_name)
    if not conditions:
        return {"verdict": None}

    rows = await db.execute(
        select(TasteJudgment).where(scope, or_(*conditions))
        .order_by(TasteJudgment.updated_at.desc()).limit(1)
    )
    j = rows.scalar_one_or_none()
    if not j:
        return {"verdict": None}

    # Build a friendly warning/reassurance string the frontend can render directly
    if j.verdict in ("disliked", "avoid"):
        if j.product_id == product_id:
            msg = "You marked this product as a no-go."
        elif j.strain_name and j.strain_name == strain_name:
            msg = f"You didn't like {strain_name} last time."
        elif j.brand_name and j.brand_name == brand_name:
            msg = f"You've marked {brand_name} as not your favorite."
        else:
            msg = "You've previously avoided this."
        return {"verdict": j.verdict, "message": msg, "tone": "warning"}

    if j.verdict in ("loved", "liked"):
        target = j.strain_name or j.brand_name or "this"
        return {
            "verdict": j.verdict,
            "message": f"You {j.verdict} {target} before.",
            "tone": "positive",
        }

    return {"verdict": j.verdict, "message": None, "tone": "neutral"}
