"""
Scrapes NJ dispensary menus via Dutchie's public-facing GraphQL API.
Each NJ dispensary on Dutchie has a public storefront at dutchie.com/dispensary/<slug>
which loads menu data from their GraphQL endpoint.

Fallback chain for dispensary discovery:
  1. GraphQL dispensaries query (fastest, may require auth or schema drift)
  2. Sitemap XML parsing (dutchie.com/sitemap-index.xml → dispensary sitemaps)
  3. Playwright scrape of /dispensaries?state=NJ (JS-rendered, last resort)
"""

import re
import xml.etree.ElementTree as ET
import httpx
from playwright.async_api import async_playwright
from tenacity import retry, stop_after_attempt, wait_exponential
from scrapers.normalizer import normalize_product, NormalizedDispensary, NormalizedProduct

DUTCHIE_GQL = "https://dutchie.com/graphql"

HEADERS = {
    "Content-Type": "application/json",
    "apollographql-client-name": "dutchie-plus",
    "apollographql-client-version": "1.0.0",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
}

# GraphQL query to fetch all dispensaries in NJ
DISPENSARIES_QUERY = """
query GetDispensariesByState($state: String!) {
  dispensaries(filter: { state: $state, activeOnly: true }) {
    id
    name
    slug
    address
    city
    state
    zip
    phone
    latitude
    longitude
    menuTypes
    logo
    licenseNumber
    openDate
    retailType
    featureFlags {
      delivery
      curbsidePickup
      hasAtm
      isAccessible
    }
    hours {
      monday { open close active }
      tuesday { open close active }
      wednesday { open close active }
      thursday { open close active }
      friday { open close active }
      saturday { open close active }
      sunday { open close active }
    }
  }
}
"""

# GraphQL query to fetch a dispensary's full menu
MENU_QUERY = """
query GetDispensaryMenu($dispensarySlug: String!, $menuType: MenuType!) {
  dispensaryMenu(dispensarySlug: $dispensarySlug, menuType: $menuType) {
    products {
      id
      name
      brand {
        name
      }
      strainType
      category
      subcategory
      image
      effects
      terpenes {
        terpene {
          name
        }
        unitSymbol
        value
      }
      cannabinoids {
        cannabinoid {
          name
          description
        }
        unit
        value
      }
      batchNumber
      harvestDate
      variants {
        id
        option
        priceMed
        priceRec
        specialPriceMed
        specialPriceRec
        isAvailable
      }
      potencyThc {
        formatted
        range
        unit
      }
      potencyCbd {
        formatted
        range
        unit
      }
    }
  }
}
"""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def _gql(client: httpx.AsyncClient, query: str, variables: dict) -> dict:
    resp = await client.post(
        DUTCHIE_GQL,
        json={"query": query, "variables": variables},
        headers=HEADERS,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if "errors" in data:
        raise ValueError(f"GQL errors: {data['errors']}")
    return data["data"]


async def fetch_nj_dispensaries() -> list[NormalizedDispensary]:
    """Try GQL → sitemap → Playwright, returning first non-empty result."""
    # 1. GraphQL
    try:
        results = await _fetch_via_gql()
        if results:
            return results
    except Exception:
        pass

    # 2. Sitemap
    try:
        results = await _fetch_via_sitemap()
        if results:
            return results
    except Exception:
        pass

    # 3. Playwright (JS-rendered page)
    return await _fetch_via_playwright()


async def _fetch_via_gql() -> list[NormalizedDispensary]:
    async with httpx.AsyncClient() as client:
        data = await _gql(client, DISPENSARIES_QUERY, {"state": "NJ"})
    return [_gql_dispensary_to_normalized(d) for d in data.get("dispensaries", [])]


def _gql_dispensary_to_normalized(d: dict) -> NormalizedDispensary:
    flags = d.get("featureFlags") or {}
    hours = _parse_dutchie_hours(d.get("hours"))

    open_date = d.get("openDate", "")
    opening_year = None
    if open_date:
        try:
            opening_year = int(str(open_date)[:4])
        except (ValueError, TypeError):
            pass

    menu_types = [m.upper() for m in (d.get("menuTypes") or [])]

    return NormalizedDispensary(
        source="dutchie",
        source_id=d["id"],
        slug=f"dutchie-{d['slug']}",
        name=d["name"],
        address=d.get("address", ""),
        city=d.get("city", ""),
        zip_code=d.get("zip", ""),
        lat=d.get("latitude"),
        lng=d.get("longitude"),
        phone=d.get("phone"),
        website=f"https://dutchie.com/dispensary/{d['slug']}",
        logo_url=d.get("logo"),
        nj_license_number=d.get("licenseNumber"),
        opening_year=opening_year,
        medical="MEDICAL" in menu_types,
        recreational="RECREATIONAL" in menu_types,
        wheelchair_accessible=flags.get("isAccessible"),
        delivery=flags.get("delivery"),
        curbside_pickup=flags.get("curbsidePickup"),
        atm=flags.get("hasAtm"),
        hours=hours,
    )


def _parse_dutchie_hours(raw: dict | None) -> dict | None:
    if not raw:
        return None
    day_map = {
        "monday": "mon", "tuesday": "tue", "wednesday": "wed",
        "thursday": "thu", "friday": "fri", "saturday": "sat", "sunday": "sun",
    }
    result = {}
    for full, short in day_map.items():
        day = raw.get(full) or {}
        if not day.get("active"):
            result[short] = ""
        else:
            result[short] = f"{day.get('open', '')} - {day.get('close', '')}"
    return result


async def _fetch_via_sitemap() -> list[NormalizedDispensary]:
    """
    Parse Dutchie's sitemap index to find dispensary sub-sitemaps,
    then filter URLs that contain '/new-jersey/' or state=NJ pattern.
    For each slug found, hydrate details via the per-dispensary GQL info query.
    """
    sitemap_index_url = "https://dutchie.com/sitemap-index.xml"
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.get(sitemap_index_url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        root = ET.fromstring(resp.text)

        # Find sub-sitemap URLs that look like dispensary sitemaps
        dispensary_sitemap_urls = [
            loc.text
            for sm in root.findall("sm:sitemap", ns)
            if (loc := sm.find("sm:loc", ns)) is not None
            and "dispensar" in (loc.text or "").lower()
        ]

        nj_slugs: set[str] = set()
        for sitemap_url in dispensary_sitemap_urls:
            try:
                resp = await client.get(sitemap_url, headers=HEADERS, timeout=20)
                resp.raise_for_status()
                sub_root = ET.fromstring(resp.text)
                for url_el in sub_root.findall("sm:url", ns):
                    loc = url_el.find("sm:loc", ns)
                    if loc is None or not loc.text:
                        continue
                    # Match URLs like /dispensary/<slug>/new-jersey or ?state=NJ
                    if _is_nj_dispensary_url(loc.text):
                        slug = _extract_slug(loc.text)
                        if slug:
                            nj_slugs.add(slug)
            except Exception:
                continue

        if not nj_slugs:
            return []

        # Hydrate each slug with the per-dispensary info query
        results = []
        for slug in nj_slugs:
            try:
                nd = await _hydrate_slug(client, slug)
                if nd:
                    results.append(nd)
            except Exception:
                # Still include a minimal record so we can scrape the menu
                results.append(NormalizedDispensary(
                    source="dutchie",
                    source_id=slug,
                    slug=f"dutchie-{slug}",
                    name=slug.replace("-", " ").title(),
                    address="",
                    city="",
                    zip_code="",
                    website=f"https://dutchie.com/dispensary/{slug}",
                ))
        return results


def _is_nj_dispensary_url(url: str) -> bool:
    url_lower = url.lower()
    return (
        "dutchie.com/dispensary/" in url_lower
        and (
            "/new-jersey" in url_lower
            or "state=nj" in url_lower
            or "-nj-" in url_lower
            or url_lower.endswith("-nj")
        )
    )


def _extract_slug(url: str) -> str | None:
    # dutchie.com/dispensary/<slug> or dutchie.com/dispensary/<slug>/new-jersey/...
    match = re.search(r"dutchie\.com/dispensary/([^/?#]+)", url, re.IGNORECASE)
    return match.group(1) if match else None


DISPENSARY_INFO_QUERY = """
query GetDispensaryInfo($slug: String!) {
  dispensary(slug: $slug) {
    id
    name
    slug
    address
    city
    state
    zip
    phone
    latitude
    longitude
  }
}
"""


async def _hydrate_slug(client: httpx.AsyncClient, slug: str) -> NormalizedDispensary | None:
    data = await _gql(client, DISPENSARY_INFO_QUERY, {"slug": slug})
    d = data.get("dispensary")
    if not d:
        return None
    return _gql_dispensary_to_normalized(d)


async def _fetch_via_playwright() -> list[NormalizedDispensary]:
    """
    Last-resort: render dutchie.com/dispensaries with Playwright,
    intercept the network response that contains the dispensary list JSON,
    and parse it.
    """
    results: list[NormalizedDispensary] = []
    captured: list[dict] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()

        async def handle_response(response):
            if "dispensaries" in response.url and response.request.method == "POST":
                try:
                    body = await response.json()
                    dispensaries = (
                        (body.get("data") or {}).get("dispensaries") or []
                    )
                    captured.extend(dispensaries)
                except Exception:
                    pass

        page.on("response", handle_response)
        await page.goto(
            "https://dutchie.com/dispensaries?state=NJ",
            wait_until="networkidle",
            timeout=30_000,
        )
        await browser.close()

    for d in captured:
        if (d.get("state") or "").upper() == "NJ":
            results.append(_gql_dispensary_to_normalized(d))

    return results


async def fetch_menu(dispensary_slug: str) -> list[NormalizedProduct]:
    """
    dispensary_slug here is the raw Dutchie slug (without the 'dutchie-' prefix).
    """
    products: list[NormalizedProduct] = []

    async with httpx.AsyncClient() as client:
        for menu_type in ("RECREATIONAL", "MEDICAL"):
            try:
                data = await _gql(client, MENU_QUERY, {
                    "dispensarySlug": dispensary_slug,
                    "menuType": menu_type,
                })
            except Exception:
                continue

            raw_products = (data.get("dispensaryMenu") or {}).get("products", []) or []
            for p in raw_products:
                products.append(_parse_product(p))

    # deduplicate by source_id
    seen = set()
    unique = []
    for p in products:
        if p.source_id not in seen:
            seen.add(p.source_id)
            unique.append(p)
    return unique


def _parse_product(p: dict) -> NormalizedProduct:
    terpenes = {}
    for t in (p.get("terpenes") or []):
        name = (t.get("terpene") or {}).get("name")
        val = t.get("value")
        if name and val is not None:
            terpenes[name.lower()] = float(val)

    cannabinoids = {}
    for c in (p.get("cannabinoids") or []):
        name = (c.get("cannabinoid") or {}).get("name")
        val = c.get("value")
        if name and val is not None:
            try:
                cannabinoids[name.lower()] = float(val)
            except (TypeError, ValueError):
                pass

    pricing = []
    is_on_sale = False
    sale_pct_off = None
    for v in (p.get("variants") or []):
        if not v.get("isAvailable"):
            continue
        rec = v.get("priceRec") or v.get("priceMed")
        special = v.get("specialPriceRec") or v.get("specialPriceMed")
        if rec is None:
            continue
        entry = {"weight": v.get("option", ""), "price": float(special or rec)}
        if special and special < rec:
            entry["original_price"] = float(rec)
            is_on_sale = True
            sale_pct_off = round((1 - special / rec) * 100, 1)
        pricing.append(entry)

    thc = _parse_potency(p.get("potencyThc"))
    cbd = _parse_potency(p.get("potencyCbd"))

    harvest_date = None
    raw_harvest = p.get("harvestDate")
    if raw_harvest:
        try:
            from datetime import date
            harvest_date = date.fromisoformat(raw_harvest[:10])
        except (ValueError, TypeError):
            pass

    return NormalizedProduct(
        source_id=str(p["id"]),
        name=p.get("name", ""),
        brand=(p.get("brand") or {}).get("name"),
        strain_name=p.get("name"),
        category=(p.get("category") or "").lower(),
        subcategory=(p.get("subcategory") or "").lower() or None,
        product_type=(p.get("strainType") or "").lower() or None,
        thc_pct=thc,
        cbd_pct=cbd,
        cannabinoids=cannabinoids or None,
        terpenes=terpenes or None,
        effects=p.get("effects") or None,
        pricing=pricing or None,
        is_on_sale=is_on_sale,
        sale_pct_off=sale_pct_off,
        image_url=p.get("image"),
        in_stock=bool(pricing),
        batch_id=p.get("batchNumber"),
        harvest_date=harvest_date,
    )


def _parse_potency(potency: dict | None) -> float | None:
    if not potency:
        return None
    rng = potency.get("range")
    if rng and len(rng) >= 1:
        try:
            return float(rng[0])
        except (TypeError, ValueError):
            pass
    formatted = potency.get("formatted", "")
    try:
        return float(formatted.replace("%", "").strip())
    except (ValueError, AttributeError):
        return None
