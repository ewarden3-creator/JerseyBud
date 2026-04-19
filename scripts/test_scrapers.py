"""
Standalone scraper smoke test — hits Dutchie + iHeartJane real endpoints
and prints what comes back. No backend dependencies.

Goal: confirm the API endpoints respond and our query shapes are close enough
to work, before we deploy. Iterate locally if anything breaks.
"""

import asyncio
import json
import sys
import httpx

DUTCHIE_GQL = "https://dutchie.com/graphql"
IHJ_BASE = "https://api.iheartjane.com/v1"

HEADERS_DUTCHIE = {
    "Content-Type": "application/json",
    "apollographql-client-name": "dutchie-plus",
    "apollographql-client-version": "1.0.0",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
}

HEADERS_IHJ = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Referer": "https://www.iheartjane.com/",
}

DUTCHIE_DISPENSARIES_QUERY = """
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
  }
}
"""


def banner(title: str):
    print(f"\n{'=' * 70}")
    print(f"  {title}")
    print(f"{'=' * 70}")


async def test_dutchie_dispensaries():
    banner("DUTCHIE — fetch NJ dispensaries via GraphQL")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                DUTCHIE_GQL,
                json={"query": DUTCHIE_DISPENSARIES_QUERY, "variables": {"state": "NJ"}},
                headers=HEADERS_DUTCHIE,
                timeout=30,
            )
            print(f"  HTTP {resp.status_code}")
            if resp.status_code != 200:
                print(f"  Body: {resp.text[:400]}")
                return None
            data = resp.json()
            if "errors" in data:
                print(f"  GraphQL errors:")
                for e in data["errors"][:5]:
                    print(f"    - {e.get('message', e)}")
                return None
            dispensaries = (data.get("data") or {}).get("dispensaries") or []
            print(f"  ✓ Found {len(dispensaries)} NJ dispensaries")
            for d in dispensaries[:5]:
                print(f"    - {d.get('name')} ({d.get('city')}) · slug={d.get('slug')}")
            if len(dispensaries) > 5:
                print(f"    ... and {len(dispensaries) - 5} more")
            return dispensaries
        except Exception as e:
            print(f"  ✗ Exception: {type(e).__name__}: {e}")
            return None


async def test_dutchie_sitemap_fallback():
    banner("DUTCHIE — sitemap fallback (in case GQL fails)")
    async with httpx.AsyncClient(follow_redirects=True) as client:
        for url in [
            "https://dutchie.com/sitemap-index.xml",
            "https://dutchie.com/sitemap.xml",
            "https://dutchie.com/dispensaries-sitemap.xml",
        ]:
            try:
                resp = await client.get(url, headers=HEADERS_DUTCHIE, timeout=20)
                print(f"  GET {url} → {resp.status_code}, {len(resp.content)} bytes")
                if resp.status_code == 200:
                    snippet = resp.text[:600]
                    print(f"    snippet: {snippet[:300]}…")
                    return resp.text
            except Exception as e:
                print(f"  ✗ {url} → {type(e).__name__}: {e}")
    return None


async def test_iheartjane_stores():
    banner("iHEARTJANE — fetch NJ stores via REST")
    async with httpx.AsyncClient() as client:
        for path, params in [
            ("/stores", {"state": "NJ", "page": 1, "per_page": 50}),
            ("/stores", {"filter[state]": "NJ", "per_page": 50}),
            ("/stores/search", {"state": "NJ"}),
        ]:
            try:
                resp = await client.get(f"{IHJ_BASE}{path}", params=params, headers=HEADERS_IHJ, timeout=30)
                print(f"  GET {path} {dict(params)} → {resp.status_code}")
                if resp.status_code == 200:
                    data = resp.json()
                    stores = data.get("data") or data.get("stores") or []
                    print(f"  ✓ Got {len(stores)} stores")
                    if stores:
                        sample = stores[0]
                        keys = list(sample.keys())[:8]
                        print(f"    Sample keys: {keys}")
                        attrs = sample.get("attributes") or sample
                        nj_count = sum(1 for s in stores if (
                            (s.get("attributes", {}).get("state") or s.get("state")) == "NJ"
                        ))
                        print(f"    NJ confirmed: {nj_count}")
                        for s in stores[:3]:
                            a = s.get("attributes") or s
                            print(f"      - {a.get('name')} · {a.get('city')}, {a.get('state')}")
                    return stores
                else:
                    print(f"    Body: {resp.text[:300]}")
            except Exception as e:
                print(f"  ✗ {path} → {type(e).__name__}: {e}")
        return None


async def test_iheartjane_alternate():
    banner("iHEARTJANE — alternate algolia/search index check")
    async with httpx.AsyncClient() as client:
        for url in [
            "https://api.iheartjane.com/v1/dispensaries?state=NJ",
            "https://www.iheartjane.com/api/stores?state=NJ",
        ]:
            try:
                resp = await client.get(url, headers=HEADERS_IHJ, timeout=20)
                print(f"  GET {url} → {resp.status_code}")
                if resp.status_code == 200:
                    print(f"    body: {resp.text[:300]}…")
            except Exception as e:
                print(f"  ✗ {url} → {type(e).__name__}: {e}")


async def main():
    await test_dutchie_dispensaries()
    await test_dutchie_sitemap_fallback()
    await test_iheartjane_stores()
    await test_iheartjane_alternate()


if __name__ == "__main__":
    asyncio.run(main())
