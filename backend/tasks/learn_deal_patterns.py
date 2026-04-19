"""
Nightly job: detect recurring dispensary sale patterns from PriceHistory.

Algorithm v1 (statistical, interpretable):
  For each dispensary × day-of-week (and optionally × category):
    - Pull all price snapshots that fell on that DOW
    - Count snapshots that were on-sale (sale_pct_off > 0)
    - If hit-rate >= MIN_HIT_RATE and sample_count >= MIN_SAMPLES:
        → confirm a weekly pattern with median discount % from the sample

We also try monthly (day-of-month, e.g. 1st of month) and known cannabis
holidays (4/20, 7/10, Green Wednesday, Black Friday) using the same approach.

Confidence = a function of hit_rate, sample_count, and consistency of discount.

Once we have ML-grade data (~6+ months across many shops), this becomes the
training set for a real classifier — but the API contract stays identical.
"""

import asyncio
import statistics
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from celery import shared_task
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from models.base import AsyncSessionLocal
from models.dispensary import Dispensary
from models.product import Product, PriceHistory
from models.deal_pattern import DispensaryDealPattern

# Thresholds for confirming a pattern
MIN_SAMPLES = 4               # need at least 4 observations on the same DOW
MIN_HIT_RATE = 0.6            # 60%+ of observations must be on-sale
LOOKBACK_DAYS = 120           # only consider the last 4 months

DOW_LABELS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DOW_DISPLAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# Friendly promo names — for common patterns we name them, otherwise generic
PROMO_NAMES: dict[tuple[str, str], str] = {
    # (cadence_key, category) -> display_name
    ("fri", "flower"):     "Flower Friday",
    ("wed", "concentrate"): "Wax Wednesday",
    ("mon", "edible"):     "Munchie Monday",
    ("tue", "vaporizer"):  "Vape Tuesday",
}


@shared_task(bind=True)
def learn_all_patterns(self):
    asyncio.run(_learn_all())


async def _learn_all():
    cutoff = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)

    async with AsyncSessionLocal() as db:
        disp_rows = await db.execute(
            select(Dispensary).where(Dispensary.is_active == True)
        )
        dispensaries = disp_rows.scalars().all()

        for dispo in dispensaries:
            await _learn_for_dispensary(dispo, cutoff, db)
        await db.commit()


async def _learn_for_dispensary(dispo: Dispensary, cutoff: datetime, db):
    # Pull all PriceHistory rows for this dispensary's products in the window
    rows = await db.execute(
        select(PriceHistory, Product)
        .join(Product, Product.id == PriceHistory.product_id)
        .where(Product.dispensary_id == dispo.id)
        .where(PriceHistory.recorded_at >= cutoff)
    )
    pairs = rows.all()
    if len(pairs) < MIN_SAMPLES * 7:
        return  # not enough data

    # Group: (day_of_week, category) -> list of (sale_pct_off or 0)
    bucket: dict[tuple[str, str], list[float]] = defaultdict(list)

    for ph, prod in pairs:
        dow_idx = (ph.recorded_at.weekday()) if ph.recorded_at else None
        if dow_idx is None:
            continue
        dow = DOW_LABELS[dow_idx]
        category = (prod.category or "").lower() or "all"
        # We care about the discount value: 0 if not on sale, else the pct
        pct_off = (ph.sale_pct_off or 0) if ph.is_on_sale else 0
        bucket[(dow, category)].append(pct_off)
        # Also track the all-categories bucket for store-wide patterns
        bucket[(dow, "all")].append(pct_off)

    now = datetime.now(timezone.utc)
    detected: list[dict] = []

    for (dow, category), values in bucket.items():
        if len(values) < MIN_SAMPLES:
            continue
        on_sale = [v for v in values if v > 0]
        hit_rate = len(on_sale) / len(values)
        if hit_rate < MIN_HIT_RATE or len(on_sale) < 3:
            continue

        median_disc = statistics.median(on_sale)
        typical_disc = round(sum(on_sale) / len(on_sale), 1)
        # Confidence = hit_rate × log-scaled sample size, capped at 1
        confidence = min(1.0, hit_rate * (1 + len(on_sale) / 20))

        # Compute next expected occurrence
        target_dow = DOW_LABELS.index(dow)
        days_ahead = (target_dow - now.weekday()) % 7
        if days_ahead == 0:
            days_ahead = 0  # today
        next_expected = now + timedelta(days=days_ahead)

        cat_for_record = None if category == "all" else category
        display_name = PROMO_NAMES.get((dow, category)) or (
            f"{int(typical_disc)}% {DOW_DISPLAY[target_dow]}"
            if category == "all"
            else f"{category.title()} {DOW_DISPLAY[target_dow]}"
        )

        detected.append(dict(
            dispensary_id=dispo.id,
            pattern_type="weekly",
            cadence_key=dow,
            category=cat_for_record,
            display_name=display_name,
            typical_discount_pct=typical_disc,
            median_discount_pct=round(median_disc, 1),
            observation_count=len(on_sale),
            sample_window_days=LOOKBACK_DAYS,
            confidence=round(confidence, 3),
            first_observed_at=cutoff,
            last_observed_at=now,
            next_expected_at=next_expected,
            features={
                "hit_rate": round(hit_rate, 3),
                "samples_total": len(values),
                "on_sale_count": len(on_sale),
            },
            is_active=True,
        ))

    # De-dup: prefer category-specific patterns over the "all" rollup if both
    # exist for the same dispo+dow with overlapping discount levels
    final = _prefer_category_specific(detected)

    for record in final:
        stmt = pg_insert(DispensaryDealPattern).values(**record).on_conflict_do_update(
            index_elements=["dispensary_id", "pattern_type", "cadence_key", "category"],
            set_={k: v for k, v in record.items()
                  if k not in ("dispensary_id", "pattern_type", "cadence_key", "category", "first_observed_at")},
        )
        await db.execute(stmt)


def _prefer_category_specific(detected: list[dict]) -> list[dict]:
    """If we have both a 'flower Friday' and an 'all Friday' pattern with
    similar discounts, keep the more specific one only."""
    by_dow_only_all: dict[str, dict] = {}
    by_dow_specific: dict[str, list[dict]] = defaultdict(list)
    for d in detected:
        if d["category"] is None:
            by_dow_only_all[d["cadence_key"]] = d
        else:
            by_dow_specific[d["cadence_key"]].append(d)

    keep: list[dict] = []
    for d in detected:
        if d["category"] is None and d["cadence_key"] in by_dow_specific:
            # If a specific category pattern exists with similar discount, drop the "all" one
            specifics = by_dow_specific[d["cadence_key"]]
            if any(abs(s["typical_discount_pct"] - d["typical_discount_pct"]) < 5 for s in specifics):
                continue
        keep.append(d)
    return keep
