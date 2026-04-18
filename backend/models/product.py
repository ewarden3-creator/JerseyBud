from sqlalchemy import String, Float, Boolean, DateTime, Date, ForeignKey, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB as JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    dispensary_id: Mapped[int] = mapped_column(ForeignKey("dispensaries.id"), index=True)
    source_id: Mapped[str] = mapped_column(String(100), index=True)

    # Identity
    name: Mapped[str] = mapped_column(String(300))
    brand: Mapped[str | None] = mapped_column(String(200))
    strain_name: Mapped[str | None] = mapped_column(String(200), index=True)
    category: Mapped[str] = mapped_column(String(80))
    subcategory: Mapped[str | None] = mapped_column(String(80))
    product_type: Mapped[str | None] = mapped_column(String(40))  # sativa | indica | hybrid

    # Potency
    thc_pct: Mapped[float | None] = mapped_column(Float)
    cbd_pct: Mapped[float | None] = mapped_column(Float)

    # Minor cannabinoids — {"cbn": 0.1, "cbg": 0.4, "cbc": 0.05, "thca": 24.1, ...}
    cannabinoids: Mapped[dict | None] = mapped_column(JSON)

    # Terpenes — {"myrcene": 0.42, "limonene": 0.31, ...}
    terpenes: Mapped[dict | None] = mapped_column(JSON)
    total_terpenes_pct: Mapped[float | None] = mapped_column(Float)

    # Effects — ["relaxed", "happy", "creative"]
    effects: Mapped[list | None] = mapped_column(JSON)

    # Lab / batch metadata
    batch_id: Mapped[str | None] = mapped_column(String(100))
    harvest_date: Mapped[Date | None] = mapped_column(Date)

    # Pricing — [{"weight": "3.5g", "price": 40.0, "original_price": 50.0, "price_per_gram": 11.43}, ...]
    pricing: Mapped[list | None] = mapped_column(JSON)

    # Deal flags
    is_on_sale: Mapped[bool] = mapped_column(Boolean, default=False)
    sale_pct_off: Mapped[float | None] = mapped_column(Float)

    # Value scoring — best price-per-gram across all weight tiers
    best_price_per_gram: Mapped[float | None] = mapped_column(Float, index=True)

    image_url: Mapped[str | None] = mapped_column(String(500))
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True)

    scraped_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    dispensary: Mapped["Dispensary"] = relationship(back_populates="products")
    price_history: Mapped[list["PriceHistory"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    lab_history: Mapped[list["LabHistory"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )


class PriceHistory(Base):
    """Snapshot of pricing on each scrape — powers price trend charts."""
    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    # Full pricing array at time of snapshot
    pricing: Mapped[list] = mapped_column(JSON)
    is_on_sale: Mapped[bool] = mapped_column(Boolean, default=False)
    sale_pct_off: Mapped[float | None] = mapped_column(Float)
    best_price_per_gram: Mapped[float | None] = mapped_column(Float)
    recorded_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    product: Mapped["Product"] = relationship(back_populates="price_history")


class LabHistory(Base):
    """Previous batch lab data — terpenes/cannabinoids per batch_id."""
    __tablename__ = "lab_history"
    __table_args__ = (UniqueConstraint("product_id", "batch_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    batch_id: Mapped[str] = mapped_column(String(100))
    thc_pct: Mapped[float | None] = mapped_column(Float)
    cbd_pct: Mapped[float | None] = mapped_column(Float)
    cannabinoids: Mapped[dict | None] = mapped_column(JSON)
    terpenes: Mapped[dict | None] = mapped_column(JSON)
    total_terpenes_pct: Mapped[float | None] = mapped_column(Float)
    harvest_date: Mapped[Date | None] = mapped_column(Date)
    recorded_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped["Product"] = relationship(back_populates="lab_history")
