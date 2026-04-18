from sqlalchemy import String, Float, Boolean, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from models.base import Base


class Dispensary(Base):
    __tablename__ = "dispensaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str] = mapped_column(String(400))
    city: Mapped[str] = mapped_column(String(100))
    zip_code: Mapped[str] = mapped_column(String(10))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    phone: Mapped[str | None] = mapped_column(String(20))
    website: Mapped[str | None] = mapped_column(String(300))
    logo_url: Mapped[str | None] = mapped_column(String(500))

    # NJ regulatory info
    nj_license_number: Mapped[str | None] = mapped_column(String(50))   # e.g. RE000165
    nj_license_url: Mapped[str | None] = mapped_column(String(300))     # CRC state website link
    opening_year: Mapped[int | None] = mapped_column(Integer)
    medical: Mapped[bool] = mapped_column(Boolean, default=False)
    recreational: Mapped[bool] = mapped_column(Boolean, default=True)

    # Amenities
    wheelchair_accessible: Mapped[bool | None] = mapped_column(Boolean)
    delivery: Mapped[bool | None] = mapped_column(Boolean)
    curbside_pickup: Mapped[bool | None] = mapped_column(Boolean)
    atm: Mapped[bool | None] = mapped_column(Boolean)

    # Hours — {"mon": "10 AM - 8 PM", "tue": "10 AM - 8 PM", ..., "sun": "10 AM - 7 PM"}
    # null = unknown, empty string = closed that day
    hours: Mapped[dict | None] = mapped_column(JSONB)

    source: Mapped[str] = mapped_column(String(20))   # "dutchie" | "iheartjane"
    source_id: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_scraped_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    products: Mapped[list["Product"]] = relationship(back_populates="dispensary", cascade="all, delete-orphan")
