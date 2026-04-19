"""Round 6 — hit GraphQL JSON endpoint directly using Playwright's session.
The trick: load one Dutchie page first to bank CF clearance cookies, then
fire raw GET requests via context.request which inherits the session.
Way faster than full page renders.
"""

import asyncio
import json
import urllib.parse
from playwright.async_api import async_playwright

# Persisted-query hashes we captured earlier — these are stable for a given
# Dutchie release; they'll need refresh when Dutchie pushes a new client build.
HASHES = {
    "GeolocateConsumer":     "24fe610f1b4d4a8a09f95dafb837ab399af4af8781d30f6658f64b9194113b90",
    "ConsumerDispensaries":  "1a669394db4149fe474f55d0b4eba7850460f6d6e748fb27c206ab335db17f92",
}

DUTCHIE_GQL = "https://dutchie.com/graphql"


def make_url(operation: str, variables: dict, hash_: str) -> str:
    ext = json.dumps({"persistedQuery": {"version": 1, "sha256Hash": hash_}})
    vars_str = json.dumps(variables)
    return (
        f"{DUTCHIE_GQL}?operationName={operation}"
        f"&variables={urllib.parse.quote(vars_str)}"
        f"&extensions={urllib.parse.quote(ext)}"
    )


async def gql(req, op: str, variables: dict):
    url = make_url(op, variables, HASHES[op])
    resp = await req.get(url)
    body_text = await resp.text()
    try:
        return resp.status, json.loads(body_text)
    except Exception:
        return resp.status, {"_raw": body_text[:200]}


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 900},
            locale="en-US",
            timezone_id="America/New_York",
        )

        # Step 1: Load one page to bank CF clearance + cookies
        print("=== Step 1: Bank Cloudflare cookies ===")
        page = await context.new_page()
        await page.goto("https://dutchie.com/", wait_until="domcontentloaded", timeout=30_000)
        await page.wait_for_timeout(3000)
        cookies = await context.cookies()
        cf_cookies = [c for c in cookies if "cf" in c["name"].lower()]
        print(f"  Got {len(cookies)} cookies, {len(cf_cookies)} from Cloudflare")
        await page.close()

        # Step 2: Use context.request to fire raw GraphQL JSON
        req = context.request

        print("\n=== Step 2: GeolocateConsumer (sanity check) ===")
        status, data = await gql(req, "GeolocateConsumer", {})
        print(f"  HTTP {status}, keys: {list(data.get('data', {}).keys()) if data.get('data') else 'NONE'}")
        if data.get("data", {}).get("geolocate"):
            geo = data["data"]["geolocate"]
            print(f"  → {geo.get('city')}, {geo.get('region')} (lat {geo.get('loc')})")

        print("\n=== Step 3: ConsumerDispensaries — try various filter shapes ===")
        filters_to_try = [
            ("by city/name (single)", {"dispensaryFilter": {"cNameOrID": "curaleaf-bellmawr"}}),
            ("empty filter", {"dispensaryFilter": {}}),
            ("by state", {"dispensaryFilter": {"state": "NJ"}}),
            ("by city", {"dispensaryFilter": {"city": "Bellmawr"}}),
            ("by lat/lng", {"dispensaryFilter": {"nearLat": 39.864, "nearLng": -75.092, "distance": 50}}),
            ("medical filter", {"dispensaryFilter": {"medical": True}}),
            ("recreational filter", {"dispensaryFilter": {"recreational": True, "state": "NJ"}}),
            ("active only", {"dispensaryFilter": {"activeOnly": True, "state": "NJ"}}),
        ]
        for label, vars in filters_to_try:
            status, data = await gql(req, "ConsumerDispensaries", vars)
            d = data.get("data") or {}
            fd = d.get("filteredDispensaries")
            if fd is None:
                err = data.get("errors", [{}])[0].get("message", "?")[:120]
                print(f"  ✗ [{label}] HTTP {status} — error: {err}")
            else:
                print(f"  [{label}] HTTP {status} — found {len(fd)} dispensaries")
                if fd:
                    for d_ in fd[:3]:
                        print(f"    → {d_.get('name')} | {d_.get('city')}, {d_.get('state')} | slug={d_.get('cName')}")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
