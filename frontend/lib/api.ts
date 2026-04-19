import { mock } from "./mockData";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const USE_MOCK = !BASE || process.env.NEXT_PUBLIC_USE_MOCK === "true";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

// Mimic network latency so loading states render naturally in mock mode
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const mockReturn = async <T>(value: T, ms = 200): Promise<T> => { await sleep(ms); return value; };

export const api = {
  deals: (params?: Record<string, string>) => USE_MOCK
    ? mockReturn(mock.deals)
    : apiFetch<DealOut[]>(`/deals?${new URLSearchParams(params)}`),

  trends: (category = "flower") => USE_MOCK
    ? mockReturn(mock.trends)
    : apiFetch<TrendEntry[]>(`/trends?category=${category}`),

  products: (params: Record<string, string>) => USE_MOCK
    ? mockReturn(filterMockProducts(params))
    : apiFetch<ProductOut[]>(`/products?${new URLSearchParams(params)}`),

  product: (id: number, lat?: number, lng?: number) => USE_MOCK
    ? mockReturn(mock.products.find((p) => p.id === id) ?? mock.products[0])
    : apiFetch<ProductOut>(`/products/${id}${lat ? `?lat=${lat}&lng=${lng}` : ""}`),

  priceHistory: (id: number) => USE_MOCK
    ? mockReturn(mock.priceHistoryFor(id))
    : apiFetch<PriceHistoryPoint[]>(`/products/${id}/price-history`),

  labHistory: (id: number) => USE_MOCK
    ? mockReturn(mock.labHistoryFor(id))
    : apiFetch<LabHistoryEntry[]>(`/products/${id}/lab-history`),

  strainCompare: (name: string, params?: Record<string, string>) => USE_MOCK
    ? mockReturn(mock.strainCompareFor(name))
    : apiFetch<PriceCompareEntry[]>(`/products/strain/${encodeURIComponent(name)}/compare?${new URLSearchParams(params)}`),

  strainMedianPrice: (name: string) => USE_MOCK
    ? mockReturn(mock.medianPriceFor(name))
    : apiFetch<MedianPriceOut[]>(`/products/strain/${encodeURIComponent(name)}/median-price`),

  dispensaries: (params?: Record<string, string>) => USE_MOCK
    ? mockReturn(filterMockDispensaries(params))
    : apiFetch<DispensaryOut[]>(`/dispensaries?${new URLSearchParams(params)}`),

  dispensary: (slug: string) => USE_MOCK
    ? mockReturn(mock.dispensaries.find((d) => d.slug === slug) ?? mock.dispensaries[0])
    : apiFetch<DispensaryOut>(`/dispensaries/${slug}`),

  menu: (slug: string, params?: Record<string, string>) => USE_MOCK
    ? mockReturn(mock.products.filter((p) => p.dispensary.slug === slug))
    : apiFetch<ProductOut[]>(`/dispensaries/${slug}/menu?${new URLSearchParams(params)}`),

  reportIssue: (slug: string, body: object) => USE_MOCK
    ? mockReturn({ status: "received" })
    : apiFetch(`/dispensaries/${slug}/report`, { method: "POST", body: JSON.stringify(body) }),

  createAlert: (body: object) => USE_MOCK
    ? mockReturn(body)
    : apiFetch(`/alerts`, { method: "POST", body: JSON.stringify(body) }),
  alerts: (deviceId: string) => USE_MOCK
    ? mockReturn(mock.alerts)
    : apiFetch<AlertOut[]>(`/alerts/${deviceId}`),
  deleteAlert: (id: number, deviceId: string) => USE_MOCK
    ? mockReturn({})
    : apiFetch(`/alerts/${id}?device_id=${deviceId}`, { method: "DELETE" }),

  addFavorite: (body: object) => USE_MOCK
    ? mockReturn(body)
    : apiFetch(`/favorites`, { method: "POST", body: JSON.stringify(body) }),
  favorites: (deviceId: string) => USE_MOCK
    ? mockReturn(mock.favorites)
    : apiFetch<FavoriteOut[]>(`/favorites/${deviceId}`),
  removeFavorite: (id: number, deviceId: string) => USE_MOCK
    ? mockReturn({})
    : apiFetch(`/favorites/${id}?device_id=${deviceId}`, { method: "DELETE" }),

  recommend: (body: { query: string;[k: string]: any }) => USE_MOCK
    ? mockReturn(mock.recommend(body.query), 800)  // longer to feel like LLM thinking
    : apiFetch<RecommendResponse>(`/recommend`, { method: "POST", body: JSON.stringify(body) }),

  filterOptions: () => USE_MOCK
    ? mockReturn(mock.filterOptions)
    : apiFetch<FilterOptions>(`/meta/filters`),

  // Brands
  brands: (params?: Record<string, string>) => USE_MOCK
    ? mockReturn(mock.brands)
    : apiFetch<BrandSummary[]>(`/brands?${new URLSearchParams(params)}`),
  brand: (name: string) => USE_MOCK
    ? mockReturn(mock.brands.find((b) => b.name === name) ?? mock.brands[0])
    : apiFetch<BrandSummary>(`/brands/${encodeURIComponent(name)}`),
  brandProducts: (name: string) => USE_MOCK
    ? mockReturn(mock.products.filter((p) => p.brand === name))
    : apiFetch<ProductOut[]>(`/brands/${encodeURIComponent(name)}/products`),
  drops: (params?: Record<string, string>) => USE_MOCK
    ? mockReturn(mock.drops)
    : apiFetch<BrandDrop[]>(`/brands/drops?${new URLSearchParams(params ?? {})}`),

  // Shopping list
  shoppingList: (deviceId: string) => USE_MOCK
    ? mockReturn(mock.shoppingListFor(deviceId))
    : apiFetch<ShoppingListSummary>(`/shopping-list?device_id=${deviceId}`),
  addToList: (body: { product_id: number; weight: string; quantity?: number; device_id?: string; target_price?: number; notes?: string }) => USE_MOCK
    ? mockReturn(mock.addToList(body))
    : apiFetch<ShoppingItem>(`/shopping-list/items`, { method: "POST", body: JSON.stringify(body) }),
  removeFromList: (id: number, deviceId: string) => USE_MOCK
    ? mockReturn(mock.removeFromList(id))
    : apiFetch(`/shopping-list/items/${id}?device_id=${deviceId}`, { method: "DELETE" }),

  // Taste judgments
  judge: (body: { verdict: string; product_id?: number; strain_name?: string; brand_name?: string; note?: string; device_id?: string }) => USE_MOCK
    ? mockReturn(mock.judge(body))
    : apiFetch<TasteJudgment>(`/taste`, { method: "POST", body: JSON.stringify(body) }),
  checkTaste: (params: { product_id?: number; strain_name?: string; brand_name?: string; device_id?: string }) => USE_MOCK
    ? mockReturn(mock.checkTaste(params))
    : apiFetch<TasteCheck>(`/taste/check?${new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))}`),
};

function filterMockProducts(params: Record<string, string>): ProductOut[] {
  let out = [...mock.products];
  if (params.dispensary_slug) out = out.filter((p) => p.dispensary.slug === params.dispensary_slug);
  else if (params.dispensary_slugs) {
    const allowed = new Set(params.dispensary_slugs.split(",").filter(Boolean));
    out = out.filter((p) => allowed.has(p.dispensary.slug));
  }
  if (params.radius_miles) {
    const max = parseFloat(params.radius_miles);
    out = out.filter((p) => (p.distance_miles ?? 0) <= max);
  }
  if (params.category) out = out.filter((p) => p.category === params.category);
  if (params.product_type) out = out.filter((p) => p.product_type === params.product_type);
  if (params.on_sale === "true") out = out.filter((p) => p.is_on_sale);
  if (params.min_thc) out = out.filter((p) => (p.thc_pct ?? 0) >= +params.min_thc);
  if (params.max_thc) out = out.filter((p) => (p.thc_pct ?? 99) <= +params.max_thc);
  if (params.max_price_per_gram) out = out.filter((p) => (p.best_price_per_gram ?? 999) <= +params.max_price_per_gram);
  if (params.search) {
    const q = params.search.toLowerCase();
    out = out.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q)
    );
  }
  if (params.sort === "price_per_gram") out.sort((a, b) => (a.best_price_per_gram ?? 999) - (b.best_price_per_gram ?? 999));
  if (params.sort === "thc") out.sort((a, b) => (b.thc_pct ?? 0) - (a.thc_pct ?? 0));
  if (params.sort === "sale") out.sort((a, b) => (b.sale_pct_off ?? 0) - (a.sale_pct_off ?? 0));
  if (params.sort === "distance") out.sort((a, b) => (a.distance_miles ?? 999) - (b.distance_miles ?? 999));

  const offset = +(params.offset ?? "0");
  const limit = +(params.limit ?? "50");
  return out.slice(offset, offset + limit);
}

function filterMockDispensaries(params?: Record<string, string>): DispensaryOut[] {
  if (!params) return mock.dispensaries;
  let out = [...mock.dispensaries];
  if (params.open_now === "true") out = out.filter((d) => d.is_open_now);
  if (params.delivery === "true") out = out.filter((d) => d.delivery);
  if (params.medical === "true") out = out.filter((d) => d.medical);
  return out.sort((a, b) => (a.distance_miles ?? 999) - (b.distance_miles ?? 999));
}
