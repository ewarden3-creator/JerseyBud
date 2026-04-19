"""End-to-end pipeline test:
  1. List NJ dispensaries via lat/lng search
  2. Filter out sandbox/demo entries
  3. Pick one real shop, fetch ALL its products via FilteredProducts
  4. Normalize and print sample output

If this works, we can copy this pattern into the production scraper.
"""

import asyncio
import json
import urllib.parse
from playwright.async_api import async_playwright

# Persisted hashes captured from real Dutchie traffic
HASHES = {
    "ConsumerDispensaries": "1a669394db4149fe474f55d0b4eba7850460f6d6e748fb27c206ab335db17f92",
    "MenuFiltersV2":        "2f0b3233b8a2426b391649ca3f0f7a5d43b9aefd683f6286d7261a2517e3568e",
    "FilteredProducts":     "98b4aaef79a84ae804b64d550f98dd64d7ba0aa6d836eb6b5d4b2ae815c95e32",
    "GetMenuSections":      "fb14fcf58d6cdc05ab5957e15ac09591ebac4fbc8784ea8763db2746688b7599",
}

NJ_CENTER = (40.0583, -74.4057)
DUTCHIE_GQL = "https://dutchie.com/graphql"


def make_url(op, variables, hash_):
    ext = json.dumps({"persistedQuery": {"version": 1, "sha256Hash": hash_}})
    return (
        f"{DUTCHIE_GQL}?operationName={op}"
        f"&variables={urllib.parse.quote(json.dumps(variables))}"
        f"&extensions={urllib.parse.quote(ext)}"
    )


async def gql(page, op, variables):
    url = make_url(op, variables, HASHES[op])
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


def is_real_shop(d: dict) -> bool:
    """Filter out sandbox/demo entries."""
    name = (d.get("name") or "").lower()
    if any(s in name for s in ["sandbox", "sbx", "(demo", "demo)", "ianthus demo", "test"]):
        return False
    if d.get("status") not in ("open", "store_status_open", None):
        # Only allow open/unknown statuses
        pass
    state = (d.get("location", {}) or {}).get("state") if isinstance(d.get("location"), dict) else None
    return state == "NJ" or state is None  # some have null state


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 900},
            locale="en-US",
            timezone_id="America/New_York",
        )

        page = await context.new_page()
        # Bank session
        await page.goto("https://dutchie.com/", wait_until="domcontentloaded", timeout=30_000)
        await page.wait_for_timeout(3000)

        # 1) List dispensaries near NJ center
        print("=== 1. List dispensaries near NJ ===")
        data = await gql(page, "ConsumerDispensaries", {
            "dispensaryFilter": {
                "nearLat": NJ_CENTER[0],
                "nearLng": NJ_CENTER[1],
                "distance": 50,
            }
        })
        all_disps = data.get("data", {}).get("filteredDispensaries", []) or []
        nj_disps = [d for d in all_disps if is_real_shop(d)]
        print(f"  raw: {len(all_disps)} dispensaries, {len(nj_disps)} pass real-shop filter")

        # Show a few
        for d in nj_disps[:8]:
            loc = d.get("location") or {}
            print(f"    • {d.get('name')!r:55} | cName={d.get('cName')!r:35} | id={d.get('id')}")
            print(f"        city={loc.get('city')}, state={loc.get('state')}, status={d.get('status')}")

        if not nj_disps:
            print("  ✗ no real shops")
            await browser.close()
            return

        # 2) Pick the first real one and fetch its products
        target = nj_disps[0]
        d_id = target["id"]
        d_name = target["name"]
        print(f"\n=== 2. Fetch products for '{d_name}' (id={d_id}) ===")

        # First get menu sections to see what categories/products this shop has
        sections_data = await gql(page, "GetMenuSections", {"dispensaryId": d_id})
        sections = sections_data.get("data", {}).get("getMenuSections", []) or []
        print(f"  Menu sections: {len(sections)}")
        all_product_ids = set()
        for s in sections[:5]:
            label = s.get("label") or s.get("category") or "?"
            product_ids = s.get("products") or []
            print(f"    - {label!r:50} | {len(product_ids)} products")
            all_product_ids.update(product_ids[:20])  # cap to keep payload reasonable

        # Now fetch the products
        print(f"\n  Fetching {len(all_product_ids)} unique products via FilteredProducts...")
        products_data = await gql(page, "FilteredProducts", {
            "includeEnterpriseSpecials": False,
            "productsFilter": {"productIds": list(all_product_ids)},
        })
        products = (products_data.get("data", {}).get("filteredProducts") or {}).get("products", []) or []
        print(f"  Got {len(products)} products")

        if products:
            print("\n  Sample product (first):")
            p = products[0]
            sample = {
                "id": p.get("id"),
                "name": p.get("Name") or p.get("name"),
                "brand": p.get("brandName"),
                "category": p.get("type") or p.get("kind"),
                "thc": (p.get("THCContent") or {}),
                "cbd": (p.get("CBDContent") or {}),
                "image": (p.get("Image") or p.get("image")),
                "options": p.get("Options") or [],
                "prices": p.get("Prices") or {},
                "specials": p.get("specialData"),
                "strain_type": p.get("strainType"),
            }
            print(json.dumps(sample, indent=2, default=str)[:1500])

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
