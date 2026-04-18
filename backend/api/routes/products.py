import statistics
from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import select, func, cast, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import selectinload
from geopy.distance import geodesic

from api.deps import DB
from api.schemas import (
    ProductOut, DispensaryOut, PriceHistoryPoint, LabHistoryEntry,
    PriceCompareEntry, MedianPriceOut,
)
from models.product import Product, PriceHistory, LabHistory
from models.dispensary import Dispensary

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
async def list_products(
    db: DB,
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius_miles: float = Query(25),
    category: str | None = Query(None),
    product_type: str | None = Query(None),
    on_sale: bool | None = Query(None),
    max_price: float | None = Query(None),
    max_price_per_gram: float | None = Query(None),
    min_thc: float | None = Query(None),
    max_thc: float | None = Query(None),
    min_cbd: float | None = Query(None),
    has_terpenes: bool | None = Query(None),
    min_total_terpenes: float | None = Query(None),
    # Cannabinoid filters: e.g. cannabinoids=cbn,cbg  min_cannabinoid_pct=0.1
    cannabinoids: str | None = Query(None, description="Comma-separated keys, e.g. cbn,cbg"),
    min_cannabinoid_pct: float = Query(0.0),
    # Terpene filters: e.g. terpenes=beta_myrcene,limonene  min_terpene_pct=0.1
    terpenes: str | None = Query(None, description="Comma-separated keys, e.g. beta_myrcene,limonene"),
    min_terpene_pct: float = Query(0.0),
    search: str | None = Query(None),
    sort: str = Query("relevance"),  # relevance | price_per_gram | thc | distance | sale
    limit: int = Query(50, le=200),
    offset: int = Query(0),
):
    stmt = (
        select(Product)
        .join(Product.dispensary)
        .options(selectinload(Product.dispensary))
        .where(Product.in_stock == True)
        .where(Dispensary.is_active == True)
    )

    if category:
        stmt = stmt.where(Product.category == category.lower())
    if product_type:
        stmt = stmt.where(Product.product_type == product_type.lower())
    if on_sale is not None:
        stmt = stmt.where(Product.is_on_sale == on_sale)
    if min_thc is not None:
        stmt = stmt.where(Product.thc_pct >= min_thc)
    if max_thc is not None:
        stmt = stmt.where(Product.thc_pct <= max_thc)
    if min_cbd is not None:
        stmt = stmt.where(Product.cbd_pct >= min_cbd)
    if has_terpenes:
        stmt = stmt.where(Product.terpenes.isnot(None))
    if min_total_terpenes is not None:
        stmt = stmt.where(Product.total_terpenes_pct >= min_total_terpenes)
    if max_price_per_gram is not None:
        stmt = stmt.where(Product.best_price_per_gram <= max_price_per_gram)

    # Cannabinoid presence filter — requires the key to exist and value >= min_pct
    # Uses Postgres JSONB cast: (cannabinoids->>'key')::float >= threshold
    if cannabinoids:
        for key in [k.strip().lower() for k in cannabinoids.split(",") if k.strip()]:
            json_val = cast(
                Product.cannabinoids[key].astext, Float
            )
            stmt = stmt.where(
                Product.cannabinoids.isnot(None),
                Product.cannabinoids.has_key(key),  # noqa: W601
                json_val >= min_cannabinoid_pct,
            )

    # Terpene presence filter
    if terpenes:
        for key in [k.strip().lower() for k in terpenes.split(",") if k.strip()]:
            json_val = cast(
                Product.terpenes[key].astext, Float
            )
            stmt = stmt.where(
                Product.terpenes.isnot(None),
                Product.terpenes.has_key(key),  # noqa: W601
                json_val >= min_terpene_pct,
            )

    if search:
        term = f"%{search}%"
        stmt = stmt.where(
            Product.name.ilike(term)
            | Product.brand.ilike(term)
            | Product.strain_name.ilike(term)
        )

    if sort == "price_per_gram":
        stmt = stmt.order_by(Product.best_price_per_gram.asc().nullslast())
    elif sort == "thc":
        stmt = stmt.order_by(Product.thc_pct.desc().nullslast())
    elif sort == "sale":
        stmt = stmt.order_by(Product.sale_pct_off.desc().nullslast())

    rows = await db.execute(stmt.offset(offset))
    products = rows.scalars().all()

    results = []
    for p in products:
        dist = None
        if lat is not None and lng is not None and p.dispensary.lat and p.dispensary.lng:
            dist = geodesic((lat, lng), (p.dispensary.lat, p.dispensary.lng)).miles
            if dist > radius_miles:
                continue

        if max_price is not None and p.pricing:
            cheapest = min((e["price"] for e in p.pricing), default=None)
            if cheapest is None or cheapest > max_price:
                continue

        pout = ProductOut.model_validate(p)
        pout.dispensary = DispensaryOut.model_validate(p.dispensary)
        pout.distance_miles = round(dist, 2) if dist is not None else None
        pout.dispensary.distance_miles = pout.distance_miles
        results.append(pout)

    if sort == "distance" and lat is not None:
        results.sort(key=lambda x: x.distance_miles or 9999)

    return results[:limit]


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, db: DB, lat: float | None = None, lng: float | None = None):
    row = await db.execute(
        select(Product)
        .options(selectinload(Product.dispensary))
        .where(Product.id == product_id)
    )
    p = row.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")

    dist = None
    if lat and lng and p.dispensary.lat and p.dispensary.lng:
        dist = round(geodesic((lat, lng), (p.dispensary.lat, p.dispensary.lng)).miles, 2)

    pout = ProductOut.model_validate(p)
    pout.dispensary = DispensaryOut.model_validate(p.dispensary)
    pout.distance_miles = dist
    pout.dispensary.distance_miles = dist
    return pout


@router.get("/{product_id}/price-history", response_model=list[PriceHistoryPoint])
async def get_price_history(product_id: int, db: DB, limit: int = Query(90)):
    rows = await db.execute(
        select(PriceHistory)
        .where(PriceHistory.product_id == product_id)
        .order_by(PriceHistory.recorded_at.desc())
        .limit(limit)
    )
    return [PriceHistoryPoint.model_validate(r) for r in rows.scalars().all()]


@router.get("/{product_id}/lab-history", response_model=list[LabHistoryEntry])
async def get_lab_history(product_id: int, db: DB):
    rows = await db.execute(
        select(LabHistory)
        .where(LabHistory.product_id == product_id)
        .order_by(LabHistory.recorded_at.desc())
    )
    return [LabHistoryEntry.model_validate(r) for r in rows.scalars().all()]


@router.get("/strain/{strain_name}/compare", response_model=list[PriceCompareEntry])
async def compare_strain_prices(
    strain_name: str,
    db: DB,
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius_miles: float = Query(50),
    weight: str | None = Query(None),
):
    """Show the same strain across every NJ dispensary that carries it, sorted by value."""
    rows = await db.execute(
        select(Product)
        .join(Product.dispensary)
        .options(selectinload(Product.dispensary))
        .where(Product.strain_name.ilike(strain_name))
        .where(Product.in_stock == True)
        .where(Dispensary.is_active == True)
    )
    products = rows.scalars().all()

    results = []
    for p in products:
        dist = None
        if lat and lng and p.dispensary.lat and p.dispensary.lng:
            dist = geodesic((lat, lng), (p.dispensary.lat, p.dispensary.lng)).miles
            if dist > radius_miles:
                continue

        pricing = p.pricing or []
        if weight:
            pricing = [e for e in pricing if e.get("weight") == weight]

        results.append(PriceCompareEntry(
            dispensary_name=p.dispensary.name,
            dispensary_city=p.dispensary.city,
            dispensary_slug=p.dispensary.slug,
            dispensary_source=p.dispensary.source,
            dispensary_source_id=p.dispensary.source_id,
            dispensary_lat=p.dispensary.lat,
            dispensary_lng=p.dispensary.lng,
            distance_miles=round(dist, 2) if dist else None,
            pricing=[e for e in (p.pricing or [])],
            best_price_per_gram=p.best_price_per_gram,
            is_on_sale=p.is_on_sale,
            sale_pct_off=p.sale_pct_off,
            product_id=p.id,
            product_source_id=p.source_id,
        ))

    results.sort(key=lambda x: x.best_price_per_gram or 9999)
    return results


@router.get("/strain/{strain_name}/median-price", response_model=list[MedianPriceOut])
async def get_median_prices(strain_name: str, db: DB):
    """Statewide median price per weight tier — BudWatcher avg price indicator."""
    rows = await db.execute(
        select(Product)
        .where(Product.strain_name.ilike(strain_name))
        .where(Product.in_stock == True)
        .where(Product.pricing.isnot(None))
    )
    products = rows.scalars().all()

    # Collect all prices by weight
    by_weight: dict[str, list[float]] = {}
    for p in products:
        for entry in (p.pricing or []):
            w = entry.get("weight", "")
            if w not in by_weight:
                by_weight[w] = []
            by_weight[w].append(entry["price"])

    results = []
    for weight, prices in by_weight.items():
        if len(prices) < 2:
            continue
        results.append(MedianPriceOut(
            strain_name=strain_name,
            weight=weight,
            median_price=round(statistics.median(prices), 2),
            min_price=min(prices),
            max_price=max(prices),
            sample_count=len(prices),
        ))

    results.sort(key=lambda x: x.sample_count, reverse=True)
    return results
