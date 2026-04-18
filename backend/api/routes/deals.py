from fastapi import APIRouter, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from geopy.distance import geodesic

from api.deps import DB
from api.schemas import DealOut, ProductOut, DispensaryOut
from models.product import Product
from models.dispensary import Dispensary

router = APIRouter(prefix="/deals", tags=["deals"])

SORT_OPTIONS = {"pct_off", "price_per_gram", "distance", "price"}


@router.get("", response_model=list[DealOut])
async def list_deals(
    db: DB,
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius_miles: float = Query(25),
    category: str | None = Query(None),
    product_type: str | None = Query(None),
    sort: str = Query("pct_off"),   # pct_off | price_per_gram | distance | price
    limit: int = Query(30, le=100),
):
    """
    Deals feed. sort=price_per_gram ranks by best $/g value across all on-sale items.
    sort=pct_off ranks by deepest discount %.
    """
    stmt = (
        select(Product)
        .join(Product.dispensary)
        .options(selectinload(Product.dispensary))
        .where(Product.is_on_sale == True)
        .where(Product.in_stock == True)
        .where(Dispensary.is_active == True)
    )
    if category:
        stmt = stmt.where(Product.category == category.lower())
    if product_type:
        stmt = stmt.where(Product.product_type == product_type.lower())

    # DB-level pre-sort to reduce Python work
    if sort == "price_per_gram":
        stmt = stmt.order_by(Product.best_price_per_gram.asc().nullslast())
    else:
        stmt = stmt.order_by(Product.sale_pct_off.desc().nullslast())

    rows = await db.execute(stmt)
    products = rows.scalars().all()

    results = []
    for p in products:
        dist = None
        if lat is not None and lng is not None and p.dispensary.lat and p.dispensary.lng:
            dist = geodesic((lat, lng), (p.dispensary.lat, p.dispensary.lng)).miles
            if dist > radius_miles:
                continue

        best = _best_deal_entry(p.pricing or [])
        if not best:
            continue

        pout = ProductOut.model_validate(p)
        pout.dispensary = DispensaryOut.model_validate(p.dispensary)
        pout.distance_miles = round(dist, 2) if dist is not None else None
        pout.dispensary.distance_miles = pout.distance_miles

        results.append(DealOut(
            product=pout,
            best_price=best["price"],
            best_weight=best["weight"],
            best_price_per_gram=best.get("price_per_gram"),
            original_price=best.get("original_price"),
            sale_pct_off=p.sale_pct_off,
            dispensary_name=p.dispensary.name,
            dispensary_city=p.dispensary.city,
            distance_miles=round(dist, 2) if dist is not None else None,
        ))

    # Final sort in Python (post geo-filter)
    if sort == "distance" and lat is not None:
        results.sort(key=lambda x: (x.distance_miles or 9999, -(x.sale_pct_off or 0)))
    elif sort == "price":
        results.sort(key=lambda x: x.best_price)
    elif sort == "price_per_gram":
        results.sort(key=lambda x: x.best_price_per_gram or 9999)
    else:
        results.sort(key=lambda x: (-(x.sale_pct_off or 0), x.distance_miles or 9999))

    return results[:limit]


def _best_deal_entry(pricing: list[dict]) -> dict | None:
    """Prefer on-sale entries; within those pick best price-per-gram."""
    on_sale = [e for e in pricing if "original_price" in e]
    pool = on_sale if on_sale else pricing
    if not pool:
        return None
    # Sort by price_per_gram if available, else raw price
    return min(pool, key=lambda e: e.get("price_per_gram") or e["price"])
