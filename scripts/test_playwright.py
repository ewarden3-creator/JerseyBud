"""
Playwright-based scraper test — uses a real browser to bypass Cloudflare.
Random pacing, realistic browser fingerprint, network interception.

We test:
  1. Visit a known NJ Dutchie dispensary storefront, intercept GraphQL responses
  2. Let JS execute (CF challenges resolve themselves)
  3. Capture menu data from the network
  4. Pace requests with 8-15s lag between dispensary visits
  5. Run several in a row to confirm pattern is sustainable
"""

import asyncio
import json
import random
import time
from playwright.async_api import async_playwright

# Known NJ Dutchie dispensary slugs to test against.
# These are real, public storefronts — no credentials needed.
NJ_DUTCHIE_SLUGS = [
    "curaleaf-bellmawr",
    "curaleaf-edgewater-park",
    "the-apothecarium-maplewood",
]

# iHJ NJ store IDs — public storefronts
IHJ_STORE_PATHS = [
    "/stores/2104-rise-paterson",       # actual URL pattern uses store ID
]


def banner(t):
    print(f"\n{'=' * 70}\n  {t}\n{'=' * 70}")


async def random_pause(label="", min_s=8, max_s=15):
    """Sleep a randomized amount — looks more human, avoids fingerprinting."""
    s = random.uniform(min_s, max_s)
    print(f"  [pause {s:.1f}s {label}]")
    await asyncio.sleep(s)


async def test_dutchie_with_playwright():
    banner("DUTCHIE — Playwright with realistic browser fingerprint")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-features=IsolateOrigins,site-per-process",
            ],
        )
        # Realistic context — desktop Mac Chrome
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="en-US",
            timezone_id="America/New_York",
            java_script_enabled=True,
        )

        results = []
        for i, slug in enumerate(NJ_DUTCHIE_SLUGS):
            print(f"\n  [{i+1}/{len(NJ_DUTCHIE_SLUGS)}] Visiting dutchie.com/dispensary/{slug}")
            page = await context.new_page()

            # Capture all GraphQL responses to learn the schema in use
            captured_gql = []

            async def handle_response(response):
                url = response.url
                if "/graphql" in url and response.request.method == "POST":
                    try:
                        body = await response.json()
                        # Save just the keys to keep output manageable
                        if "data" in body and body["data"]:
                            keys = list(body["data"].keys())
                            captured_gql.append({
                                "status": response.status,
                                "data_keys": keys,
                                "sample": json.dumps(body["data"])[:500],
                            })
                    except Exception:
                        pass

            page.on("response", handle_response)

            try:
                resp = await page.goto(
                    f"https://dutchie.com/dispensary/{slug}",
                    wait_until="networkidle",
                    timeout=45_000,
                )
                print(f"    HTTP {resp.status if resp else 'no response'}")

                # Did CF challenge us?
                title = await page.title()
                print(f"    Page title: {title}")
                if "Just a moment" in title or "Attention Required" in title:
                    print("    ⚠ Cloudflare challenge detected — would need solving (puzzles, etc)")

                # Did we get a real menu? Look for product elements
                product_count = await page.locator(
                    "[data-testid*='product'], [class*='product-card'], a[href*='/product/']"
                ).count()
                print(f"    Product elements found on page: {product_count}")

                # Show GQL responses we captured
                print(f"    GraphQL responses captured: {len(captured_gql)}")
                for resp in captured_gql[:3]:
                    print(f"      → status {resp['status']}, data keys: {resp['data_keys']}")
                    print(f"        sample: {resp['sample'][:200]}")

                results.append({
                    "slug": slug,
                    "title": title,
                    "products": product_count,
                    "gql_calls": len(captured_gql),
                })
            except Exception as e:
                print(f"    ✗ {type(e).__name__}: {e}")
                results.append({"slug": slug, "error": str(e)})

            await page.close()

            if i < len(NJ_DUTCHIE_SLUGS) - 1:
                await random_pause("between dispensaries")

        await browser.close()
        print("\n  Summary:")
        for r in results:
            print(f"    {r}")


async def test_iheartjane_with_playwright():
    banner("iHEARTJANE — Playwright sample store")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="en-US",
            timezone_id="America/New_York",
        )

        page = await context.new_page()
        captured_api = []

        async def handle_response(response):
            url = response.url
            if "api.iheartjane.com" in url and response.status == 200:
                try:
                    body = await response.json()
                    captured_api.append({
                        "url": url[:120],
                        "keys": list(body.keys()) if isinstance(body, dict) else type(body).__name__,
                    })
                except Exception:
                    pass

        page.on("response", handle_response)

        try:
            print("  Visiting https://www.iheartjane.com/stores/")
            resp = await page.goto("https://www.iheartjane.com/stores/", wait_until="networkidle", timeout=45_000)
            print(f"    HTTP {resp.status if resp else 'no response'}")
            title = await page.title()
            print(f"    Title: {title}")
            stores = await page.locator("a[href*='/stores/']").count()
            print(f"    Store-link count: {stores}")
            print(f"    iHJ API calls captured: {len(captured_api)}")
            for c in captured_api[:5]:
                print(f"      → {c}")
        except Exception as e:
            print(f"  ✗ {e}")

        await browser.close()


async def main():
    await test_dutchie_with_playwright()
    await random_pause("between platforms", 5, 10)
    await test_iheartjane_with_playwright()


if __name__ == "__main__":
    asyncio.run(main())
