"""Round 3 — see what actually renders. Dump HTML, take screenshots."""

import asyncio
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

        # Test 1: Dutchie main directory page (NJ)
        print("\n=== Test 1: dutchie.com/dispensaries page ===")
        page = await context.new_page()
        try:
            r = await page.goto("https://dutchie.com/dispensaries", wait_until="domcontentloaded", timeout=30_000)
            print(f"  HTTP: {r.status if r else '?'}")
            await page.wait_for_timeout(5000)  # let JS hydrate
            print(f"  Title: {await page.title()!r}")
            print(f"  URL after: {page.url}")
            # Grab text content to see if it's a CF challenge or real content
            text = await page.text_content("body")
            print(f"  Body text length: {len(text or '')}")
            if text:
                print(f"  First 500 chars: {text[:500]}")
            await page.screenshot(path="/tmp/dutchie-dispensaries.png")
            print("  Screenshot: /tmp/dutchie-dispensaries.png")
        except Exception as e:
            print(f"  ✗ {e}")
        finally:
            await page.close()

        # Test 2: Try a known Curaleaf NJ URL via Curaleaf's own site (which uses Dutchie embed)
        print("\n=== Test 2: dutchie.com/embedded-menu/curaleaf-bellmawr ===")
        page = await context.new_page()
        try:
            r = await page.goto("https://dutchie.com/embedded-menu/curaleaf-bellmawr", wait_until="domcontentloaded", timeout=30_000)
            print(f"  HTTP: {r.status if r else '?'}")
            await page.wait_for_timeout(8000)
            print(f"  Title: {await page.title()!r}")
            print(f"  URL after: {page.url}")
            text = await page.text_content("body")
            print(f"  Body text length: {len(text or '')}")
            if text:
                print(f"  First 600 chars: {text[:600]}")
            await page.screenshot(path="/tmp/dutchie-embed.png")
            print("  Screenshot: /tmp/dutchie-embed.png")
        except Exception as e:
            print(f"  ✗ {e}")
        finally:
            await page.close()

        # Test 3: Direct dispensary URL with longer wait + check for product data via window state
        print("\n=== Test 3: dutchie.com/dispensary/curaleaf-bellmawr (long wait) ===")
        page = await context.new_page()

        captured_xhr = []
        async def on_resp(response):
            url = response.url
            if "dutchie" in url and any(s in url for s in ["graphql", "/api/", "/menu"]):
                captured_xhr.append({
                    "url": url[:100],
                    "method": response.request.method,
                    "status": response.status,
                })

        page.on("response", on_resp)

        try:
            r = await page.goto("https://dutchie.com/dispensary/curaleaf-bellmawr", wait_until="domcontentloaded", timeout=30_000)
            print(f"  HTTP: {r.status if r else '?'}")
            await page.wait_for_timeout(12_000)  # long wait for SPA hydration
            print(f"  Title: {await page.title()!r}")
            print(f"  URL after: {page.url}")
            print(f"  Captured network calls: {len(captured_xhr)}")
            for c in captured_xhr[:8]:
                print(f"    {c}")
            text = await page.text_content("body")
            print(f"  Body chars: {len(text or '')}")
            if text:
                print(f"    sample: {text[:300]}")
            await page.screenshot(path="/tmp/dutchie-product.png", full_page=True)
            print("  Screenshot: /tmp/dutchie-product.png")
        except Exception as e:
            print(f"  ✗ {e}")
        finally:
            await page.close()

        # Test 4: iHJ with longer wait, no networkidle
        print("\n=== Test 4: iheartjane.com/stores ===")
        page = await context.new_page()
        try:
            r = await page.goto("https://www.iheartjane.com/stores", wait_until="domcontentloaded", timeout=30_000)
            print(f"  HTTP: {r.status if r else '?'}")
            await page.wait_for_timeout(8000)
            print(f"  Title: {await page.title()!r}")
            text = await page.text_content("body")
            print(f"  Body chars: {len(text or '')}")
            if text:
                print(f"    sample: {text[:400]}")
            await page.screenshot(path="/tmp/ihj-stores.png")
            print("  Screenshot: /tmp/ihj-stores.png")
        except Exception as e:
            print(f"  ✗ {e}")
        finally:
            await page.close()

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
