"""
One-shot CLI for ops tasks. Run inside the API container:

  python cli.py seed       # populate dispensaries (first deploy)
  python cli.py scrape     # scrape menus for every dispensary
  python cli.py scrape-one <dispensary-slug>
  python cli.py predict    # recompute price predictions
"""

import sys
import asyncio
from sqlalchemy import select

from models.base import AsyncSessionLocal, engine, Base
import models.dispensary  # noqa
import models.product     # noqa
import models.alert       # noqa
import models.favorite    # noqa
import models.user        # noqa
import models.shopping    # noqa
import models.deal_pattern  # noqa

from models.dispensary import Dispensary


async def cmd_init_db():
    """Create all tables (only needed once on first deploy)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ Tables created")


async def cmd_seed():
    """Discover and upsert NJ dispensaries from Dutchie."""
    from tasks.scrape import _seed_dispensaries
    await _seed_dispensaries()
    async with AsyncSessionLocal() as db:
        rows = await db.execute(select(Dispensary).where(Dispensary.is_active == True))
        count = len(rows.scalars().all())
    print(f"✓ Seeded — {count} dispensaries in DB")


async def cmd_scrape_all():
    """Scrape menus for every active dispensary."""
    from tasks.scrape import _scrape_dispensary
    async with AsyncSessionLocal() as db:
        rows = await db.execute(select(Dispensary).where(Dispensary.is_active == True))
        dispensaries = rows.scalars().all()
    print(f"Scraping {len(dispensaries)} dispensaries…")
    for i, d in enumerate(dispensaries):
        print(f"  [{i+1}/{len(dispensaries)}] {d.name}")
        try:
            await _scrape_dispensary(d.id, d.source, d.source_id, d.slug)
        except Exception as e:
            print(f"    ✗ {type(e).__name__}: {e}")


async def cmd_scrape_one(slug: str):
    from tasks.scrape import _scrape_dispensary
    async with AsyncSessionLocal() as db:
        rows = await db.execute(select(Dispensary).where(Dispensary.slug == slug))
        d = rows.scalar_one_or_none()
    if not d:
        print(f"✗ No dispensary with slug={slug!r}")
        return
    print(f"Scraping {d.name}…")
    await _scrape_dispensary(d.id, d.source, d.source_id, d.slug)
    print("✓ Done")


async def cmd_predict():
    from tasks.predict_prices import _compute_all
    await _compute_all()
    print("✓ Predictions computed")


async def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    cmd = sys.argv[1]
    handlers = {
        "init-db":     lambda: cmd_init_db(),
        "seed":        lambda: cmd_seed(),
        "scrape":      lambda: cmd_scrape_all(),
        "scrape-one":  lambda: cmd_scrape_one(sys.argv[2]),
        "predict":     lambda: cmd_predict(),
    }
    handler = handlers.get(cmd)
    if not handler:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)
    await handler()


if __name__ == "__main__":
    asyncio.run(main())
