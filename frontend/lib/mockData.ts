// Mock data so the UI renders fully populated without the backend.
// Real NJ dispensaries + brands + strains for a realistic visual review.

const NJ_DISPENSARIES: DispensaryOut[] = [
  {
    id: 1, slug: "dutchie-curaleaf-bellmawr",
    name: "Curaleaf Bellmawr", address: "32 W Browning Rd",
    city: "Bellmawr", zip_code: "08031",
    lat: 39.864, lng: -75.092,
    phone: "(856) 312-9001", website: "https://dutchie.com/dispensary/curaleaf-bellmawr",
    logo_url: null, source: "dutchie",
    nj_license_number: "RE000165", nj_license_url: null,
    opening_year: 2022, medical: true, recreational: true,
    wheelchair_accessible: true, delivery: false, curbside_pickup: true, atm: true,
    hours: { mon: "9 AM - 9 PM", tue: "9 AM - 9 PM", wed: "9 AM - 9 PM", thu: "9 AM - 9 PM", fri: "9 AM - 10 PM", sat: "9 AM - 10 PM", sun: "10 AM - 7 PM" },
    is_open_now: true, distance_miles: 2.1,
  },
  {
    id: 2, slug: "ihj-rise-paterson",
    name: "RISE Paterson", address: "525 River St",
    city: "Paterson", zip_code: "07524",
    lat: 40.917, lng: -74.171,
    phone: "(862) 207-0001", website: "https://www.iheartjane.com/stores/rise-paterson",
    logo_url: null, source: "iheartjane",
    nj_license_number: "RE000089", nj_license_url: null,
    opening_year: 2021, medical: true, recreational: true,
    wheelchair_accessible: true, delivery: true, curbside_pickup: true, atm: true,
    hours: { mon: "10 AM - 8 PM", tue: "10 AM - 8 PM", wed: "10 AM - 8 PM", thu: "10 AM - 8 PM", fri: "10 AM - 9 PM", sat: "10 AM - 9 PM", sun: "11 AM - 6 PM" },
    is_open_now: true, distance_miles: 4.7,
  },
  {
    id: 3, slug: "dutchie-apothecarium-maplewood",
    name: "The Apothecarium Maplewood", address: "1865 Springfield Ave",
    city: "Maplewood", zip_code: "07040",
    lat: 40.726, lng: -74.273,
    phone: "(973) 327-9006", website: "https://dutchie.com/dispensary/apothecarium-maplewood",
    logo_url: null, source: "dutchie",
    nj_license_number: "RE000042", nj_license_url: null,
    opening_year: 2022, medical: true, recreational: true,
    wheelchair_accessible: true, delivery: true, curbside_pickup: true, atm: false,
    hours: { mon: "10 AM - 8 PM", tue: "10 AM - 8 PM", wed: "10 AM - 8 PM", thu: "10 AM - 8 PM", fri: "10 AM - 8 PM", sat: "10 AM - 8 PM", sun: "10 AM - 7 PM" },
    is_open_now: true, distance_miles: 1.3,
  },
  {
    id: 4, slug: "dutchie-zen-leaf-elizabeth",
    name: "Zen Leaf Elizabeth", address: "1119 Elizabeth Ave",
    city: "Elizabeth", zip_code: "07201",
    lat: 40.661, lng: -74.198,
    phone: "(908) 232-0001", website: "https://dutchie.com/dispensary/zen-leaf-elizabeth",
    logo_url: null, source: "dutchie",
    nj_license_number: "RE000201", nj_license_url: null,
    opening_year: 2023, medical: false, recreational: true,
    wheelchair_accessible: true, delivery: false, curbside_pickup: true, atm: true,
    hours: { mon: "9 AM - 9 PM", tue: "9 AM - 9 PM", wed: "9 AM - 9 PM", thu: "9 AM - 9 PM", fri: "9 AM - 10 PM", sat: "9 AM - 10 PM", sun: "10 AM - 7 PM" },
    is_open_now: false, distance_miles: 6.2,
  },
  {
    id: 5, slug: "ihj-ascend-rochelle-park",
    name: "Ascend Rochelle Park", address: "315 Rochelle Ave",
    city: "Rochelle Park", zip_code: "07662",
    lat: 40.913, lng: -74.077,
    phone: "(201) 555-0142", website: "https://www.iheartjane.com/stores/ascend-rochelle-park",
    logo_url: null, source: "iheartjane",
    nj_license_number: "RE000118", nj_license_url: null,
    opening_year: 2022, medical: true, recreational: true,
    wheelchair_accessible: true, delivery: true, curbside_pickup: true, atm: true,
    hours: { mon: "9 AM - 8 PM", tue: "9 AM - 8 PM", wed: "9 AM - 8 PM", thu: "9 AM - 8 PM", fri: "9 AM - 9 PM", sat: "9 AM - 9 PM", sun: "10 AM - 6 PM" },
    is_open_now: true, distance_miles: 8.4,
  },
  {
    id: 6, slug: "dutchie-botanist-egg-harbor",
    name: "The Botanist Egg Harbor", address: "100 Black Horse Pike",
    city: "Egg Harbor Township", zip_code: "08234",
    lat: 39.378, lng: -74.595,
    phone: "(609) 568-0001", website: "https://dutchie.com/dispensary/botanist-egg-harbor",
    logo_url: null, source: "dutchie",
    nj_license_number: "RE000007", nj_license_url: null,
    opening_year: 2019, medical: true, recreational: true,
    wheelchair_accessible: true, delivery: false, curbside_pickup: true, atm: true,
    hours: { mon: "9 AM - 8 PM", tue: "9 AM - 8 PM", wed: "9 AM - 8 PM", thu: "9 AM - 8 PM", fri: "9 AM - 9 PM", sat: "9 AM - 9 PM", sun: "10 AM - 7 PM" },
    is_open_now: true, distance_miles: 12.8,
  },
];

function makePricing(eighth: number, isOnSale: boolean = false): PricingEntry[] {
  const discount = isOnSale ? 0.7 : 1;
  return [
    { weight: "1g",   price: +(eighth * 0.32 * discount).toFixed(2), original_price: isOnSale ? +(eighth * 0.32).toFixed(2) : undefined, price_per_gram: +(eighth * 0.32 * discount).toFixed(2), grams: 1 },
    { weight: "3.5g", price: +(eighth * discount).toFixed(2),         original_price: isOnSale ? eighth : undefined,                       price_per_gram: +((eighth * discount) / 3.5).toFixed(2), grams: 3.5 },
    { weight: "7g",   price: +(eighth * 1.85 * discount).toFixed(2),  original_price: isOnSale ? +(eighth * 1.85).toFixed(2) : undefined,  price_per_gram: +((eighth * 1.85 * discount) / 7).toFixed(2), grams: 7 },
    { weight: "14g",  price: +(eighth * 3.5 * discount).toFixed(2),   original_price: isOnSale ? +(eighth * 3.5).toFixed(2) : undefined,   price_per_gram: +((eighth * 3.5 * discount) / 14).toFixed(2), grams: 14 },
    { weight: "28g",  price: +(eighth * 6.6 * discount).toFixed(2),   original_price: isOnSale ? +(eighth * 6.6).toFixed(2) : undefined,   price_per_gram: +((eighth * 6.6 * discount) / 28).toFixed(2), grams: 28 },
  ];
}

interface RawProduct {
  strain: string;
  type: string;
  thc: number;
  cbd: number;
  brand: string;
  eighth: number;
  sale: boolean;
  pctOff: number;
  terps: Record<string, number>;
  effects: string[];
  canna: Record<string, number>;
}

const RAW_PRODUCTS: RawProduct[] = [
  { strain: "GG4",                  type: "hybrid", thc: 28.4, cbd: 0.1, brand: "Verano",       eighth: 50, sale: true,  pctOff: 30, terps: { myrcene: 0.42, caryophyllene: 0.38, limonene: 0.21, pinene: 0.14, humulene: 0.09 }, effects: ["relaxed", "happy", "euphoric"], canna: { thca: 24.1, cbg: 0.4, cbn: 0.1 } },
  { strain: "Wedding Cake",         type: "indica", thc: 26.2, cbd: 0.0, brand: "Curaleaf",     eighth: 55, sale: false, pctOff: 0,  terps: { caryophyllene: 0.51, limonene: 0.34, myrcene: 0.18, linalool: 0.12 }, effects: ["relaxed", "sleepy", "happy"], canna: { thca: 22.8, cbg: 0.3 } },
  { strain: "Blue Dream",           type: "sativa", thc: 22.1, cbd: 0.2, brand: "Garden Greens",eighth: 40, sale: true,  pctOff: 25, terps: { myrcene: 0.62, pinene: 0.41, caryophyllene: 0.23, limonene: 0.18 }, effects: ["creative", "uplifted", "euphoric"], canna: { thca: 19.4, cbg: 0.2 } },
  { strain: "Pineapple Express",    type: "hybrid", thc: 24.7, cbd: 0.0, brand: "Hillview",     eighth: 45, sale: false, pctOff: 0,  terps: { ocimene: 0.33, caryophyllene: 0.28, limonene: 0.41, terpinolene: 0.19 }, effects: ["happy", "uplifted", "energetic"], canna: { thca: 21.2 } },
  { strain: "Northern Lights",      type: "indica", thc: 23.9, cbd: 0.1, brand: "Aeriz",        eighth: 48, sale: true,  pctOff: 35, terps: { myrcene: 0.71, caryophyllene: 0.32, limonene: 0.14, pinene: 0.08 }, effects: ["sleepy", "relaxed", "hungry"], canna: { thca: 20.8, cbn: 0.4 } },
  { strain: "Sour Diesel",          type: "sativa", thc: 25.3, cbd: 0.0, brand: "Cookies",      eighth: 60, sale: false, pctOff: 0,  terps: { caryophyllene: 0.43, limonene: 0.38, myrcene: 0.27, terpinolene: 0.21 }, effects: ["energetic", "uplifted", "focused"], canna: { thca: 22.4, cbg: 0.5 } },
  { strain: "OG Kush",              type: "hybrid", thc: 27.1, cbd: 0.0, brand: "Verano",       eighth: 52, sale: false, pctOff: 0,  terps: { myrcene: 0.48, limonene: 0.37, caryophyllene: 0.31, linalool: 0.18 }, effects: ["relaxed", "euphoric", "happy"], canna: { thca: 23.6 } },
  { strain: "Granddaddy Purple",    type: "indica", thc: 21.8, cbd: 0.1, brand: "Kind Tree",    eighth: 38, sale: true,  pctOff: 40, terps: { myrcene: 0.58, pinene: 0.21, caryophyllene: 0.18, linalool: 0.27 }, effects: ["sleepy", "relaxed", "happy"], canna: { thca: 18.9, cbn: 0.3, cbg: 0.2 } },
  { strain: "Jack Herer",           type: "sativa", thc: 23.4, cbd: 0.0, brand: "Grassroots",   eighth: 46, sale: false, pctOff: 0,  terps: { terpinolene: 0.62, pinene: 0.41, caryophyllene: 0.23, ocimene: 0.18 }, effects: ["focused", "creative", "uplifted"], canna: { thca: 20.1 } },
  { strain: "Skywalker OG",         type: "indica", thc: 26.5, cbd: 0.0, brand: "Curaleaf",     eighth: 50, sale: true,  pctOff: 20, terps: { myrcene: 0.51, caryophyllene: 0.34, limonene: 0.28, linalool: 0.21 }, effects: ["relaxed", "sleepy", "euphoric"], canna: { thca: 22.7, cbn: 0.2 } },
  { strain: "Zkittlez",             type: "indica", thc: 22.9, cbd: 0.1, brand: "Hillview",     eighth: 42, sale: false, pctOff: 0,  terps: { caryophyllene: 0.41, limonene: 0.52, humulene: 0.18, linalool: 0.14 }, effects: ["happy", "relaxed", "uplifted"], canna: { thca: 19.8, cbg: 0.3 } },
  { strain: "Runtz",                type: "hybrid", thc: 29.1, cbd: 0.0, brand: "Cookies",      eighth: 65, sale: false, pctOff: 0,  terps: { caryophyllene: 0.47, limonene: 0.41, myrcene: 0.28, linalool: 0.19 }, effects: ["euphoric", "relaxed", "happy"], canna: { thca: 25.4, cbg: 0.4 } },
  { strain: "Gelato",               type: "hybrid", thc: 25.8, cbd: 0.0, brand: "Cookies",      eighth: 55, sale: true,  pctOff: 25, terps: { caryophyllene: 0.38, limonene: 0.34, humulene: 0.21, linalool: 0.18 }, effects: ["happy", "relaxed", "creative"], canna: { thca: 22.1, cbg: 0.2 } },
  { strain: "Purple Punch",         type: "indica", thc: 24.2, cbd: 0.0, brand: "Aeriz",        eighth: 44, sale: false, pctOff: 0,  terps: { myrcene: 0.52, pinene: 0.18, caryophyllene: 0.31, linalool: 0.24 }, effects: ["sleepy", "relaxed", "happy"], canna: { thca: 21.0, cbn: 0.3 } },
  { strain: "Strawberry Cough",     type: "sativa", thc: 21.4, cbd: 0.1, brand: "Garden Greens",eighth: 38, sale: true,  pctOff: 30, terps: { myrcene: 0.32, caryophyllene: 0.28, limonene: 0.41, pinene: 0.21 }, effects: ["uplifted", "happy", "creative"], canna: { thca: 18.6 } },
];

const MOCK_PRODUCTS: ProductOut[] = RAW_PRODUCTS.flatMap((p, idx): ProductOut[] => {
  // Each strain shows up at 2-3 dispensaries with slight price variation
  const dispensaries = NJ_DISPENSARIES.slice(0, 2 + (idx % 3));
  return dispensaries.map((d, i): ProductOut => {
    const eighthPrice = p.eighth + (i * 3) - 2;
    const pricing = makePricing(eighthPrice, p.sale && i === 0);
    const totalTerps = +Object.values(p.terps).reduce((s, v) => s + v, 0).toFixed(2);
    return {
      id: idx * 10 + i + 100,
      source_id: `mock-${idx}-${i}`,
      name: p.strain,
      brand: p.brand,
      strain_name: p.strain,
      category: "flower",
      subcategory: null,
      product_type: p.type,
      thc_pct: p.thc + (i * 0.4) - 0.2,
      cbd_pct: p.cbd,
      cannabinoids: p.canna,
      terpenes: p.terps,
      total_terpenes_pct: totalTerps,
      effects: p.effects,
      pricing,
      is_on_sale: p.sale && i === 0,
      sale_pct_off: p.sale && i === 0 ? p.pctOff : null,
      best_price_per_gram: Math.min(...pricing.map((e) => e.price_per_gram ?? 999)),
      image_url: null,
      in_stock: true,
      batch_id: `B${1000 + idx * 10 + i}`,
      harvest_date: new Date(Date.now() - (idx * 7 + i * 3) * 86400000).toISOString().slice(0, 10),
      dispensary: d,
      distance_miles: d.distance_miles,
    };
  });
});

const MOCK_DEALS: DealOut[] = MOCK_PRODUCTS
  .filter((p) => p.is_on_sale)
  .map((p) => {
    const best = p.pricing!.find((e) => "original_price" in e)!;
    return {
      product: p,
      best_price: best.price,
      best_weight: best.weight,
      best_price_per_gram: best.price_per_gram ?? null,
      original_price: best.original_price ?? null,
      sale_pct_off: p.sale_pct_off,
      dispensary_name: p.dispensary.name,
      dispensary_city: p.dispensary.city,
      distance_miles: p.distance_miles,
    };
  });

const MOCK_TRENDS: TrendEntry[] = [
  { strain_name: "GG4",              category: "flower", product_type: "hybrid", avg_thc: 28.1, avg_total_terpenes: 1.24, dispensary_count: 11, avg_price_eighth: 49, avg_price_per_gram: 14.0 },
  { strain_name: "Wedding Cake",     category: "flower", product_type: "indica", avg_thc: 26.0, avg_total_terpenes: 1.15, dispensary_count: 10, avg_price_eighth: 54, avg_price_per_gram: 15.4 },
  { strain_name: "Runtz",            category: "flower", product_type: "hybrid", avg_thc: 29.0, avg_total_terpenes: 1.35, dispensary_count: 8,  avg_price_eighth: 64, avg_price_per_gram: 18.3 },
  { strain_name: "Gelato",           category: "flower", product_type: "hybrid", avg_thc: 25.6, avg_total_terpenes: 1.11, dispensary_count: 9,  avg_price_eighth: 53, avg_price_per_gram: 15.1 },
  { strain_name: "Blue Dream",       category: "flower", product_type: "sativa", avg_thc: 22.0, avg_total_terpenes: 1.44, dispensary_count: 12, avg_price_eighth: 41, avg_price_per_gram: 11.7 },
  { strain_name: "Northern Lights",  category: "flower", product_type: "indica", avg_thc: 23.7, avg_total_terpenes: 1.25, dispensary_count: 7,  avg_price_eighth: 47, avg_price_per_gram: 13.4 },
  { strain_name: "Sour Diesel",      category: "flower", product_type: "sativa", avg_thc: 25.1, avg_total_terpenes: 1.29, dispensary_count: 9,  avg_price_eighth: 59, avg_price_per_gram: 16.9 },
  { strain_name: "OG Kush",          category: "flower", product_type: "hybrid", avg_thc: 26.9, avg_total_terpenes: 1.34, dispensary_count: 10, avg_price_eighth: 51, avg_price_per_gram: 14.6 },
];

const MOCK_FILTER_OPTIONS: FilterOptions = {
  cannabinoids: [
    { key: "thc",   label: "THC",   group: "major" },
    { key: "thca",  label: "THCa",  group: "major" },
    { key: "d9",    label: "D9",    group: "major" },
    { key: "cbd",   label: "CBD",   group: "major" },
    { key: "cbda",  label: "CBDa",  group: "major" },
    { key: "cbn",   label: "CBN",   group: "minor" },
    { key: "cbg",   label: "CBG",   group: "minor" },
    { key: "cbc",   label: "CBC",   group: "minor" },
    { key: "thcv",  label: "THCV",  group: "minor" },
    { key: "cbdv",  label: "CBDV",  group: "minor" },
    { key: "cbl",   label: "CBL",   group: "rare" },
  ],
  terpenes: [
    { key: "beta_myrcene",       label: "Beta Myrcene",       group: "common" },
    { key: "beta_caryophyllene", label: "Beta Caryophyllene", group: "common" },
    { key: "limonene",           label: "Limonene",           group: "common" },
    { key: "alpha_pinene",       label: "Alpha Pinene",       group: "common" },
    { key: "linalool",           label: "Linalool",           group: "common" },
    { key: "alpha_humulene",     label: "Alpha Humulene",     group: "common" },
    { key: "terpinolene",        label: "Terpinolene",        group: "common" },
    { key: "ocimene",            label: "Ocimene",            group: "common" },
    { key: "alpha_bisabolol",    label: "Alpha Bisabolol",    group: "common" },
    { key: "camphene",           label: "Camphene",           group: "secondary" },
    { key: "valencene",          label: "Valencene",          group: "secondary" },
    { key: "nerolidol",          label: "Nerolidol",          group: "secondary" },
    { key: "geraniol",           label: "Geraniol",           group: "secondary" },
  ],
  categories: [
    { key: "flower",      label: "Flower" },
    { key: "concentrate", label: "Concentrate" },
    { key: "edible",      label: "Edible" },
    { key: "vaporizer",   label: "Vape" },
    { key: "pre-roll",    label: "Pre-Roll" },
  ],
  product_types: [
    { key: "sativa",  label: "Sativa" },
    { key: "indica",  label: "Indica" },
    { key: "hybrid",  label: "Hybrid" },
  ],
  weight_options: [
    { key: "1g",   label: "1g",       grams: 1.0 },
    { key: "3.5g", label: "1/8 oz",  grams: 3.5 },
    { key: "7g",   label: "1/4 oz",  grams: 7.0 },
    { key: "14g",  label: "1/2 oz",  grams: 14.0 },
    { key: "28g",  label: "1 oz",    grams: 28.0 },
  ],
};

function priceHistoryFor(productId: number): PriceHistoryPoint[] {
  const product = MOCK_PRODUCTS.find((p) => p.id === productId);
  if (!product?.pricing) return [];
  const days = 30;
  return Array.from({ length: days }, (_, i) => {
    const wave = Math.sin(i / 4) * 0.08;
    const sale = i % 9 === 0;
    const factor = sale ? 0.75 : 1 + wave;
    return {
      recorded_at: new Date(Date.now() - (days - i) * 86400000).toISOString(),
      pricing: product.pricing!.map((e) => ({ ...e, price: +(e.price * factor).toFixed(2) })),
      is_on_sale: sale,
      sale_pct_off: sale ? 25 : null,
      best_price_per_gram: product.best_price_per_gram ? +(product.best_price_per_gram * factor).toFixed(2) : null,
    };
  });
}

function labHistoryFor(productId: number): LabHistoryEntry[] {
  const product = MOCK_PRODUCTS.find((p) => p.id === productId);
  if (!product) return [];
  return [
    {
      batch_id: product.batch_id ?? "B1001",
      thc_pct: product.thc_pct, cbd_pct: product.cbd_pct,
      cannabinoids: product.cannabinoids, terpenes: product.terpenes,
      total_terpenes_pct: product.total_terpenes_pct, harvest_date: product.harvest_date,
      recorded_at: new Date().toISOString(),
    },
    {
      batch_id: "B0987",
      thc_pct: (product.thc_pct ?? 24) - 1.2, cbd_pct: product.cbd_pct,
      cannabinoids: product.cannabinoids, terpenes: product.terpenes,
      total_terpenes_pct: (product.total_terpenes_pct ?? 1) - 0.2,
      harvest_date: new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10),
      recorded_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
  ];
}

function strainCompareFor(name: string): PriceCompareEntry[] {
  return MOCK_PRODUCTS
    .filter((p) => p.strain_name?.toLowerCase() === name.toLowerCase())
    .map((p) => ({
      dispensary_name: p.dispensary.name,
      dispensary_city: p.dispensary.city,
      dispensary_slug: p.dispensary.slug,
      dispensary_source: p.dispensary.source,
      dispensary_source_id: p.dispensary.slug.replace(/^(dutchie-|ihj-)/, ""),
      dispensary_lat: p.dispensary.lat,
      dispensary_lng: p.dispensary.lng,
      distance_miles: p.distance_miles,
      pricing: p.pricing ?? [],
      best_price_per_gram: p.best_price_per_gram,
      is_on_sale: p.is_on_sale, sale_pct_off: p.sale_pct_off,
      product_id: p.id,
      product_source_id: p.source_id,
    }))
    .sort((a, b) => (a.best_price_per_gram ?? 999) - (b.best_price_per_gram ?? 999));
}

function medianPriceFor(name: string): MedianPriceOut[] {
  const products = MOCK_PRODUCTS.filter((p) => p.strain_name?.toLowerCase() === name.toLowerCase());
  if (!products.length) return [];
  const byWeight: Record<string, number[]> = {};
  for (const p of products) {
    for (const e of p.pricing ?? []) {
      (byWeight[e.weight] ??= []).push(e.price);
    }
  }
  return Object.entries(byWeight).map(([weight, prices]) => {
    const sorted = [...prices].sort((a, b) => a - b);
    return {
      strain_name: name, weight,
      median_price: sorted[Math.floor(sorted.length / 2)],
      min_price: sorted[0], max_price: sorted[sorted.length - 1],
      sample_count: prices.length,
    };
  });
}

// Brand summaries derived from MOCK_PRODUCTS
const MOCK_BRANDS: BrandSummary[] = (() => {
  const byBrand: Record<string, ProductOut[]> = {};
  for (const p of MOCK_PRODUCTS) {
    if (p.brand) (byBrand[p.brand] ??= []).push(p);
  }
  const now = Date.now();
  return Object.entries(byBrand).map(([brand, prods], i) => {
    const days = (i * 3) % 35;   // varied "days since drop" for visual interest
    const strains = Array.from(new Set(prods.map((p) => p.strain_name).filter(Boolean) as string[]));
    const dispensaries = new Set(prods.map((p) => p.dispensary.id));
    const thcVals = prods.map((p) => p.thc_pct).filter((x): x is number => x != null);
    return {
      name: brand,
      product_count: prods.length,
      strain_count: strains.length,
      dispensary_count: dispensaries.size,
      last_drop_at: new Date(now - days * 86400000).toISOString(),
      days_since_last_drop: days,
      avg_thc: thcVals.length ? +(thcVals.reduce((s, v) => s + v, 0) / thcVals.length).toFixed(1) : null,
      on_sale_count: prods.filter((p) => p.is_on_sale).length,
      is_just_dropped: days <= 7,
      sample_strains: strains.slice(0, 5),
      image_url: prods[0]?.image_url ?? null,
    };
  }).sort((a, b) => (a.days_since_last_drop ?? 999) - (b.days_since_last_drop ?? 999));
})();

const MOCK_DROPS: BrandDrop[] = MOCK_PRODUCTS
  .slice(0, 12)
  .map((p, i) => ({
    brand: p.brand ?? "",
    strain_name: p.strain_name ?? p.name,
    product_id: p.id,
    dispensary_name: p.dispensary.name,
    dispensary_city: p.dispensary.city,
    image_url: p.image_url,
    thc_pct: p.thc_pct,
    is_on_sale: p.is_on_sale,
    sale_pct_off: p.sale_pct_off,
    first_seen_at: new Date(Date.now() - i * 86400000).toISOString(),
    days_old: i,
  }))
  .filter((d) => d.brand);

// In-memory shopping list + judgments per device for the mock
const _shoppingList: Map<string, ShoppingItem[]> = new Map();
const _judgments: Map<string, TasteJudgment[]> = new Map();

let _itemId = 1;

// Seed the list so the page has visual content on first visit
function _seedShoppingList(deviceId: string) {
  if (_shoppingList.has(deviceId)) return;

  const seedSpecs: Array<{ pid: number; weight: string; rec: "buy_now" | "wait" | "neutral"; savings: number; warn?: string }> = [
    { pid: 100, weight: "3.5g", rec: "buy_now", savings: 4.20 },                        // GG4 — sale, well below median
    { pid: 130, weight: "3.5g", rec: "wait",    savings: 0,    warn: "You didn't like Pineapple Express last time." },
    { pid: 150, weight: "7g",   rec: "buy_now", savings: 8.40 },                        // Northern Lights
    { pid: 200, weight: "3.5g", rec: "neutral", savings: 0 },                           // OG Kush
    { pid: 210, weight: "3.5g", rec: "wait",    savings: 0 },                           // Granddaddy Purple
  ];

  const items: ShoppingItem[] = seedSpecs.map((s) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === s.pid) ?? MOCK_PRODUCTS[0];
    const entry = product.pricing?.find((e) => e.weight === s.weight) ?? product.pricing?.[0];
    const price = entry?.price ?? 0;
    const reasoning = s.rec === "buy_now"
      ? `At $${price.toFixed(0)}, this is well below the typical $${(price * 1.18).toFixed(0)} median. Strong buy signal.`
      : s.rec === "wait"
        ? `Usually drops every ~9 days, hasn't in 7. A sale is likely soon.`
        : "Price is near typical median. No strong signal.";
    return {
      id: _itemId++,
      product, weight: s.weight, quantity: 1,
      current_unit_price: price,
      line_total: price,
      price_at_add: price + s.savings,
      target_price: null,
      savings_since_add: s.savings,
      notes: null,
      prediction: { recommendation: s.rec, confidence: 0.78, reasoning },
      taste_warning: s.warn ?? null,
    };
  });

  _shoppingList.set(deviceId, items);
}

function shoppingListFor(deviceId: string): ShoppingListSummary {
  _seedShoppingList(deviceId);
  const items = _shoppingList.get(deviceId) ?? [];
  const subtotal = items.reduce((s, i) => s + (i.line_total ?? 0), 0);
  const savings = items.reduce((s, i) => s + Math.max(0, i.savings_since_add ?? 0), 0);
  const buyNow = items.filter((i) => i.prediction?.recommendation === "buy_now").length;
  const wait = items.filter((i) => i.prediction?.recommendation === "wait").length;
  const overall: ShoppingListSummary["overall_recommendation"] =
    items.length === 0 ? "neutral"
      : buyNow > wait && buyNow >= items.length * 0.5 ? "strike_now"
      : wait > buyNow ? "wait"
      : "neutral";
  const reasoning = items.length === 0
    ? "Your list is empty."
    : overall === "strike_now"
      ? `${buyNow} of your items are at or near their lowest historical price. Strike now.`
      : overall === "wait"
        ? `${wait} items are likely to drop. Hold a few days.`
        : "Mixed signals — check individual items below.";

  // Group by dispensary to find cheapest pickup
  const byDispo: Record<string, number> = {};
  for (const i of items) {
    const name = i.product.dispensary.name;
    byDispo[name] = (byDispo[name] ?? 0) + (i.line_total ?? 0);
  }
  const sorted = Object.entries(byDispo).sort(([, a], [, b]) => a - b);

  return {
    items, item_count: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: +subtotal.toFixed(2), savings_total: +savings.toFixed(2),
    cheapest_pickup_dispensary: sorted[0]?.[0] ?? null,
    cheapest_pickup_subtotal: sorted[0] ? +sorted[0][1].toFixed(2) : null,
    overall_recommendation: overall, overall_reasoning: reasoning,
  };
}

function addToList(body: any): ShoppingItem {
  const product = MOCK_PRODUCTS.find((p) => p.id === body.product_id) ?? MOCK_PRODUCTS[0];
  const entry = product.pricing?.find((e) => e.weight === body.weight) ?? product.pricing?.[0];
  const price = entry?.price ?? 0;

  // Mocked predictions, varied by index for visual interest
  const recs: Array<"buy_now" | "wait" | "neutral"> = ["buy_now", "wait", "neutral"];
  const r = recs[product.id % 3];
  const reasoning = r === "buy_now"
    ? `At $${price}, this is well below the typical $${(price * 1.18).toFixed(0)} median. Strong buy signal.`
    : r === "wait"
      ? `This usually drops every ~9 days and hasn't in 7. A sale is likely soon.`
      : "Price is near typical median. No strong signal.";

  const item: ShoppingItem = {
    id: _itemId++,
    product, weight: body.weight, quantity: body.quantity ?? 1,
    current_unit_price: price,
    line_total: +(price * (body.quantity ?? 1)).toFixed(2),
    price_at_add: price, target_price: body.target_price ?? null,
    savings_since_add: 0, notes: body.notes ?? null,
    prediction: { recommendation: r, confidence: 0.78, reasoning },
    taste_warning: null,
  };

  const deviceId = body.device_id ?? "anon";
  const list = _shoppingList.get(deviceId) ?? [];
  list.unshift(item);
  _shoppingList.set(deviceId, list);
  return item;
}

function removeFromList(id: number) {
  for (const [k, v] of _shoppingList) {
    _shoppingList.set(k, v.filter((i) => i.id !== id));
  }
  return {};
}

function judge(body: any): TasteJudgment {
  const j: TasteJudgment = {
    id: Date.now(),
    verdict: body.verdict,
    product_id: body.product_id ?? null,
    strain_name: body.strain_name ?? null,
    brand_name: body.brand_name ?? null,
    note: body.note ?? null,
    created_at: new Date().toISOString(),
  };
  const deviceId = body.device_id ?? "anon";
  const list = _judgments.get(deviceId) ?? [];
  // Replace any prior judgment of the same target
  const filtered = list.filter((x) =>
    !(x.product_id === j.product_id && x.strain_name === j.strain_name && x.brand_name === j.brand_name)
  );
  filtered.unshift(j);
  _judgments.set(deviceId, filtered);
  return j;
}

function allJudgments(deviceId: string, verdict?: string): TasteJudgment[] {
  const list = _judgments.get(deviceId) ?? [];
  return verdict ? list.filter((j) => j.verdict === verdict) : list;
}

function checkTaste(params: any): TasteCheck {
  const deviceId = params.device_id ?? "anon";
  const list = _judgments.get(deviceId) ?? [];
  const j = list.find((x) =>
    (params.product_id && x.product_id === params.product_id)
    || (params.strain_name && x.strain_name?.toLowerCase() === params.strain_name?.toLowerCase())
    || (params.brand_name && x.brand_name === params.brand_name)
  );
  if (!j) return { verdict: null };
  if (j.verdict === "disliked" || j.verdict === "avoid") {
    return { verdict: j.verdict, message: `You marked this as a no-go.`, tone: "warning" };
  }
  if (j.verdict === "loved" || j.verdict === "liked") {
    return { verdict: j.verdict, message: `You ${j.verdict} this before.`, tone: "positive" };
  }
  return { verdict: j.verdict, tone: "neutral" };
}

export const mock = {
  products: MOCK_PRODUCTS,
  dispensaries: NJ_DISPENSARIES,
  deals: MOCK_DEALS,
  trends: MOCK_TRENDS,
  brands: MOCK_BRANDS,
  drops: MOCK_DROPS,
  filterOptions: MOCK_FILTER_OPTIONS,
  priceHistoryFor, labHistoryFor, strainCompareFor, medianPriceFor,
  shoppingListFor, addToList, removeFromList, judge, checkTaste, allJudgments,

  recommend: (query: string): RecommendResponse => ({
    answer: `Based on "${query}", I'd recommend the GG4 from Verano at Curaleaf Bellmawr — it's on sale 30% off ($35 for an eighth, just $10/g), high THC at 28.4%, and the heavy myrcene + caryophyllene profile delivers exactly the deep relaxation you're after. The Granddaddy Purple at Curaleaf is another solid value pick at $10.86/g if you want to lean even more sedating.`,
    products: MOCK_PRODUCTS.filter((p) => p.is_on_sale).slice(0, 3),
  }),

  alerts: [] as AlertOut[],
  favorites: [] as FavoriteOut[],
};
