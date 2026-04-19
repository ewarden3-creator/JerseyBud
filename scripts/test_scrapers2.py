"""Round 2 — diagnostic deep dive. Find what actually works."""

import asyncio
import json
import re
import httpx

DUTCHIE_GQL = "https://dutchie.com/graphql"
IHJ_BASE = "https://api.iheartjane.com/v1"

HD = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0",
}
HJ = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://www.iheartjane.com/",
}


def banner(t):
    print(f"\n{'=' * 70}\n  {t}\n{'=' * 70}")


# ----- Dutchie -----

async def dutchie_introspect():
    """Ask Dutchie's GraphQL for its schema field names."""
    banner("DUTCHIE — introspect Query type")
    intro = "{ __schema { queryType { fields { name args { name type { name kind ofType { name } } } } } } }"
    async with httpx.AsyncClient() as c:
        r = await c.post(DUTCHIE_GQL, json={"query": intro}, headers=HD, timeout=20)
        print(f"  HTTP {r.status_code}")
        try:
            data = r.json()
            if "errors" in data:
                print("  errors:", data["errors"][:2])
                return
            fields = data["data"]["__schema"]["queryType"]["fields"]
            interesting = [f for f in fields if any(s in f["name"].lower() for s in ["disp", "store", "menu", "product"])]
            print(f"  Found {len(fields)} total query fields, {len(interesting)} interesting:")
            for f in interesting[:30]:
                args = ", ".join(a["name"] for a in (f.get("args") or []))
                print(f"    {f['name']}({args})")
        except Exception as e:
            print(f"  parse error: {e}")
            print(r.text[:500])


async def dutchie_sitemap_dump_nj():
    """Pull the full sitemap and grep for NJ-coded dispensary URLs."""
    banner("DUTCHIE — extract NJ dispensaries from sitemap")
    async with httpx.AsyncClient(follow_redirects=True) as c:
        r = await c.get("https://dutchie.com/sitemap.xml", headers=HD, timeout=30)
        if r.status_code != 200:
            print(f"  HTTP {r.status_code}")
            return
        urls = re.findall(r"<loc>([^<]+)</loc>", r.text)
        print(f"  Total URLs in sitemap: {len(urls)}")
        # Filter to dispensary URLs that mention new-jersey or NJ in some way
        nj_dispo_urls = [
            u for u in urls
            if "/dispensary/" in u and ("new-jersey" in u.lower() or "/nj/" in u.lower())
        ]
        print(f"  NJ dispensary URLs: {len(nj_dispo_urls)}")
        for u in nj_dispo_urls[:8]:
            print(f"    {u}")
        # All dispensary URLs (any state)
        all_dispo = [u for u in urls if "/dispensary/" in u]
        print(f"  All dispensary URLs (any state): {len(all_dispo)}")
        # Sample a few to see the URL shape
        for u in all_dispo[:5]:
            print(f"    sample: {u}")
        # If we found NJ ones, save slugs
        if nj_dispo_urls:
            slugs = [re.search(r"/dispensary/([^/?#]+)", u).group(1) for u in nj_dispo_urls]
            return list(set(slugs))


async def dutchie_per_dispo_test(slug: str):
    """Try fetching info for a single dispensary by slug."""
    banner(f"DUTCHIE — single dispensary fetch: {slug}")
    queries = [
        ("dispensary by slug",
         "query Q($slug: String!) { dispensary(slug: $slug) { id name slug city state } }",
         {"slug": slug}),
        ("filteredDispensaries",
         "query Q($filter: DispensariesFilterInput!) { filteredDispensaries(filter: $filter) { id name city state } }",
         {"filter": {"state": "NJ"}}),
    ]
    async with httpx.AsyncClient() as c:
        for label, query, vars in queries:
            r = await c.post(DUTCHIE_GQL, json={"query": query, "variables": vars}, headers=HD, timeout=20)
            print(f"  [{label}] HTTP {r.status_code}")
            try:
                data = r.json()
                if "errors" in data:
                    print(f"    errors: {[e.get('message') for e in data['errors'][:3]]}")
                else:
                    print(f"    data: {json.dumps(data.get('data'), default=str)[:500]}")
            except Exception as e:
                print(f"    parse: {e} | body: {r.text[:200]}")


# ----- iHeartJane -----

async def ihj_dump_store_structure():
    """Dump the full structure of one iHJ store to see actual field names."""
    banner("iHEARTJANE — dump full structure of one store")
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{IHJ_BASE}/stores", params={"per_page": 1}, headers=HJ, timeout=20)
        print(f"  HTTP {r.status_code}")
        if r.status_code != 200:
            print(r.text[:300])
            return
        data = r.json()
        print(f"  Top-level keys: {list(data.keys())}")
        if "meta" in data:
            print(f"  Meta: {data['meta']}")
        items = data.get("data") or []
        if items:
            sample = items[0]
            print(f"\n  First store full structure:")
            print(json.dumps(sample, indent=2, default=str)[:2000])


async def ihj_search_by_state():
    """Try several different ways to filter iHJ by state."""
    banner("iHEARTJANE — try state filtering variants")
    variants = [
        {"state": "NJ"},
        {"state": "New Jersey"},
        {"filter[state]": "NJ"},
        {"q[state_eq]": "NJ"},
        {"address[state]": "NJ"},
        # Geocoded — Trenton NJ approx
        {"lat": 40.2206, "lng": -74.7597, "radius": 50},
    ]
    async with httpx.AsyncClient() as c:
        for params in variants:
            params = {**params, "per_page": 5}
            r = await c.get(f"{IHJ_BASE}/stores", params=params, headers=HJ, timeout=20)
            data = r.json() if r.status_code == 200 else {}
            stores = data.get("data") or []
            states = set()
            for s in stores:
                attrs = s.get("attributes") or s
                if isinstance(attrs, dict):
                    st = attrs.get("state")
                    if st: states.add(st)
            total = (data.get("meta") or {}).get("total_count")
            print(f"  {params} → HTTP {r.status_code}, {len(stores)} stores, states found: {states or '(no state field)'}, total={total}")


async def ihj_try_legacy_endpoints():
    """Try alternate iHJ endpoints — they may have moved to a newer API."""
    banner("iHEARTJANE — try alternate endpoints")
    urls = [
        "https://api.iheartjane.com/v1/stores?per_page=2",
        "https://api.iheartjane.com/v2/stores?per_page=2",
        "https://search.iheartjane.com/stores",
    ]
    async with httpx.AsyncClient() as c:
        for url in urls:
            try:
                r = await c.get(url, headers=HJ, timeout=10)
                print(f"  GET {url} → {r.status_code}, body: {r.text[:200]}")
            except Exception as e:
                print(f"  ✗ {url} → {e}")


async def main():
    await dutchie_introspect()
    slugs = await dutchie_sitemap_dump_nj()
    if slugs:
        await dutchie_per_dispo_test(slugs[0])
    await ihj_dump_store_structure()
    await ihj_search_by_state()
    await ihj_try_legacy_endpoints()


if __name__ == "__main__":
    asyncio.run(main())
