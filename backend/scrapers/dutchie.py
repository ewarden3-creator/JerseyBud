from __future__ import annotations

"""
Dutchie scraper — Playwright-based, hits the live GraphQL JSON endpoint
through a real browser context. Bypasses Cloudflare.

Pattern (validated 2026-04-19):
  1. Open Chromium, load dutchie.com to bank session cookies
  2. Use page.evaluate(fetch(...)) to call GraphQL with persisted-query hashes
  3. Parse responses into NormalizedDispensary / NormalizedProduct

Hashes were captured from real browser traffic. They're stable across a Dutchie
release; if Dutchie ships a new client build, the old hashes get rejected and
we'll need to re-capture (run scripts/test_playwright8.py).
"""

import asyncio
import json
import urllib.parse
from datetime import date
from typing import Any
from playwright.async_api import async_playwright, Page

from scrapers.normalizer import NormalizedDispensary, NormalizedProduct

DUTCHIE_GQL = "https://dutchie.com/graphql"

# NJ bounding box centroid — used to limit search radius
NJ_CENTER_LAT = 40.0583
NJ_CENTER_LNG = -74.4057
NJ_SEARCH_RADIUS_MI = 50

# Persisted query hashes (captured 2026-04-19)
HASH = {
    "ConsumerDispensaries": "1a669394db4149fe474f55d0b4eba7850460f6d6e748fb27c206ab335db17f92",
    "MenuFiltersV2":        "2f0b3233b8a2426b391649ca3f0f7a5d43b9aefd683f6286d7261a2517e3568e",
    "FilteredProducts":     "98b4aaef79a84ae804b64d550f98dd64d7ba0aa6d836eb6b5d4b2ae815c95e32",
    "GetMenuSections":      "fb14fcf58d6cdc05ab5957e15ac09591ebac4fbc8784ea8763db2746688b7599",
}

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"


def _make_url(operation: str, variables: dict, hash_: str) -> str:
    ext = json.dumps({"persistedQuery": {"version": 1, "sha256Hash": hash_}})
    return (
        f"{DUTCHIE_GQL}?operationName={operation}"
        f"&variables={urllib.parse.quote(json.dumps(variables))}"
        f"&extensions={urllib.parse.quote(ext)}"
    )


async def _gql(page: Page, op: str, variables: dict) -> dict:
    """Fire a GraphQL request from inside the page context for proper TLS."""
    url = _make_url(op, variables, HASH[op])
    js = f"""
      fetch({json.dumps(url)}, {{
        method: 'GET',
        headers: {{
          'apollographql-client-name': 'consumer-app',
          'apollographql-client-version': '1.0.0',
          'content-type': 'application/json'
        }}
      }}).then(r => r.text())
    """
    raw = await page.evaluate(js)
    return json.loads(raw)


async def _open_session() -> tuple[Any, Any, Page]:
    """Launch browser, bank Cloudflare clearance. Returns (pw, browser, page)."""
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=True)
    context = await browser.new_context(
        user_agent=USER_AGENT,
        viewport={"width": 1280, "height": 900},
        locale="en-US",
        timezone_id="America/New_York",
    )
    page = await context.new_page()
    await page.goto("https://dutchie.com/", wait_until="domcontentloaded", timeout=30_000)
    await page.wait_for_timeout(2500)
    return pw, browser, page


def _is_real_nj_shop(d: dict) -> bool:
    name = (d.get("name") or "").lower()
    if any(s in name for s in ("sandbox", "sbx", "(demo", "demo)", "test", "ianthus demo", "dnu")):
        return False
    if d.get("status") not in ("open", None):
        return False
    state = (d.get("location") or {}).get("state") if isinstance(d.get("location"), dict) else None
    return state == "NJ" or state is None


async def fetch_nj_dispensaries() -> list[NormalizedDispensary]:
    """Returns all real, open NJ dispensaries currently on Dutchie."""
    pw, browser, page = await _open_session()
    try:
        data = await _gql(page, "ConsumerDispensaries", {
            "dispensaryFilter": {
                "nearLat": NJ_CENTER_LAT,
                "nearLng": NJ_CENTER_LNG,
                "distance": NJ_SEARCH_RADIUS_MI,
            }
        })
        all_disps = (data.get("data") or {}).get("filteredDispensaries") or []
        results: list[NormalizedDispensary] = []
        for d in all_disps:
            if not _is_real_nj_shop(d):
                continue
            loc = d.get("location") or {}
            results.append(NormalizedDispensary(
                source="dutchie",
                source_id=d["id"],
                slug=f"dutchie-{d.get('cName')}",
                name=d.get("name", ""),
                address=" ".join(filter(None, [loc.get("ln1", ""), loc.get("ln2", "")])).strip(),
                city=loc.get("city") or "",
                zip_code=loc.get("zipcode", "") or "",
                lat=loc.get("geo", {}).get("lat") if isinstance(loc.get("geo"), dict) else None,
                lng=loc.get("geo", {}).get("lng") if isinstance(loc.get("geo"), dict) else None,
                phone=d.get("phone"),
                website=f"https://dutchie.com/dispensary/{d.get('cName')}",
            ))
        return results
    finally:
        await browser.close()
        await pw.stop()


async def fetch_menu(dispensary_slug: str) -> list[NormalizedProduct]:
    """
    dispensary_slug: the cName-prefixed slug (without 'dutchie-' prefix).
    Returns all in-stock products for the dispensary, normalized.
    """
    raw_slug = dispensary_slug.removeprefix("dutchie-")
    pw, browser, page = await _open_session()
    try:
        # Step 1: resolve the slug to a real Dutchie ID
        info = await _gql(page, "ConsumerDispensaries", {
            "dispensaryFilter": {"cNameOrID": raw_slug}
        })
        disps = (info.get("data") or {}).get("filteredDispensaries") or []
        if not disps:
            return []
        dispensary_id = disps[0]["id"]

        # Step 2: get menu sections to enumerate product IDs
        sections_data = await _gql(page, "GetMenuSections", {"dispensaryId": dispensary_id})
        sections = (sections_data.get("data") or {}).get("getMenuSections") or []

        all_product_ids: set[str] = set()
        for s in sections:
            for pid in (s.get("products") or []):
                all_product_ids.add(pid)

        if not all_product_ids:
            return []

        # Step 3: chunk product fetches (Dutchie limits batch size around 50-100)
        products: list[NormalizedProduct] = []
        ids = list(all_product_ids)
        CHUNK = 50
        for i in range(0, len(ids), CHUNK):
            chunk = ids[i:i + CHUNK]
            data = await _gql(page, "FilteredProducts", {
                "includeEnterpriseSpecials": False,
                "productsFilter": {"productIds": chunk},
            })
            raw_products = ((data.get("data") or {}).get("filteredProducts") or {}).get("products") or []
            for p in raw_products:
                normalized = _parse_product(p)
                if normalized:
                    products.append(normalized)
            await page.wait_for_timeout(800)  # small pacing between chunks

        # Dedupe by source_id
        seen = set()
        unique = []
        for p in products:
            if p.source_id not in seen:
                seen.add(p.source_id)
                unique.append(p)
        return unique
    finally:
        await browser.close()
        await pw.stop()


def _parse_potency(field: dict | None) -> float | None:
    """Pull the first numeric value from a {unit, range:[..]} potency field."""
    if not field:
        return None
    rng = field.get("range") or []
    if rng:
        try:
            return float(rng[0])
        except (TypeError, ValueError):
            return None
    return None


def _parse_pricing(options: list, prices: list) -> tuple[list[dict], bool, float | None]:
    """Build the pricing array. Mark sale + pct off if special pricing exists."""
    out: list[dict] = []
    if not options or not prices:
        return out, False, None
    for opt, price in zip(options, prices):
        if price is None:
            continue
        out.append({"weight": str(opt), "price": float(price)})
    return out, False, None  # sale handling done separately below


def _parse_product(p: dict) -> NormalizedProduct | None:
    if not p.get("id"):
        return None

    name = p.get("Name") or p.get("name") or ""
    brand = p.get("brandName") or (p.get("brand") or {}).get("name") if isinstance(p.get("brand"), dict) else p.get("brandName")
    category = (p.get("type") or p.get("kind") or "").lower()

    thc = _parse_potency(p.get("THCContent"))
    cbd = _parse_potency(p.get("CBDContent"))

    options = p.get("Options") or []
    prices = p.get("Prices") or []
    pricing, _, _ = _parse_pricing(options, prices)

    # Sale specials — if any, compute pct off and mark on_sale
    is_on_sale = False
    sale_pct_off: float | None = None
    specials = p.get("specialData") or {}
    sale_specials = (specials or {}).get("saleSpecials") or []
    if sale_specials:
        # First sale special with a percent_discount applies
        first = sale_specials[0]
        if first.get("percentDiscount"):
            disc = first.get("discount")
            if disc:
                sale_pct_off = float(disc)
                is_on_sale = True
                # Apply discount to pricing entries to reflect sale prices
                for entry in pricing:
                    original = entry["price"]
                    entry["original_price"] = original
                    entry["price"] = round(original * (1 - sale_pct_off / 100), 2)

    image_url = p.get("Image") or p.get("image")
    if isinstance(image_url, dict):
        image_url = image_url.get("url")

    strain_type = (p.get("strainType") or "").lower() or None
    if strain_type == "n/a":
        strain_type = None

    return NormalizedProduct(
        source_id=str(p["id"]),
        name=name,
        brand=brand,
        strain_name=name,
        category=category,
        subcategory=(p.get("subcategory") or "").lower() or None,
        product_type=strain_type,
        thc_pct=thc,
        cbd_pct=cbd,
        terpenes=None,           # Dutchie doesn't expose terpenes in this query — captured separately if available
        effects=None,
        pricing=pricing or None,
        is_on_sale=is_on_sale,
        sale_pct_off=sale_pct_off,
        image_url=image_url if isinstance(image_url, str) else None,
        in_stock=bool(pricing),
    )
