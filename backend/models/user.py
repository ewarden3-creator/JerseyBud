from sqlalchemy import String, Boolean, DateTime, Integer, ForeignKey, Date, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    clerk_user_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(200), index=True)

    # Founder flag — first 1000 accounts get locked-in pricing
    is_founder: Mapped[bool] = mapped_column(Boolean, default=False)
    founder_locked_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))

    # Anonymous device IDs this user has merged into their account
    merged_device_ids: Mapped[list | None] = mapped_column(JSONB)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    subscription: Mapped["Subscription | None"] = relationship(back_populates="user", uselist=False)
    reviews: Mapped[list["Review"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    credits: Mapped[list["Credit"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    taste_profile: Mapped["TasteProfile | None"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)

    tier: Mapped[str] = mapped_column(String(20), default="free")           # free | pro
    billing_interval: Mapped[str | None] = mapped_column(String(10))       # monthly | annual
    is_founder_pricing: Mapped[bool] = mapped_column(Boolean, default=False)

    stripe_customer_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    status: Mapped[str] = mapped_column(String(30), default="inactive")     # active | trialing | past_due | canceled | inactive
    current_period_end: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    trial_end: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="subscription")


class Review(Base):
    """User reviews of specific products or strains. Drives credits + taste profile."""
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    # Either tied to a specific product OR to a strain name (cross-batch review)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), index=True)
    strain_name: Mapped[str | None] = mapped_column(String(200), index=True)

    rating: Mapped[int] = mapped_column(Integer)   # 1-5
    body: Mapped[str | None] = mapped_column(String(2000))

    # Structured taste signals — feeds the recommender
    effects_felt: Mapped[list | None] = mapped_column(JSONB)        # ["relaxed", "creative"]
    terps_noted: Mapped[list | None] = mapped_column(JSONB)         # ["citrus", "gas", "pine"]
    would_buy_again: Mapped[bool | None] = mapped_column(Boolean)

    # Moderation
    status: Mapped[str] = mapped_column(String(20), default="published")    # published | pending | rejected
    is_credit_eligible: Mapped[bool] = mapped_column(Boolean, default=False)
    credit_awarded: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="reviews")


class Credit(Base):
    """Ledger of credits earned (reviews, referrals) and applied (free months)."""
    __tablename__ = "credits"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    amount_cents: Mapped[int] = mapped_column(Integer)       # positive = earned, negative = redeemed
    source: Mapped[str] = mapped_column(String(30))          # review | referral | admin | redemption
    source_ref_id: Mapped[int | None] = mapped_column(Integer)   # e.g. review.id

    description: Mapped[str | None] = mapped_column(String(200))
    applied_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="credits")


class TasteProfile(Base):
    """The learned taste vector — Pro tier's secret sauce."""
    __tablename__ = "taste_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)

    # Terpene affinities — {"myrcene": 0.8, "limonene": 0.4, "linalool": 0.6, ...}
    # Recomputed nightly from review history
    terpene_affinities: Mapped[dict | None] = mapped_column(JSONB)

    # Effect preferences — {"relaxed": 0.9, "creative": 0.5, "sleepy": 0.7, ...}
    effect_affinities: Mapped[dict | None] = mapped_column(JSONB)

    # Type preferences — {"sativa": 0.3, "indica": 0.7, "hybrid": 0.5}
    type_affinity: Mapped[dict | None] = mapped_column(JSONB)

    # Cohort — "kush" | "haze" | "cookies" | "diesel" | "purple" | "fruit" | "cbd"
    cohort: Mapped[str | None] = mapped_column(String(30), index=True)
    cohort_confidence: Mapped[float | None] = mapped_column()

    # Budget hint inferred from purchase history
    typical_eighth_budget: Mapped[int | None] = mapped_column(Integer)

    review_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="taste_profile")
