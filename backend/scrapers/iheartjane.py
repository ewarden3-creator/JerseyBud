"""
Scrapes NJ dispensary menus via the iHeartJane public REST API.
iHeartJane exposes a JSON search API used by their embedded menus.
"""

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from scrapers.normalizer import NormalizedDispensary, NormalizedProduct

BASE = "https://api.iheartjane.com/v1"

HEADERS = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Referer": "https://www.iheartjane.com/",
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def _get(client: httpx.AsyncClient, path: str, params: dict | None = None) -> dict:
    resp = await client.get(f"{BASE}{path}", params=params, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()


async def fetch_nj_dispensaries() -> list[NormalizedDispensary]:
    results: list[NormalizedDispensary] = []
    page = 1

    async with httpx.AsyncClient() as client:
        while True:
            data = await _get(client, "/stores", params={
                "state": "NJ",
                "page": page,
                "per_page": 50,
            })
            stores = data.get("data", [])
            if not stores:
                break

            for s in stores:
                attrs = s.get("attributes", {})
                results.append(NormalizedDispensary(
                    source="iheartjane",
                    source_id=str(s["id"]),
                    slug=f"ihj-{s['id']}",
                    name=attrs.get("name", ""),
                    address=attrs.get("address", ""),
                    city=attrs.get("city", ""),
                    zip_code=attrs.get("zip", ""),
                    lat=attrs.get("latitude"),
                    lng=attrs.get("longitude"),
                    phone=attrs.get("phone"),
                    website=f"https://www.iheartjane.com/stores/{s['id']}",
                    logo_url=attrs.get("photo"),
                    opening_year=_parse_year(attrs.get("opened_at")),
                    medical=attrs.get("medical", False),
                    recreational=attrs.get("recreational", True),
                    wheelchair_accessible=attrs.get("ada_accessible"),
                    delivery=attrs.get("delivery_enabled"),
                    curbside_pickup=attrs.get("curbside_enabled"),
                    hours=_parse_ihj_hours(attrs.get("store_hours")),
                ))

            meta = data.get("meta", {})
            if page >= meta.get("total_pages", 1):
                break
            page += 1

    return results


async def fetch_menu(store_id: str) -> list[NormalizedProduct]:
    products: list[NormalizedProduct] = []
    page = 1

    async with httpx.AsyncClient() as client:
        while True:
            data = await _get(client, f"/stores/{store_id}/products", params={
                "page": page,
                "per_page": 100,
            })
            items = data.get("data", [])
            if not items:
                break

            for item in items:
                products.append(_parse_product(item))

            meta = data.get("meta", {})
            if page >= meta.get("total_pages", 1):
                break
            page += 1

    return products


def _parse_product(item: dict) -> NormalizedProduct:
    attrs = item.get("attributes", {})

    terpenes = {}
    for t in (attrs.get("terpenes") or []):
        name = t.get("name", "").lower()
        val = t.get("value")
        if name and val is not None:
            try:
                terpenes[name] = float(val)
            except (TypeError, ValueError):
                pass

    pricing = []
    is_on_sale = False
    sale_pct_off = None
    for price_entry in (attrs.get("prices") or []):
        weight = price_entry.get("weight") or price_entry.get("unit", "")
        price = price_entry.get("discounted_price") or price_entry.get("price")
        original = price_entry.get("price")
        if price is None:
            continue
        entry = {"weight": str(weight), "price": float(price)}
        if original and float(original) > float(price):
            entry["original_price"] = float(original)
            is_on_sale = True
            sale_pct_off = round((1 - float(price) / float(original)) * 100, 1)
        pricing.append(entry)

    thc = _safe_float(attrs.get("percent_thc"))
    cbd = _safe_float(attrs.get("percent_cbd"))

    # Minor cannabinoids — iHJ exposes these as top-level percent_ fields
    cannabinoid_keys = ["cbn", "cbg", "cbc", "thca", "cbda", "cbca", "thcv", "cbdv"]
    cannabinoids = {
        k: v for k in cannabinoid_keys
        if (v := _safe_float(attrs.get(f"percent_{k}"))) is not None
    }

    # iHJ may expose total terpenes pct and harvest/lab date
    total_terpenes_pct = _safe_float(attrs.get("total_terpenes_percentage"))
    harvest_date = None
    raw_harvest = attrs.get("harvest_date") or attrs.get("packaged_date")
    if raw_harvest:
        try:
            from datetime import date
            harvest_date = date.fromisoformat(str(raw_harvest)[:10])
        except (ValueError, TypeError):
            pass

    return NormalizedProduct(
        source_id=str(item["id"]),
        name=attrs.get("name", ""),
        brand=attrs.get("brand"),
        strain_name=attrs.get("strain_name") or attrs.get("name"),
        category=(attrs.get("kind") or "").lower(),
        subcategory=(attrs.get("kind_subtype") or "").lower() or None,
        product_type=(attrs.get("root_subtype") or "").lower() or None,
        thc_pct=thc,
        cbd_pct=cbd,
        cannabinoids=cannabinoids or None,
        terpenes=terpenes or None,
        total_terpenes_pct=total_terpenes_pct,
        effects=attrs.get("feelings") or None,
        pricing=pricing or None,
        batch_id=attrs.get("batch_id") or attrs.get("lot_number"),
        harvest_date=harvest_date,
        is_on_sale=is_on_sale,
        sale_pct_off=sale_pct_off,
        image_url=attrs.get("image_urls", [None])[0],
        in_stock=attrs.get("available", True),
    )


def _safe_float(val) -> float | None:
    try:
        return float(val) if val is not None else None
    except (TypeError, ValueError):
        return None


def _parse_year(val) -> int | None:
    if not val:
        return None
    try:
        return int(str(val)[:4])
    except (ValueError, TypeError):
        return None


def _parse_ihj_hours(raw) -> dict | None:
    """
    iHJ store_hours format varies — handle both array and dict forms.
    Normalizes to {"mon": "10 AM - 8 PM", ...}
    """
    if not raw:
        return None

    day_keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

    # Dict form: {"monday": {"open": "10:00", "close": "20:00"}, ...}
    if isinstance(raw, dict):
        full_to_short = {
            "monday": "mon", "tuesday": "tue", "wednesday": "wed",
            "thursday": "thu", "friday": "fri", "saturday": "sat", "sunday": "sun",
        }
        result = {}
        for full, short in full_to_short.items():
            day = raw.get(full) or raw.get(short) or {}
            if not day or day.get("closed"):
                result[short] = ""
            else:
                result[short] = f"{day.get('open', '')} - {day.get('close', '')}"
        return result

    # Array form: [{"day": 1, "open_time": "10:00", "close_time": "20:00"}, ...]
    if isinstance(raw, list):
        result = {d: "" for d in day_keys}
        for entry in raw:
            day_idx = entry.get("day", 0) - 1  # 1=Mon ... 7=Sun
            if 0 <= day_idx < 7:
                short = day_keys[day_idx]
                result[short] = f"{entry.get('open_time', '')} - {entry.get('close_time', '')}"
        return result

    return None
