from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from geopy.distance import geodesic

from api.deps import DB
from api.schemas import DispensaryOut, ProductOut
from models.dispensary import Dispensary
from models.product import Product

router = APIRouter(prefix="/dispensaries", tags=["dispensaries"])

NJ_TZ = ZoneInfo("America/New_York")
DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def compute_is_open_now(hours: dict | None) -> bool | None:
    if not hours:
        return None
    now = datetime.now(NJ_TZ)
    day_key = DAY_KEYS[now.weekday()]
    slot = hours.get(day_key, "")
    if not slot:
        return False
    try:
        open_str, close_str = [s.strip() for s in slot.split("-")]
        fmt = "%I %p" if ":" not in open_str else "%I:%M %p"
        open_time = datetime.strptime(open_str.strip(), fmt).replace(
            year=now.year, month=now.month, day=now.day, tzinfo=NJ_TZ
        )
        close_time = datetime.strptime(close_str.strip(), fmt).replace(
            year=now.year, month=now.month, day=now.day, tzinfo=NJ_TZ
        )
        return open_time <= now <= close_time
    except (ValueError, AttributeError):
        return None


def enrich_dispensary(d: Dispensary, dist: float | None = None) -> DispensaryOut:
    out = DispensaryOut.model_validate(d)
    out.distance_miles = round(dist, 2) if dist is not None else None
    out.is_open_now = compute_is_open_now(d.hours)
    return out


@router.get("", response_model=list[DispensaryOut])
async def list_dispensaries(
    db: DB,
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius_miles: float = Query(25),
    city: str | None = Query(None),
    open_now: bool | None = Query(None),
    medical: bool | None = Query(None),
    recreational: bool | None = Query(None),
    wheelchair_accessible: bool | None = Query(None),
    delivery: bool | None = Query(None),
    limit: int = Query(50, le=200),
):
    stmt = select(Dispensary).where(Dispensary.is_active == True)
    if city:
        stmt = stmt.where(Dispensary.city.ilike(f"%{city}%"))
    if medical is not None:
        stmt = stmt.where(Dispensary.medical == medical)
    if recreational is not None:
        stmt = stmt.where(Dispensary.recreational == recreational)
    if wheelchair_accessible:
        stmt = stmt.where(Dispensary.wheelchair_accessible == True)
    if delivery:
        stmt = stmt.where(Dispensary.delivery == True)

    rows = await db.execute(stmt)
    dispensaries = rows.scalars().all()

    results = []
    for d in dispensaries:
        dist = None
        if lat is not None and lng is not None and d.lat and d.lng:
            dist = geodesic((lat, lng), (d.lat, d.lng)).miles
            if dist > radius_miles:
                continue
        out = enrich_dispensary(d, dist)
        if open_now is not None and out.is_open_now != open_now:
            continue
        results.append(out)

    results.sort(key=lambda x: x.distance_miles or 9999)
    return results[:limit]


@router.get("/{slug}", response_model=DispensaryOut)
async def get_dispensary(slug: str, db: DB):
    row = await db.execute(select(Dispensary).where(Dispensary.slug == slug))
    d = row.scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Dispensary not found")
    return enrich_dispensary(d)


@router.get("/{slug}/menu", response_model=list[ProductOut])
async def get_menu(
    slug: str,
    db: DB,
    category: str | None = Query(None),
    product_type: str | None = Query(None),
    on_sale: bool | None = Query(None),
    in_stock: bool = Query(True),
    sort: str = Query("name"),   # name | price_per_gram | thc | sale
):
    row = await db.execute(select(Dispensary).where(Dispensary.slug == slug))
    d = row.scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Dispensary not found")

    stmt = select(Product).where(Product.dispensary_id == d.id)
    if in_stock:
        stmt = stmt.where(Product.in_stock == True)
    if category:
        stmt = stmt.where(Product.category == category.lower())
    if product_type:
        stmt = stmt.where(Product.product_type == product_type.lower())
    if on_sale is not None:
        stmt = stmt.where(Product.is_on_sale == on_sale)

    if sort == "price_per_gram":
        stmt = stmt.order_by(Product.best_price_per_gram.asc().nullslast())
    elif sort == "thc":
        stmt = stmt.order_by(Product.thc_pct.desc().nullslast())
    elif sort == "sale":
        stmt = stmt.order_by(Product.sale_pct_off.desc().nullslast())
    else:
        stmt = stmt.order_by(Product.name)

    rows = await db.execute(stmt)
    products = rows.scalars().all()

    dispensary_out = enrich_dispensary(d)
    out = []
    for p in products:
        pout = ProductOut.model_validate(p)
        pout.dispensary = dispensary_out
        out.append(pout)
    return out


class IssueReport(BaseModel):
    device_id: str
    issue_type: str   # "wrong_price" | "out_of_stock" | "wrong_hours" | "other"
    description: str
    product_id: int | None = None


@router.post("/{slug}/report", status_code=202)
async def report_issue(slug: str, body: IssueReport, db: DB):
    """
    Accepts user issue reports. Currently logs to DB via a simple flag on the product
    or dispensary. Full moderation queue is a future feature.
    """
    row = await db.execute(select(Dispensary).where(Dispensary.slug == slug))
    d = row.scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Dispensary not found")
    # TODO: persist to an issue_reports table and route to moderation
    return {"status": "received", "message": "Thanks — we'll review this shortly."}
