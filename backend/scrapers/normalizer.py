from dataclasses import dataclass, field
from datetime import date

# Maps common weight strings to grams for price-per-gram calculation
WEIGHT_TO_GRAMS: dict[str, float] = {
    "0.5g": 0.5,
    "1g": 1.0,
    "1 gram": 1.0,
    "2g": 2.0,
    "2 gram": 2.0,
    "3.5g": 3.5,
    "3.5 gram": 3.5,
    "1/8 oz": 3.5432,
    "1/8oz": 3.5432,
    "eighth": 3.5432,
    "7g": 7.0,
    "7 gram": 7.0,
    "1/4 oz": 7.0865,
    "1/4oz": 7.0865,
    "quarter": 7.0865,
    "14g": 14.0,
    "14 gram": 14.0,
    "1/2 oz": 14.174,
    "1/2oz": 14.174,
    "half oz": 14.174,
    "28g": 28.0,
    "28 gram": 28.0,
    "1 oz": 28.3495,
    "1oz": 28.3495,
    "ounce": 28.3495,
    "oz": 28.3495,
}


def weight_to_grams(weight: str) -> float | None:
    return WEIGHT_TO_GRAMS.get(weight.strip().lower())


def enrich_pricing(pricing: list[dict]) -> list[dict]:
    """Add price_per_gram to each pricing tier."""
    enriched = []
    for entry in pricing:
        e = dict(entry)
        grams = weight_to_grams(e.get("weight", ""))
        if grams and grams > 0:
            e["grams"] = grams
            e["price_per_gram"] = round(e["price"] / grams, 2)
            if "original_price" in e:
                e["original_price_per_gram"] = round(e["original_price"] / grams, 2)
        enriched.append(e)
    return enriched


def best_price_per_gram(pricing: list[dict]) -> float | None:
    values = [e["price_per_gram"] for e in pricing if "price_per_gram" in e]
    return min(values) if values else None


@dataclass
class NormalizedDispensary:
    source: str          # "dutchie" | "iheartjane"
    source_id: str
    slug: str
    name: str
    address: str
    city: str
    zip_code: str
    lat: float | None = None
    lng: float | None = None
    phone: str | None = None
    website: str | None = None
    logo_url: str | None = None
    nj_license_number: str | None = None
    nj_license_url: str | None = None
    opening_year: int | None = None
    medical: bool = False
    recreational: bool = True
    wheelchair_accessible: bool | None = None
    delivery: bool | None = None
    curbside_pickup: bool | None = None
    atm: bool | None = None
    hours: dict | None = None  # {"mon": "10 AM - 8 PM", ...}


@dataclass
class NormalizedProduct:
    source_id: str
    name: str
    category: str
    is_on_sale: bool = False
    in_stock: bool = True
    brand: str | None = None
    strain_name: str | None = None
    subcategory: str | None = None
    product_type: str | None = None
    thc_pct: float | None = None
    cbd_pct: float | None = None
    cannabinoids: dict | None = None      # cbn, cbg, cbc, thca, cbda, etc.
    terpenes: dict | None = None
    total_terpenes_pct: float | None = None
    effects: list | None = None
    pricing: list | None = None           # raw, before enrichment
    sale_pct_off: float | None = None
    image_url: str | None = None
    batch_id: str | None = None
    harvest_date: date | None = None


def normalize_product(p: NormalizedProduct) -> dict:
    """Convert to dict suitable for SQLAlchemy upsert kwargs. Enriches pricing in place."""
    enriched = enrich_pricing(p.pricing or [])
    bppg = best_price_per_gram(enriched)

    total_terps = p.total_terpenes_pct
    if total_terps is None and p.terpenes:
        total_terps = round(sum(p.terpenes.values()), 3)

    return {
        "source_id": p.source_id,
        "name": p.name,
        "brand": p.brand,
        "strain_name": p.strain_name,
        "category": p.category,
        "subcategory": p.subcategory,
        "product_type": p.product_type,
        "thc_pct": p.thc_pct,
        "cbd_pct": p.cbd_pct,
        "cannabinoids": p.cannabinoids,
        "terpenes": p.terpenes,
        "total_terpenes_pct": total_terps,
        "effects": p.effects,
        "pricing": enriched or None,
        "is_on_sale": p.is_on_sale,
        "sale_pct_off": p.sale_pct_off,
        "best_price_per_gram": bppg,
        "image_url": p.image_url,
        "in_stock": p.in_stock,
        "batch_id": p.batch_id,
        "harvest_date": p.harvest_date,
    }
