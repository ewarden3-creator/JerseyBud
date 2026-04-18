from sqlalchemy import String, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base


class Favorite(Base):
    """
    Anonymous favorites scoped to device_id.
    favorite_type: "product" | "strain" | "dispensary"
    Only one of product_id / strain_name / dispensary_id will be set.
    """
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("device_id", "product_id"),
        UniqueConstraint("device_id", "strain_name"),
        UniqueConstraint("device_id", "dispensary_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[str | None] = mapped_column(String(64), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    favorite_type: Mapped[str] = mapped_column(String(20))  # product | strain | dispensary

    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"))
    strain_name: Mapped[str | None] = mapped_column(String(200))
    dispensary_id: Mapped[int | None] = mapped_column(ForeignKey("dispensaries.id"))

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped["Product | None"] = relationship()
    dispensary: Mapped["Dispensary | None"] = relationship()
