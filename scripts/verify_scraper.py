"""Verify the new production scraper end-to-end against real Dutchie."""

import asyncio
import sys
import os

# Allow importing from backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# Stub out dependencies the scraper imports but doesn't need for this test
import types
fake_normalizer = types.ModuleType("scrapers.normalizer")

from dataclasses import dataclass

@dataclass
class NormalizedDispensary:
    source: str
    source_id: str
    slug: str
    name: str
    address: str
    city: str
    zip_code: str
    lat: float = None
    lng: float = None
    phone: str = None
    website: str = None
    logo_url: str = None
    nj_license_number: str = None
    nj_license_url: str = None
    opening_year: int = None
    medical: bool = False
    recreational: bool = True
    wheelchair_accessible: bool = None
    delivery: bool = None
    curbside_pickup: bool = None
    atm: bool = None
    hours: dict = None

@dataclass
class NormalizedProduct:
    source_id: str
    name: str
    category: str
    is_on_sale: bool = False
    in_stock: bool = True
    brand: str = None
    strain_name: str = None
    subcategory: str = None
    product_type: str = None
    thc_pct: float = None
    cbd_pct: float = None
    cannabinoids: dict = None
    terpenes: dict = None
    total_terpenes_pct: float = None
    effects: list = None
    pricing: list = None
    sale_pct_off: float = None
    image_url: str = None
    batch_id: str = None
    harvest_date: object = None

fake_normalizer.NormalizedDispensary = NormalizedDispensary
fake_normalizer.NormalizedProduct = NormalizedProduct
sys.modules["scrapers.normalizer"] = fake_normalizer
sys.modules["scrapers"] = types.ModuleType("scrapers")

# Now import the production scraper
import importlib.util
spec = importlib.util.spec_from_file_location(
    "dutchie_scraper",
    os.path.join(os.path.dirname(__file__), "..", "backend", "scrapers", "dutchie.py"),
)
dutchie = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dutchie)


async def main():
    print("=== Calling fetch_nj_dispensaries() ===")
    disps = await dutchie.fetch_nj_dispensaries()
    print(f"  ✓ Found {len(disps)} NJ dispensaries\n")
    for d in disps[:8]:
        print(f"    • {d.name!r:50} | slug={d.slug!r:35}")
        print(f"        addr={d.address!r}, city={d.city!r}, lat={d.lat}, lng={d.lng}, phone={d.phone}")

    if not disps:
        print("  ✗ no dispensaries returned, abort")
        return

    target = disps[0]
    print(f"\n=== Calling fetch_menu({target.slug!r}) ===")
    products = await dutchie.fetch_menu(target.slug)
    print(f"  ✓ Got {len(products)} products from {target.name}\n")

    for p in products[:5]:
        print(f"    • {p.name!r:50}")
        print(f"        brand={p.brand}, category={p.category}, type={p.product_type}")
        print(f"        thc={p.thc_pct}, cbd={p.cbd_pct}, on_sale={p.is_on_sale}, sale_pct={p.sale_pct_off}")
        print(f"        pricing={p.pricing}")
        print(f"        image={p.image_url}")
        print()


if __name__ == "__main__":
    asyncio.run(main())
