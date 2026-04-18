from sqlalchemy import String, Float, Boolean, Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from models.base import Base


class ShoppingListItem(Base):
    """One item in a user's shopping list. List-level state lives implicitly."""
    __tablename__ = "shopping_list_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", "weight"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    device_id: Mapped[str | None] = mapped_column(String(64), index=True)

    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    weight: Mapped[str] = mapped_column(String(20))           # which tier (1g, 3.5g, etc)
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    # Pricing snapshot at time of add — used to compute savings
    price_at_add: Mapped[float | None] = mapped_column(Float)
    target_price: Mapped[float | None] = mapped_column(Float)  # optional buy-when threshold

    notes: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TasteJudgment(Base):
    """
    Lightweight thumbs up/down on products, strains, or brands.
    Faster than full reviews — designed for one-tap signal capture.
    Drives "you didn't like this last time" warnings throughout the UI.
    """
    __tablename__ = "taste_judgments"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id"),
        UniqueConstraint("user_id", "strain_name"),
        UniqueConstraint("user_id", "brand_name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    device_id: Mapped[str | None] = mapped_column(String(64), index=True)

    # One of these scopes the judgment
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"))
    strain_name: Mapped[str | None] = mapped_column(String(200), index=True)
    brand_name: Mapped[str | None] = mapped_column(String(200), index=True)

    verdict: Mapped[str] = mapped_column(String(20))    # loved | liked | neutral | disliked | avoid
    note: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PricePrediction(Base):
    """
    Per-product 'buy now or wait' prediction, computed nightly from PriceHistory.
    Simple-stats v1 — sets us up for an ML model later without changing the API.
    """
    __tablename__ = "price_predictions"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), unique=True, index=True)

    current_price: Mapped[float | None] = mapped_column(Float)
    historical_low: Mapped[float | None] = mapped_column(Float)
    historical_median: Mapped[float | None] = mapped_column(Float)
    z_score: Mapped[float | None] = mapped_column(Float)         # how far below/above median
    sale_frequency: Mapped[float | None] = mapped_column(Float)  # share of days product was on sale

    # Verdict + supporting context
    recommendation: Mapped[str] = mapped_column(String(30))     # buy_now | wait | neutral
    confidence: Mapped[float] = mapped_column(Float)            # 0-1
    reasoning: Mapped[str | None] = mapped_column(String(300))  # human-readable explanation

    days_since_last_sale: Mapped[int | None] = mapped_column(Integer)
    expected_sale_in_days: Mapped[int | None] = mapped_column(Integer)

    computed_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
