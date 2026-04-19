"""Round 5 — discover real NJ dispensary slugs from the sitemap, validate one."""

import asyncio
import re
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

        # Step 1: Pull the dutchie sitemap via the browser
        print("=== Step 1: Fetch dutchie sitemap via browser ===")
        page = await context.new_page()
        await page.goto("https://dutchie.com/sitemap.xml", wait_until="load", timeout=30_000)
        # The XML is shown as raw text inside <pre> on Chromium
        body = await page.content()
        print(f"  body chars: {len(body)}")

        # Extract dispensary URLs that mention new-jersey
        all_urls = re.findall(r"<loc>([^<]+)</loc>", body)
        print(f"  total URLs in sitemap: {len(all_urls)}")
        nj_dispo_urls = [u for u in all_urls if "/dispensary/" in u and "new-jersey" in u.lower()]
        print(f"  NJ dispensary URLs: {len(nj_dispo_urls)}")
        # Sample some
        for u in nj_dispo_urls[:5]:
            print(f"    {u}")

        # Extract the slug from the URL pattern: /dispensary/<slug>/...
        nj_slugs = []
        for u in nj_dispo_urls:
            m = re.search(r"/dispensary/([^/?#]+)", u)
            if m:
                nj_slugs.append(m.group(1))
        nj_slugs = list(dict.fromkeys(nj_slugs))  # dedupe, preserve order
        print(f"\n  Unique NJ slugs ({len(nj_slugs)}): {nj_slugs[:15]}")
        await page.close()

        if not nj_slugs:
            print("\n  No NJ slugs found in sitemap. Trying alternate filter…")
            # Try just 'nj' or specific cities
            other = [u for u in all_urls if "/dispensary/" in u and any(s in u.lower() for s in ["jersey", "newark", "trenton", "bellmawr"])]
            print(f"  Alt-filtered: {len(other)} urls")
            for u in other[:5]:
                print(f"    {u}")
            await browser.close()
            return

        # Step 2: Validate the first slug by visiting its menu
        slug = nj_slugs[0]
        print(f"\n=== Step 2: Validate slug '{slug}' by visiting menu ===")
        page = await context.new_page()
        captured = []

        async def on_resp(response):
            url = response.url
            if "/graphql" not in url:
                return
            try:
                body = await response.json()
                parsed = urllib.parse.urlparse(url)
                qs = urllib.parse.parse_qs(parsed.query)
                op = qs.get("operationName", ["?"])[0]
                vars_raw = qs.get("variables", ["{}"])[0]
                try:
                    variables = json.loads(urllib.parse.unquote(vars_raw))
                except Exception:
                    variables = vars_raw
                captured.append({
                    "operation": op,
                    "variables": variables,
                    "data": body.get("data"),
                })
            except Exception:
                pass

        page.on("response", on_resp)

        await page.goto(f"https://dutchie.com/dispensary/{slug}", wait_until="domcontentloaded", timeout=30_000)
        await page.wait_for_timeout(15_000)
        print(f"  page title: {await page.title()!r}")

        print(f"\n  Captured {len(captured)} GraphQL operations:")
        for c in captured:
            data = c["data"]
            if data is None:
                print(f"    ✗ {c['operation']} — no data")
                continue
            keys = list(data.keys()) if isinstance(data, dict) else []
            sample = json.dumps(data)[:600]
            print(f"    ✓ {c['operation']} → keys={keys}")
            if "filteredDispensaries" in keys:
                fd = data["filteredDispensaries"]
                print(f"      filteredDispensaries count: {len(fd) if isinstance(fd, list) else '(not list)'}")
                if fd:
                    print(f"      first: {json.dumps(fd[0])[:500]}")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
