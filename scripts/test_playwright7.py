"""Round 7 — fire fetch() from INSIDE the browser context.
Real browser TLS fingerprint, full Cloudflare clearance.
"""

import asyncio
import json
import urllib.parse
from playwright.async_api import async_playwright

HASHES = {
    "GeolocateConsumer":     "24fe610f1b4d4a8a09f95dafb837ab399af4af8781d30f6658f64b9194113b90",
    "ConsumerDispensaries":  "1a669394db4149fe474f55d0b4eba7850460f6d6e748fb27c206ab335db17f92",
}

DUTCHIE_GQL = "https://dutchie.com/graphql"


def make_url(operation: str, variables: dict, hash_: str) -> str:
    ext = json.dumps({"persistedQuery": {"version": 1, "sha256Hash": hash_}})
    return (
        f"{DUTCHIE_GQL}?operationName={operation}"
        f"&variables={urllib.parse.quote(json.dumps(variables))}"
        f"&extensions={urllib.parse.quote(ext)}"
    )


async def gql_via_browser(page, op: str, variables: dict):
    """Execute fetch() from inside the page so it uses real browser TLS."""
    url = make_url(op, variables, HASHES[op])
    js = f"""
      fetch({json.dumps(url)}, {{
        method: 'GET',
        headers: {{
          'apollographql-client-name': 'consumer-app',
          'apollographql-client-version': '1.0.0',
          'content-type': 'application/json'
        }}
      }}).then(r => r.text()).then(t => ({{ status: 200, body: t }}))
        .catch(e => ({{ status: 0, body: String(e) }}))
    """
    result = await page.evaluate(js)
    try:
        return json.loads(result["body"])
    except Exception:
        return {"_raw": result["body"][:300], "_status": result.get("status")}


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
        print("=== Loading dutchie.com to bank session ===")
        await page.goto("https://dutchie.com/", wait_until="domcontentloaded", timeout=30_000)
        await page.wait_for_timeout(3000)
        print(f"  page title: {await page.title()!r}")

        print("\n=== GeolocateConsumer (sanity) ===")
        data = await gql_via_browser(page, "GeolocateConsumer", {})
        if "data" in data and data["data"].get("geolocate"):
            g = data["data"]["geolocate"]
            print(f"  ✓ {g.get('city')}, {g.get('region')} ({g.get('postal')})")
        else:
            print(f"  ✗ {str(data)[:200]}")

        print("\n=== ConsumerDispensaries — find what shape works ===")
        filter_attempts = [
            ("known slug", {"dispensaryFilter": {"cNameOrID": "curaleaf-bellmawr"}}),
            ("by state NJ", {"dispensaryFilter": {"state": "NJ"}}),
            ("by lat/lng + radius", {"dispensaryFilter": {"nearLat": 40.0583, "nearLng": -74.4057, "distance": 50}}),
            ("recreational + state", {"dispensaryFilter": {"recreational": True, "state": "NJ"}}),
            ("storeType filter", {"dispensaryFilter": {"storeType": "recreational", "state": "NJ"}}),
            ("nameOrID empty", {"dispensaryFilter": {"cNameOrID": ""}}),
        ]
        for label, vars in filter_attempts:
            data = await gql_via_browser(page, "ConsumerDispensaries", vars)
            if "errors" in data:
                msgs = [e.get("message", "?") for e in data["errors"][:1]]
                print(f"  ✗ [{label}] {msgs[0][:120]}")
            elif "data" in data and data["data"]:
                fd = data["data"].get("filteredDispensaries")
                if fd is not None:
                    print(f"  [{label}] {len(fd)} dispensaries")
                    for d_ in fd[:5]:
                        print(f"    → {d_.get('name')} | {d_.get('city')}, {d_.get('state')} | cName={d_.get('cName')}")
                else:
                    print(f"  [{label}] data exists, no filteredDispensaries: {list(data['data'].keys())}")
            else:
                print(f"  ? [{label}] {str(data)[:200]}")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
