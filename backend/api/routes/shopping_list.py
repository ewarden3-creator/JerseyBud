"""
Shopping list with running total, savings tracker, and per-item buy-or-wait
guidance from the price prediction model.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from api.deps import DB
from core.auth import CurrentUserOptional
from models.shopping import ShoppingListItem, TasteJudgment, PricePrediction
from models.product import Product
from models.dispensary import Dispensary
from api.schemas import ProductOut, DispensaryOut

router = APIRouter(prefix="/shopping-list", tags=["shopping-list"])


def _scope(user, device_id: str | None):
    """Return the SQLAlchemy filter for items belonging to this caller."""
    if user:
        return ShoppingListItem.user_id == user.id
    if device_id:
        return ShoppingListItem.device_id == device_id
    raise HTTPException(401, "Provide auth or device_id")


class AddItem(BaseModel):
    product_id: int
    weight: str
    quantity: int = Field(default=1, ge=1, le=20)
    target_price: float | None = None
    notes: str | None = None
    device_id: str | None = None       # for anonymous users


class ItemOut(BaseModel):
    id: int
    product: ProductOut
    weight: str
    quantity: int
    current_unit_price: float | None
    line_total: float | None
    price_at_add: float | None
    target_price: float | None
    savings_since_add: float | None
    notes: str | None
    prediction: dict | None             # {recommendation, confidence, reasoning}
    taste_warning: str | None           # surfaces if user previously disliked

    model_config = {"from_attributes": True}


class ListSummary(BaseModel):
    items: list[ItemOut]
    item_count: int
    subtotal: float
    savings_total: float
    cheapest_pickup_dispensary: str | None
    cheapest_pickup_subtotal: float | None
    overall_recommendation: str         # strike_now | wait | mixed
    overall_reasoning: str


@router.post("/items", response_model=ItemOut, status_code=201)
async def add_item(body: AddItem, user: CurrentUserOptional, db: DB):
    if not user and not body.device_id:
        raise HTTPException(401, "Provide auth or device_id")

    # Resolve current price for the chosen weight
    prod_row = await db.execute(
        select(Product).options(selectinload(Product.dispensary)).where(Product.id == body.product_id)
    )
    product = prod_row.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")

    entry = next((e for e in (product.pricing or []) if e.get("weight") == body.weight), None)
    price_at_add = entry["price"] if entry else None

    item = ShoppingListItem(
        user_id=user.id if user else None,
        device_id=body.device_id if not user else None,
        product_id=body.product_id,
        weight=body.weight,
        quantity=body.quantity,
        price_at_add=price_at_add,
        target_price=body.target_price,
        notes=body.notes,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return await _hydrate_item(item, product, user, db)


@router.delete("/items/{item_id}", status_code=204)
async def remove_item(
    item_id: int, user: CurrentUserOptional, db: DB,
    device_id: str | None = Query(None),
):
    rows = await db.execute(select(ShoppingListItem).where(ShoppingListItem.id == item_id))
    item = rows.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")
    owns = (user and item.user_id == user.id) or (device_id and item.device_id == device_id)
    if not owns:
        raise HTTPException(403, "Not yours")
    await db.delete(item)
    await db.commit()


@router.get("", response_model=ListSummary)
async def get_list(
    user: CurrentUserOptional, db: DB,
    device_id: str | None = Query(None),
):
    rows = await db.execute(
        select(ShoppingListItem)
        .where(_scope(user, device_id))
        .order_by(ShoppingListItem.created_at.desc())
    )
    items = rows.scalars().all()
    if not items:
        return ListSummary(items=[], item_count=0, subtotal=0, savings_total=0,
                           cheapest_pickup_dispensary=None, cheapest_pickup_subtotal=None,
                           overall_recommendation="neutral", overall_reasoning="Your list is empty.")

    # Hydrate products in a single query
    product_ids = {i.product_id for i in items}
    prod_rows = await db.execute(
        select(Product)
        .options(selectinload(Product.dispensary))
        .where(Product.id.in_(product_ids))
    )
    products_by_id = {p.id: p for p in prod_rows.scalars().all()}

    hydrated = []
    subtotal = 0.0
    savings = 0.0
    by_dispensary: dict[int, tuple[str, float]] = {}
    buy_now_count, wait_count = 0, 0

    for item in items:
        p = products_by_id.get(item.product_id)
        if not p:
            continue
        out = await _hydrate_item(item, p, user, db)
        hydrated.append(out)

        if out.line_total:
            subtotal += out.line_total
            disp_id = p.dispensary.id
            existing = by_dispensary.get(disp_id, (p.dispensary.name, 0.0))
            by_dispensary[disp_id] = (existing[0], existing[1] + out.line_total)
        if out.savings_since_add and out.savings_since_add > 0:
            savings += out.savings_since_add
        if out.prediction:
            rec = out.prediction.get("recommendation")
            if rec == "buy_now": buy_now_count += 1
            elif rec == "wait": wait_count += 1

    cheapest = min(by_dispensary.values(), key=lambda v: v[1]) if by_dispensary else (None, None)

    if buy_now_count > wait_count and buy_now_count >= len(hydrated) * 0.5:
        overall = "strike_now"
        reasoning = f"{buy_now_count} of your items are at or near their lowest historical price. Strike now."
    elif wait_count > buy_now_count:
        overall = "wait"
        reasoning = f"{wait_count} items are likely to drop. Hold a few days."
    else:
        overall = "neutral"
        reasoning = "Mixed signals — check individual items below."

    return ListSummary(
        items=hydrated,
        item_count=sum(i.quantity for i in items),
        subtotal=round(subtotal, 2),
        savings_total=round(savings, 2),
        cheapest_pickup_dispensary=cheapest[0],
        cheapest_pickup_subtotal=round(cheapest[1], 2) if cheapest[1] is not None else None,
        overall_recommendation=overall,
        overall_reasoning=reasoning,
    )


async def _hydrate_item(item: ShoppingListItem, product: Product, user, db) -> ItemOut:
    entry = next((e for e in (product.pricing or []) if e.get("weight") == item.weight), None)
    current = entry["price"] if entry else None
    line_total = round(current * item.quantity, 2) if current else None
    savings = round((item.price_at_add - current) * item.quantity, 2) if (current and item.price_at_add) else None

    # Pull cached prediction (computed nightly)
    pred_rows = await db.execute(
        select(PricePrediction).where(PricePrediction.product_id == product.id)
    )
    pred = pred_rows.scalar_one_or_none()
    prediction = None
    if pred:
        prediction = {
            "recommendation": pred.recommendation,
            "confidence": pred.confidence,
            "reasoning": pred.reasoning,
            "expected_sale_in_days": pred.expected_sale_in_days,
        }

    # Taste warning — did user ever mark this product/strain/brand negatively?
    warning = None
    if user:
        judgment_rows = await db.execute(
            select(TasteJudgment).where(
                TasteJudgment.user_id == user.id,
                or_(
                    TasteJudgment.product_id == product.id,
                    TasteJudgment.strain_name == product.strain_name,
                    TasteJudgment.brand_name == product.brand,
                ),
            )
        )
        for j in judgment_rows.scalars().all():
            if j.verdict in ("disliked", "avoid"):
                if j.product_id == product.id:
                    warning = "You marked this exact product as a no-go."
                elif j.strain_name == product.strain_name:
                    warning = f"You didn't like {product.strain_name} last time."
                elif j.brand_name == product.brand:
                    warning = f"You've marked {product.brand} as not your favorite."
                break

    pout = ProductOut.model_validate(product)
    pout.dispensary = DispensaryOut.model_validate(product.dispensary)

    return ItemOut(
        id=item.id,
        product=pout,
        weight=item.weight,
        quantity=item.quantity,
        current_unit_price=current,
        line_total=line_total,
        price_at_add=item.price_at_add,
        target_price=item.target_price,
        savings_since_add=savings,
        notes=item.notes,
        prediction=prediction,
        taste_warning=warning,
    )
