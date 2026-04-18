from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/njcanna"
    REDIS_URL: str = "redis://localhost:6379/0"
    ANTHROPIC_API_KEY: str = ""
    SCRAPE_INTERVAL_MINUTES: int = 30

    # Auth (Clerk)
    CLERK_ISSUER: str = "https://example.clerk.accounts.dev"
    CLERK_WEBHOOK_SECRET: str = ""

    # Billing (Stripe)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_MONTHLY: str = ""           # $6.99/mo
    STRIPE_PRICE_ANNUAL: str = ""            # $49.99/yr
    STRIPE_PRICE_MONTHLY_FOUNDER: str = ""   # $3.99/mo locked
    STRIPE_PRICE_ANNUAL_FOUNDER: str = ""    # $34.99/yr locked

    # Founder pricing — first N users get locked-in pricing forever
    FOUNDER_LIMIT: int = 1000

    # Reviews → credits
    REVIEWS_PER_FREE_MONTH: int = 4

    # CORS — comma-separated list of allowed frontend origins
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
