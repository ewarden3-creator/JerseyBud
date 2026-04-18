"""
Nightly job: compute per-product price predictions from PriceHistory.

Simple-stats v1 — interpretable, no training data needed. Sets up the API
contract so we can swap in an ML model later without changing the frontend.

Heuristics:
  - Z-score: how far below/above the historical median is the current price?
  - Sale frequency: what fraction of recorded days has the product been on sale?
  - Time since last sale: helps spot products "due" for a discount

Recommendation logic:
  buy_now    if z_score <= -0.7 (current price is well below median)
             OR (is_on_sale AND sale_pct_off >= 25)
  wait       if z_score >= 0.5 (above median)
             AND sale_frequency >= 0.15  (product sees regular sales)
             AND days_since_last_sale >= mean_sale_interval * 0.7
  neutral    otherwise
"""

import asyncio
import statistics
from datetime import datetime, timezone
from celery import shared_task
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from models.base import AsyncSessionLocal
from models.product import Product, PriceHistory
from models.shopping import PricePrediction


@shared_task(bind=True)
def compute_all_predictions(self):
    asyncio.run(_compute_all())


async def _compute_all():
    async with AsyncSessionLocal() as db:
        rows = await db.execute(select(Product).where(Product.in_stock == True))
        products = rows.scalars().all()

        for p in products:
            await _compute_for(p, db)
        await db.commit()


async def _compute_for(product: Product, db):
    history_rows = await db.execute(
        select(PriceHistory)
        .where(PriceHistory.product_id == product.id)
        .order_by(PriceHistory.recorded_at.asc())
    )
    history = history_rows.scalars().all()

    if len(history) < 3:
        return  # not enough data

    # Use eighth (3.5g) prices as the canonical signal — fall back to first variant
    def price_for(h: PriceHistory) -> float | None:
        for entry in (h.pricing or []):
            if entry.get("weight") == "3.5g":
                return entry["price"]
        return h.pricing[0]["price"] if h.pricing else None

    series = [(h.recorded_at, price_for(h), h.is_on_sale) for h in history]
    prices = [p for _, p, _ in series if p is not None]
    if len(prices) < 3:
        return

    current = prices[-1]
    median = statistics.median(prices)
    low = min(prices)
    stdev = statistics.pstdev(prices) or 1
    z = (current - median) / stdev

    sale_count = sum(1 for _, _, on_sale in series if on_sale)
    sale_freq = sale_count / len(series)

    # Days since last sale
    last_sale_idx = next((i for i in range(len(series) - 1, -1, -1) if series[i][2]), None)
    days_since_sale = None
    if last_sale_idx is not None:
        last_sale_date = series[last_sale_idx][0]
        if last_sale_date.tzinfo is None:
            last_sale_date = last_sale_date.replace(tzinfo=timezone.utc)
        days_since_sale = (datetime.now(timezone.utc) - last_sale_date).days

    # Mean sale interval — how often does it usually go on sale?
    sale_dates = [series[i][0] for i in range(len(series)) if series[i][2]]
    if len(sale_dates) >= 2:
        intervals = [(sale_dates[i + 1] - sale_dates[i]).days for i in range(len(sale_dates) - 1)]
        mean_interval = sum(intervals) / len(intervals)
        expected_in_days = max(0, int(mean_interval) - (days_since_sale or 0))
    else:
        mean_interval = None
        expected_in_days = None

    # Decide recommendation
    if (z <= -0.7) or (product.is_on_sale and (product.sale_pct_off or 0) >= 25):
        rec = "buy_now"
        confidence = min(1.0, abs(z) / 1.5) if z <= -0.7 else 0.85
        reasoning = (
            f"At ${current:.0f}, this is well below the typical ${median:.0f} median "
            f"(low ${low:.0f}). Strong buy signal."
        )
    elif (
        z >= 0.5 and sale_freq >= 0.15
        and mean_interval is not None and days_since_sale is not None
        and days_since_sale >= mean_interval * 0.7
    ):
        rec = "wait"
        confidence = min(1.0, sale_freq * 2)
        reasoning = (
            f"This product goes on sale every ~{int(mean_interval)} days on average and "
            f"hasn't dropped in {days_since_sale}. A sale is likely soon."
        )
    elif sale_freq < 0.05 and z >= 0:
        rec = "neutral"
        confidence = 0.6
        reasoning = "Rarely goes on sale. Price is stable — buy when convenient."
    else:
        rec = "neutral"
        confidence = 0.5
        reasoning = f"Price is near the typical ${median:.0f} median. No strong signal either way."

    stmt = pg_insert(PricePrediction).values(
        product_id=product.id,
        current_price=current,
        historical_low=low,
        historical_median=median,
        z_score=round(z, 3),
        sale_frequency=round(sale_freq, 3),
        recommendation=rec,
        confidence=round(confidence, 2),
        reasoning=reasoning,
        days_since_last_sale=days_since_sale,
        expected_sale_in_days=expected_in_days,
        computed_at=datetime.now(timezone.utc),
    ).on_conflict_do_update(
        index_elements=["product_id"],
        set_={
            "current_price": current, "historical_low": low, "historical_median": median,
            "z_score": round(z, 3), "sale_frequency": round(sale_freq, 3),
            "recommendation": rec, "confidence": round(confidence, 2),
            "reasoning": reasoning, "days_since_last_sale": days_since_sale,
            "expected_sale_in_days": expected_in_days,
            "computed_at": datetime.now(timezone.utc),
        },
    )
    await db.execute(stmt)
