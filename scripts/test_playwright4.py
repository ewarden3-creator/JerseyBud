"""Round 4 — capture FULL GraphQL responses to learn the real schema."""

import asyncio
import json
import urllib.parse
from playwright.async_api import async_playwright


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
        captured = []

        async def on_resp(response):
            url = response.url
            if "/graphql" not in url:
                return
            try:
                body = await response.json()
                # Parse the operation name from the URL
                parsed = urllib.parse.urlparse(url)
                qs = urllib.parse.parse_qs(parsed.query)
                op = qs.get("operationName", ["?"])[0]
                vars_raw = qs.get("variables", ["{}"])[0]
                ext_raw = qs.get("extensions", ["{}"])[0]
                try:
                    variables = json.loads(urllib.parse.unquote(vars_raw))
                except Exception:
                    variables = vars_raw
                try:
                    extensions = json.loads(urllib.parse.unquote(ext_raw))
                except Exception:
                    extensions = ext_raw
                captured.append({
                    "operation": op,
                    "method": response.request.method,
                    "status": response.status,
                    "variables": variables,
                    "ext_hash": (extensions.get("persistedQuery") or {}).get("sha256Hash") if isinstance(extensions, dict) else None,
                    "body_keys": list(body.get("data", {}).keys()) if body.get("data") else [],
                    "body_sample": json.dumps(body)[:1500],
                })
            except Exception as e:
                pass

        page.on("response", on_resp)

        print("=== Visiting dutchie.com/dispensary/curaleaf-bellmawr ===")
        await page.goto("https://dutchie.com/dispensary/curaleaf-bellmawr", wait_until="domcontentloaded", timeout=30_000)
        await page.wait_for_timeout(15_000)  # generous hydration time

        print(f"\nCaptured {len(captured)} GraphQL calls:\n")
        for i, c in enumerate(captured):
            print(f"--- {i+1}. {c['operation']} ({c['method']} {c['status']}) ---")
            print(f"  variables: {json.dumps(c['variables'])[:300]}")
            if c["ext_hash"]:
                print(f"  persisted hash: {c['ext_hash']}")
            print(f"  data keys: {c['body_keys']}")
            print(f"  body: {c['body_sample'][:600]}")
            print()

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
