from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base


class Alert(Base):
    """
    Anonymous price/stock alert scoped to a device_id (UUID generated client-side).
    alert_type: "price_threshold" | "back_in_stock" | "new_drop"
    For price_threshold: triggers when any pricing tier for the watched weight
    drops at or below threshold_price.
    For back_in_stock / new_drop: threshold_price is ignored.
    """
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    # One of these scopes the alert. Anonymous users use device_id; authed users use user_id.
    device_id: Mapped[str | None] = mapped_column(String(64), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)

    # Product-specific alert (optional — if null, watches by strain_name)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), index=True)
    strain_name: Mapped[str | None] = mapped_column(String(200))  # strain-level watch

    alert_type: Mapped[str] = mapped_column(String(30))  # price_threshold | back_in_stock | new_drop
    target_weight: Mapped[str | None] = mapped_column(String(20))  # "3.5g", "1g", etc.
    threshold_price: Mapped[float | None] = mapped_column(Float)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_triggered_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped["Product | None"] = relationship()
