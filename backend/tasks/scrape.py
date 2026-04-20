"""
Celery tasks for scheduled menu scraping.
Beat schedule: runs every SCRAPE_INTERVAL_MINUTES minutes.
After each dispensary scrape:
  - Upserts products (with enriched pricing + cannabinoids)
  - Writes a price history snapshot if pricing changed
  - Archives new batch lab data to lab_history
  - Checks price/stock alerts and triggers notifications
"""

import asyncio
from datetime import datetime, timezone
from celery import Celery
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from core.config import settings
from models.base import AsyncSessionLocal
from models.dispensary import Dispensary
from models.product import Product, PriceHistory, LabHistory
from models.alert import Alert
from scrapers.normalizer import normalize_product
import scrapers.dutchie as dutchie
import scrapers.iheartjane as iheartjane

app = Celery("njcanna", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

app.conf.beat_schedule = {
    "scrape-all-menus": {
        "task": "tasks.scrape.scrape_all",
        "schedule": settings.SCRAPE_INTERVAL_MINUTES * 60,
    },
    "learn-deal-patterns": {
        "task": "tasks.learn_deal_patterns.learn_all_patterns",
        "schedule": 24 * 60 * 60,  # nightly
    },
    "compute-price-predictions": {
        "task": "tasks.predict_prices.compute_all_predictions",
        "schedule": 6 * 60 * 60,   # every 6 hours, after pattern learning
    },
}


@app.task(bind=True, max_retries=2)
def scrape_all(self):
    asyncio.run(_scrape_all())


@app.task(bind=True, max_retries=3)
def scrape_dispensary(self, dispensary_id: int, source: str, source_id: str, slug: str):
    asyncio.run(_scrape_dispensary(dispensary_id, source, source_id, slug))


async def _scrape_all():
    async with AsyncSessionLocal() as db:
        rows = await db.execute(select(Dispensary).where(Dispensary.is_active == True))
        dispensaries = rows.scalars().all()

    if not dispensaries:
        await _seed_dispensaries()
        async with AsyncSessionLocal() as db:
            rows = await db.execute(select(Dispensary).where(Dispensary.is_active == True))
            dispensaries = rows.scalars().all()

    for d in dispensaries:
        scrape_dispensary.delay(d.id, d.source, d.source_id, d.slug)


async def _seed_dispensaries():
    # Dutchie is the primary source; iHJ is best-effort (frequently 403's us)
    try:
        dutchie_disps = await dutchie.fetch_nj_dispensaries()
        print(f"[seed] Dutchie returned {len(dutchie_disps)} dispensaries")
    except Exception as e:
        print(f"[seed] Dutchie scrape failed: {type(e).__name__}: {e}")
        dutchie_disps = []
    try:
        ihj_disps = await iheartjane.fetch_nj_dispensaries()
        print(f"[seed] iHJ returned {len(ihj_disps)} dispensaries")
    except Exception as e:
        print(f"[seed] iHJ scrape failed (expected for now): {type(e).__name__}: {e}")
        ihj_disps = []

    async with AsyncSessionLocal() as db:
        for nd in dutchie_disps + ihj_disps:
            values = dict(
                slug=nd.slug,
                name=nd.name,
                address=nd.address,
                city=nd.city,
                zip_code=nd.zip_code,
                lat=nd.lat,
                lng=nd.lng,
                phone=nd.phone,
                website=nd.website,
                logo_url=nd.logo_url,
                nj_license_number=nd.nj_license_number,
                nj_license_url=nd.nj_license_url,
                opening_year=nd.opening_year,
                medical=nd.medical,
                recreational=nd.recreational,
                wheelchair_accessible=nd.wheelchair_accessible,
                delivery=nd.delivery,
                curbside_pickup=nd.curbside_pickup,
                atm=nd.atm,
                hours=nd.hours,
                source=nd.source,
                source_id=nd.source_id,
                is_active=True,
            )
            stmt = pg_insert(Dispensary).values(**values).on_conflict_do_update(
                index_elements=["slug"],
                set_={k: v for k, v in values.items() if k != "slug"},
            )
            await db.execute(stmt)
        await db.commit()


async def _scrape_dispensary(dispensary_id: int, source: str, source_id: str, slug: str):
    if source == "dutchie":
        raw_slug = slug.removeprefix("dutchie-")
        products = await dutchie.fetch_menu(raw_slug)
    else:
        products = await iheartjane.fetch_menu(source_id)

    if not products:
        return

    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        for np in products:
            data = normalize_product(np)
            data["dispensary_id"] = dispensary_id

            # Fetch existing product to detect pricing/lab changes
            existing_row = await db.execute(
                select(Product).where(Product.source_id == np.source_id)
            )
            existing = existing_row.scalar_one_or_none()

            # Upsert product
            stmt = pg_insert(Product).values(**data).on_conflict_do_update(
                index_elements=["source_id"],
                set_={k: v for k, v in data.items() if k != "source_id"},
            ).returning(Product.id)
            result = await db.execute(stmt)
            product_id = result.scalar_one()

            # Write price history snapshot if pricing changed
            pricing_changed = (
                existing is None
                or existing.pricing != data.get("pricing")
                or existing.is_on_sale != data.get("is_on_sale")
            )
            if pricing_changed and data.get("pricing"):
                await db.execute(
                    pg_insert(PriceHistory).values(
                        product_id=product_id,
                        pricing=data["pricing"],
                        is_on_sale=data.get("is_on_sale", False),
                        sale_pct_off=data.get("sale_pct_off"),
                        best_price_per_gram=data.get("best_price_per_gram"),
                        recorded_at=now,
                    ).on_conflict_do_nothing()
                )

            # Archive lab data when a new batch_id appears
            batch_id = data.get("batch_id")
            if batch_id and data.get("terpenes"):
                await db.execute(
                    pg_insert(LabHistory).values(
                        product_id=product_id,
                        batch_id=batch_id,
                        thc_pct=data.get("thc_pct"),
                        cbd_pct=data.get("cbd_pct"),
                        cannabinoids=data.get("cannabinoids"),
                        terpenes=data.get("terpenes"),
                        total_terpenes_pct=data.get("total_terpenes_pct"),
                        harvest_date=data.get("harvest_date"),
                        recorded_at=now,
                    ).on_conflict_do_nothing()
                )

            # Check alerts for this product
            if pricing_changed:
                await _check_alerts(db, product_id, np.strain_name, data, now)

        await db.execute(
            Dispensary.__table__.update()
            .where(Dispensary.id == dispensary_id)
            .values(last_scraped_at=now)
        )
        await db.commit()


async def _check_alerts(db, product_id: int, strain_name: str | None, data: dict, now: datetime):
    """
    Fire any matching alerts for this product update.
    Covers: price_threshold, back_in_stock, new_drop (strain-level).
    """
    pricing = data.get("pricing") or []
    in_stock = data.get("in_stock", False)

    # Fetch alerts scoped to this product or its strain name
    conditions = [Alert.product_id == product_id, Alert.is_active == True]
    if strain_name:
        conditions = [
            Alert.is_active == True,
            (Alert.product_id == product_id) | (Alert.strain_name == strain_name),
        ]

    rows = await db.execute(select(Alert).where(*conditions))
    alerts = rows.scalars().all()

    for alert in alerts:
        triggered = False

        if alert.alert_type == "price_threshold" and alert.threshold_price and pricing:
            target_weight = alert.target_weight
            relevant = [
                e for e in pricing
                if not target_weight or e.get("weight") == target_weight
            ]
            if any(e["price"] <= alert.threshold_price for e in relevant):
                triggered = True

        elif alert.alert_type == "back_in_stock" and in_stock:
            triggered = True

        elif alert.alert_type == "new_drop" and strain_name == alert.strain_name and in_stock:
            triggered = True

        if triggered:
            # Mark triggered — actual push delivery handled by notification worker
            await db.execute(
                Alert.__table__.update()
                .where(Alert.id == alert.id)
                .values(last_triggered_at=now)
            )
            # Enqueue push notification task
            send_alert_notification.delay(alert.id, product_id, alert.alert_type)


@app.task
def send_alert_notification(alert_id: int, product_id: int, alert_type: str):
    """
    Stub for push notification delivery.
    Wire up FCM / APNs / Web Push here.
    Alert is already marked triggered; this task handles the actual send.
    """
    pass
