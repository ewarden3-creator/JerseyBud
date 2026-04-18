"""
Brand-first views — what real cannabis culture is built around.
Brands like Cookies, Verano, Hashstoria, Hillview drop new strains;
people follow brands they love and get hyped when they drop.

There's no Brand table — brand is a string field on Product. We derive
brand summaries on demand: total products in stock, last drop date,
days-since-last-drop, top strains.
"""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import select, func, distinct
from sqlalchemy.orm import selectinload

from api.deps import DB
from models.product import Product
from models.dispensary import Dispensary

router = APIRouter(prefix="/brands", tags=["brands"])


class BrandSummary(BaseModel):
    name: str
    product_count: int
    strain_count: int
    dispensary_count: int
    last_drop_at: str | None              # ISO timestamp of newest product seen
    days_since_last_drop: int | None
    avg_thc: float | None
    on_sale_count: int
    is_just_dropped: bool                 # within last 7 days
    sample_strains: list[str]             # up to 5 strain names
    image_url: str | None                 # use first product image as brand visual


class BrandDrop(BaseModel):
    """A specific strain a brand released — used for the 'just dropped' feed."""
    brand: str
    strain_name: str
    product_id: int
    dispensary_name: str
    dispensary_city: str
    image_url: str | None
    thc_pct: float | None
    is_on_sale: bool
    sale_pct_off: float | None
    first_seen_at: str
    days_old: int


@router.get("", response_model=list[BrandSummary])
async def list_brands(db: DB, limit: int = Query(50, le=200)):
    """All brands carrying products in NJ, sorted by recent drop activity."""
    rows = await db.execute(
        select(Product, Dispensary)
        .join(Product.dispensary)
        .where(Product.in_stock == True)
        .where(Product.brand.isnot(None))
        .where(Dispensary.is_active == True)
    )
    pairs = rows.all()

    # Group by brand
    by_brand: dict[str, list] = {}
    for p, d in pairs:
        by_brand.setdefault(p.brand, []).append((p, d))

    summaries = []
    now = datetime.now(timezone.utc)
    for brand, items in by_brand.items():
        products = [p for p, _ in items]
        dispensaries = {d.id for _, d in items}
        strains = {p.strain_name for p in products if p.strain_name}

        last_drop = max((p.scraped_at for p in products if p.scraped_at), default=None)
        days_since = None
        if last_drop:
            # Treat scraped_at as "first seen" for now — when scraper fully tracks
            # first_seen_at separately we'll use that
            delta = now - last_drop.replace(tzinfo=timezone.utc) if last_drop.tzinfo is None else now - last_drop
            days_since = max(0, delta.days)

        thc_vals = [p.thc_pct for p in products if p.thc_pct]
        avg_thc = round(sum(thc_vals) / len(thc_vals), 1) if thc_vals else None

        first_image = next((p.image_url for p in products if p.image_url), None)
        sample = list(strains)[:5]

        summaries.append(BrandSummary(
            name=brand,
            product_count=len(products),
            strain_count=len(strains),
            dispensary_count=len(dispensaries),
            last_drop_at=last_drop.isoformat() if last_drop else None,
            days_since_last_drop=days_since,
            avg_thc=avg_thc,
            on_sale_count=sum(1 for p in products if p.is_on_sale),
            is_just_dropped=(days_since is not None and days_since <= 7),
            sample_strains=sample,
            image_url=first_image,
        ))

    summaries.sort(key=lambda b: (
        not b.is_just_dropped,
        b.days_since_last_drop if b.days_since_last_drop is not None else 9999,
    ))
    return summaries[:limit]


@router.get("/drops", response_model=list[BrandDrop])
async def recent_drops(
    db: DB,
    days: int = Query(14, le=60),
    limit: int = Query(30, le=100),
    brands: str | None = Query(None, description="CSV of brand names to filter (e.g. for followed brands)"),
):
    """Strains seen first within the last N days — the 'just dropped' feed."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    stmt = (
        select(Product)
        .join(Product.dispensary)
        .options(selectinload(Product.dispensary))
        .where(Product.in_stock == True)
        .where(Product.brand.isnot(None))
        .where(Product.strain_name.isnot(None))
        .where(Product.scraped_at >= cutoff)
        .where(Dispensary.is_active == True)
        .order_by(Product.scraped_at.desc())
    )
    if brands:
        brand_list = [b.strip() for b in brands.split(",") if b.strip()]
        stmt = stmt.where(Product.brand.in_(brand_list))

    rows = await db.execute(stmt.limit(limit * 3))
    products = rows.scalars().all()

    # Dedupe by (brand, strain_name) — keep the freshest sighting
    seen: dict[tuple[str, str], Product] = {}
    for p in products:
        key = (p.brand, p.strain_name)
        if key not in seen:
            seen[key] = p

    now = datetime.now(timezone.utc)
    drops = []
    for p in seen.values():
        ts = p.scraped_at.replace(tzinfo=timezone.utc) if p.scraped_at and p.scraped_at.tzinfo is None else p.scraped_at
        days_old = (now - ts).days if ts else 0
        drops.append(BrandDrop(
            brand=p.brand,
            strain_name=p.strain_name,
            product_id=p.id,
            dispensary_name=p.dispensary.name,
            dispensary_city=p.dispensary.city,
            image_url=p.image_url,
            thc_pct=p.thc_pct,
            is_on_sale=p.is_on_sale,
            sale_pct_off=p.sale_pct_off,
            first_seen_at=ts.isoformat() if ts else now.isoformat(),
            days_old=days_old,
        ))

    drops.sort(key=lambda d: d.days_old)
    return drops[:limit]


@router.get("/{brand_name}", response_model=BrandSummary)
async def brand_detail(brand_name: str, db: DB):
    """Single brand summary."""
    rows = await db.execute(
        select(Product, Dispensary)
        .join(Product.dispensary)
        .where(Product.in_stock == True)
        .where(Product.brand == brand_name)
    )
    pairs = rows.all()
    if not pairs:
        from fastapi import HTTPException
        raise HTTPException(404, "Brand not found")

    products = [p for p, _ in pairs]
    dispensaries = {d.id for _, d in pairs}
    strains = {p.strain_name for p in products if p.strain_name}
    last_drop = max((p.scraped_at for p in products if p.scraped_at), default=None)
    now = datetime.now(timezone.utc)
    days_since = None
    if last_drop:
        ts = last_drop.replace(tzinfo=timezone.utc) if last_drop.tzinfo is None else last_drop
        days_since = max(0, (now - ts).days)

    thc_vals = [p.thc_pct for p in products if p.thc_pct]
    avg_thc = round(sum(thc_vals) / len(thc_vals), 1) if thc_vals else None

    return BrandSummary(
        name=brand_name,
        product_count=len(products),
        strain_count=len(strains),
        dispensary_count=len(dispensaries),
        last_drop_at=last_drop.isoformat() if last_drop else None,
        days_since_last_drop=days_since,
        avg_thc=avg_thc,
        on_sale_count=sum(1 for p in products if p.is_on_sale),
        is_just_dropped=(days_since is not None and days_since <= 7),
        sample_strains=list(strains)[:10],
        image_url=next((p.image_url for p in products if p.image_url), None),
    )


@router.get("/{brand_name}/products")
async def brand_products(brand_name: str, db: DB):
    """Full catalog for one brand across NJ."""
    from api.schemas import ProductOut, DispensaryOut
    rows = await db.execute(
        select(Product)
        .join(Product.dispensary)
        .options(selectinload(Product.dispensary))
        .where(Product.in_stock == True)
        .where(Product.brand == brand_name)
        .order_by(Product.scraped_at.desc())
    )
    products = rows.scalars().all()
    out = []
    for p in products:
        po = ProductOut.model_validate(p)
        po.dispensary = DispensaryOut.model_validate(p.dispensary)
        out.append(po)
    return out
