"""Round 8 — visit a real NJ dispensary's menu and capture EVERY GraphQL
operation + its persisted hash. We need:
  - A query that returns rich dispensary detail (city, state, hours, etc.)
  - A query that returns menu products
"""

import asyncio
import json
import urllib.parse
from playwright.async_api import async_playwright

# We'll discover real NJ slugs first by querying near Trenton
TRENTON_LAT = 40.2206
TRENTON_LNG = -74.7597


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 900},
            locale="en-US",
            timezone_id="America/New_York",
        )

        # Capture every operation with its persisted hash for later replay
        all_ops: dict[str, dict] = {}
        operation_payloads: list[dict] = []

        def make_handler(label):
            async def on_resp(response):
                url = response.url
                if "/graphql" not in url:
                    return
                try:
                    parsed = urllib.parse.urlparse(url)
                    qs = urllib.parse.parse_qs(parsed.query)
                    op = qs.get("operationName", ["?"])[0]
                    vars_raw = qs.get("variables", ["{}"])[0]
                    ext_raw = qs.get("extensions", ["{}"])[0]
                    variables = json.loads(urllib.parse.unquote(vars_raw))
                    extensions = json.loads(urllib.parse.unquote(ext_raw))
                    hash_ = (extensions.get("persistedQuery") or {}).get("sha256Hash")
                    body = await response.json()
                    if hash_ and op not in all_ops:
                        all_ops[op] = {"hash": hash_, "variables": variables}
                    operation_payloads.append({
                        "label": label,
                        "operation": op,
                        "status": response.status,
                        "data_keys": list(body.get("data", {}).keys()) if body.get("data") else [],
                        "data_sample": json.dumps(body.get("data") or {})[:1500],
                    })
                except Exception:
                    pass
            return on_resp

        # Step 1: visit dutchie.com root to bank session
        print("=== Step 1: Bank session ===")
        page = await context.new_page()
        page.on("response", make_handler("home"))
        await page.goto("https://dutchie.com/", wait_until="domcontentloaded", timeout=30_000)
        await page.wait_for_timeout(4000)
        await page.close()

        # Step 2: visit one of the dispensary slugs we found earlier (a real one, not demo)
        # Try a few candidates
        candidates = [
            "the-leaf-joint",
            "zentugo",
            "curaleaf-edgewater-park-rec",
            "rise-bloomfield",
            "rise-paterson",
        ]
        worked = None
        for slug in candidates:
            print(f"\n=== Step 2: Try /dispensary/{slug} ===")
            page = await context.new_page()
            page.on("response", make_handler(slug))
            try:
                await page.goto(f"https://dutchie.com/dispensary/{slug}", wait_until="domcontentloaded", timeout=30_000)
                await page.wait_for_timeout(8000)
                title = await page.title()
                print(f"  title: {title!r}")
                # If page rendered (title set), it worked
                if title:
                    worked = slug
                    break
            except Exception as e:
                print(f"  ✗ {e}")
            finally:
                await page.close()

        # Step 3: report all unique operations + hashes
        print(f"\n=== Step 3: Captured operations ({len(all_ops)} unique) ===")
        for op_name, info in all_ops.items():
            print(f"  • {op_name}")
            print(f"      hash: {info['hash']}")
            print(f"      vars sample: {json.dumps(info['variables'])[:200]}")

        # Step 4: print the responses we captured grouped by operation
        print(f"\n=== Step 4: Response samples (most useful only) ===")
        useful_ops = ["FilteredProducts", "MenuProducts", "ProductsForMenu", "ConsumerDispensaries", "ConsumerDispensary", "DispensaryMenu", "MenuOptions"]
        for payload in operation_payloads:
            if any(op in payload["operation"] for op in useful_ops) or "Product" in payload["operation"] or "Menu" in payload["operation"] or "Dispensary" in payload["operation"]:
                print(f"\n  → {payload['operation']} ({payload['label']}, status {payload['status']})")
                print(f"    data keys: {payload['data_keys']}")
                print(f"    sample: {payload['data_sample'][:600]}")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
