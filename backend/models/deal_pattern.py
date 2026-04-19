from sqlalchemy import String, Float, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from models.base import Base


class DispensaryDealPattern(Base):
    """
    Learned recurring sale pattern at a dispensary — e.g. "Curaleaf does
    20% off all flower every Wednesday." Detected from PriceHistory by
    grouping observed discounts by (dispensary, day_of_week, category).

    These are deterministic signals (way better than per-product stats) and
    feed directly into the predictor: "This shop does Flower Friday — sale
    expected in 2 days at ~25% off."
    """
    __tablename__ = "dispensary_deal_patterns"
    __table_args__ = (
        # Each dispensary × pattern_type × cadence_key × category combo is unique
        UniqueConstraint("dispensary_id", "pattern_type", "cadence_key", "category"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    dispensary_id: Mapped[int] = mapped_column(ForeignKey("dispensaries.id"), index=True)

    # Pattern shape
    pattern_type: Mapped[str] = mapped_column(String(20))   # weekly | monthly | holiday
    # Cadence: for weekly = day-of-week (mon/tue/...), for monthly = day (1-31),
    # for holiday = an ISO date or holiday key (e.g. "4-20", "black-friday")
    cadence_key: Mapped[str] = mapped_column(String(20))

    # Optional category scope (e.g. "flower"). Null = applies to whole menu.
    category: Mapped[str | None] = mapped_column(String(40), default=None)

    # Promo name as we'd display it ("Flower Friday", "Wax Wednesday", "20% Tuesday")
    display_name: Mapped[str | None] = mapped_column(String(80))

    # The detected economics
    typical_discount_pct: Mapped[float] = mapped_column(Float)
    median_discount_pct: Mapped[float | None] = mapped_column(Float)

    # Observation evidence — drives confidence
    observation_count: Mapped[int] = mapped_column(Integer, default=0)
    sample_window_days: Mapped[int | None] = mapped_column(Integer)
    confidence: Mapped[float] = mapped_column(Float)        # 0-1

    # Timeline
    first_observed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    last_observed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    next_expected_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))

    # Raw feature payload for debugging / future ML
    features: Mapped[dict | None] = mapped_column(JSONB)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
