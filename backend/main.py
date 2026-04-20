from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from models.base import engine, Base
import models.dispensary  # noqa: registers models
import models.product     # noqa: registers models
import models.alert       # noqa: registers models
import models.favorite    # noqa: registers models
import models.user        # noqa: registers models
import models.shopping    # noqa: registers models
import models.deal_pattern  # noqa: registers DispensaryDealPattern
from api.routes import (
    dispensaries, products, deals, trends, recommend,
    alerts, favorites, meta, accounts, billing, reviews, brands,
    shopping_list, taste,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Don't crash startup if DB isn't configured yet — health checks can still pass.
    # Run init via `python cli.py init-db` once env vars are set.
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"[startup] DB init skipped: {type(e).__name__}: {e}")
    yield


app = FastAPI(title="NJ Canna API", version="0.1.0", lifespan=lifespan)

from core.config import settings as _settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dispensaries.router)
app.include_router(products.router)
app.include_router(deals.router)
app.include_router(trends.router)
app.include_router(recommend.router)
app.include_router(alerts.router)
app.include_router(favorites.router)
app.include_router(meta.router)
app.include_router(accounts.router)
app.include_router(billing.router)
app.include_router(reviews.router)
app.include_router(brands.router)
app.include_router(shopping_list.router)
app.include_router(taste.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
