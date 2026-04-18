from fastapi import APIRouter, Query
from sqlalchemy import select, func

from api.deps import DB
from api.schemas import TrendEntry
from models.product import Product
from models.dispensary import Dispensary

router = APIRouter(prefix="/trends", tags=["trends"])

# Weight tier for eighth (3.5g) — used to normalize price comparisons
EIGHTH_WEIGHTS = {"3.5g", "1/8oz", "eighth", "3.5"}


@router.get("", response_model=list[TrendEntry])
async def get_trends(
    db: DB,
    category: str = Query("flower"),
    limit: int = Query(20, le=50),
):
    """
    Returns strains appearing across the most NJ dispensaries,
    with avg THC and avg eighth price. Proxy for 'what's hot right now'.
    """
    stmt = (
        select(
            Product.strain_name,
            Product.category,
            Product.product_type,
            func.avg(Product.thc_pct).label("avg_thc"),
            func.count(func.distinct(Product.dispensary_id)).label("dispensary_count"),
            Product.pricing,
        )
        .join(Product.dispensary)
        .where(Product.in_stock == True)
        .where(Dispensary.is_active == True)
        .where(Product.strain_name.isnot(None))
        .where(Product.category == category.lower())
        .group_by(Product.strain_name, Product.category, Product.product_type, Product.pricing)
        .order_by(func.count(func.distinct(Product.dispensary_id)).desc())
        .limit(limit * 3)  # fetch extra; we'll collapse by strain below
    )

    rows = await db.execute(stmt)
    raw = rows.all()

    # Collapse duplicate strain names (same strain across sources)
    seen: dict[str, TrendEntry] = {}
    for row in raw:
        key = (row.strain_name or "").lower().strip()
        if not key:
            continue

        avg_eighth = _avg_eighth_price(row.pricing or [])

        if key in seen:
            existing = seen[key]
            # Merge: take max dispensary_count, re-average THC
            seen[key] = TrendEntry(
                strain_name=existing.strain_name,
                category=existing.category,
                product_type=existing.product_type,
                avg_thc=_safe_avg(existing.avg_thc, row.avg_thc),
                dispensary_count=max(existing.dispensary_count, row.dispensary_count),
                avg_price_eighth=_safe_avg(existing.avg_price_eighth, avg_eighth),
            )
        else:
            seen[key] = TrendEntry(
                strain_name=row.strain_name,
                category=row.category,
                product_type=row.product_type,
                avg_thc=round(row.avg_thc, 1) if row.avg_thc else None,
                dispensary_count=row.dispensary_count,
                avg_price_eighth=avg_eighth,
            )

    results = sorted(seen.values(), key=lambda t: t.dispensary_count, reverse=True)
    return results[:limit]


def _avg_eighth_price(pricing: list[dict]) -> float | None:
    prices = [
        e["price"]
        for e in pricing
        if str(e.get("weight", "")).lower() in EIGHTH_WEIGHTS
    ]
    return round(sum(prices) / len(prices), 2) if prices else None


def _safe_avg(a: float | None, b: float | None) -> float | None:
    vals = [v for v in (a, b) if v is not None]
    return round(sum(vals) / len(vals), 1) if vals else None
