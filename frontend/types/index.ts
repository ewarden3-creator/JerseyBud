interface PricingEntry {
  weight: string;
  price: number;
  original_price?: number;
  price_per_gram?: number;
  original_price_per_gram?: number;
  grams?: number;
}

interface DispensaryOut {
  id: number;
  slug: string;
  name: string;
  address: string;
  city: string;
  zip_code: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  source: string;
  nj_license_number: string | null;
  nj_license_url: string | null;
  opening_year: number | null;
  medical: boolean;
  recreational: boolean;
  wheelchair_accessible: boolean | null;
  delivery: boolean | null;
  curbside_pickup: boolean | null;
  atm: boolean | null;
  hours: Record<string, string> | null;
  is_open_now: boolean | null;
  distance_miles: number | null;
}

interface ProductOut {
  id: number;
  source_id: string;
  name: string;
  brand: string | null;
  strain_name: string | null;
  category: string;
  subcategory: string | null;
  product_type: string | null;
  thc_pct: number | null;
  cbd_pct: number | null;
  cannabinoids: Record<string, number> | null;
  terpenes: Record<string, number> | null;
  total_terpenes_pct: number | null;
  effects: string[] | null;
  pricing: PricingEntry[] | null;
  is_on_sale: boolean;
  sale_pct_off: number | null;
  best_price_per_gram: number | null;
  image_url: string | null;
  in_stock: boolean;
  batch_id: string | null;
  harvest_date: string | null;
  dispensary: DispensaryOut;
  distance_miles: number | null;
}

interface DealOut {
  product: ProductOut;
  best_price: number;
  best_weight: string;
  best_price_per_gram: number | null;
  original_price: number | null;
  sale_pct_off: number | null;
  dispensary_name: string;
  dispensary_city: string;
  distance_miles: number | null;
}

interface TrendEntry {
  strain_name: string;
  category: string;
  product_type: string | null;
  avg_thc: number | null;
  avg_total_terpenes: number | null;
  dispensary_count: number;
  avg_price_eighth: number | null;
  avg_price_per_gram: number | null;
}

interface PriceHistoryPoint {
  recorded_at: string;
  pricing: PricingEntry[];
  is_on_sale: boolean;
  sale_pct_off: number | null;
  best_price_per_gram: number | null;
}

interface LabHistoryEntry {
  batch_id: string;
  thc_pct: number | null;
  cbd_pct: number | null;
  cannabinoids: Record<string, number> | null;
  terpenes: Record<string, number> | null;
  total_terpenes_pct: number | null;
  harvest_date: string | null;
  recorded_at: string;
}

interface PriceCompareEntry {
  dispensary_name: string;
  dispensary_city: string;
  dispensary_slug: string;
  dispensary_source: string;
  dispensary_source_id: string;
  dispensary_lat: number | null;
  dispensary_lng: number | null;
  distance_miles: number | null;
  pricing: PricingEntry[];
  best_price_per_gram: number | null;
  is_on_sale: boolean;
  sale_pct_off: number | null;
  product_id: number;
  product_source_id: string;
}

interface MedianPriceOut {
  strain_name: string;
  weight: string;
  median_price: number;
  min_price: number;
  max_price: number;
  sample_count: number;
}

interface AlertOut {
  id: number;
  device_id: string;
  alert_type: string;
  product_id: number | null;
  strain_name: string | null;
  target_weight: string | null;
  threshold_price: number | null;
  is_active: boolean;
  last_triggered_at: string | null;
}

interface FavoriteOut {
  id: number;
  favorite_type: string;
  product_id: number | null;
  strain_name: string | null;
  dispensary_id: number | null;
  product?: ProductOut;
  dispensary?: DispensaryOut;
}

interface RecommendResponse {
  answer: string;
  products: ProductOut[];
}

interface ShoppingItem {
  id: number;
  product: ProductOut;
  weight: string;
  quantity: number;
  current_unit_price: number | null;
  line_total: number | null;
  price_at_add: number | null;
  target_price: number | null;
  savings_since_add: number | null;
  notes: string | null;
  prediction: {
    recommendation: "buy_now" | "wait" | "neutral";
    confidence: number;
    reasoning: string;
    expected_sale_in_days?: number | null;
  } | null;
  taste_warning: string | null;
}

interface ShoppingListSummary {
  items: ShoppingItem[];
  item_count: number;
  subtotal: number;
  savings_total: number;
  cheapest_pickup_dispensary: string | null;
  cheapest_pickup_subtotal: number | null;
  overall_recommendation: "strike_now" | "wait" | "neutral" | "mixed";
  overall_reasoning: string;
}

interface TasteJudgment {
  id: number;
  verdict: "loved" | "liked" | "neutral" | "disliked" | "avoid";
  product_id: number | null;
  strain_name: string | null;
  brand_name: string | null;
  note: string | null;
  created_at: string;
}

interface TasteCheck {
  verdict: string | null;
  message?: string;
  tone?: "warning" | "positive" | "neutral";
}

interface BrandSummary {
  name: string;
  product_count: number;
  strain_count: number;
  dispensary_count: number;
  last_drop_at: string | null;
  days_since_last_drop: number | null;
  avg_thc: number | null;
  on_sale_count: number;
  is_just_dropped: boolean;
  sample_strains: string[];
  image_url: string | null;
}

interface BrandDrop {
  brand: string;
  strain_name: string;
  product_id: number;
  dispensary_name: string;
  dispensary_city: string;
  image_url: string | null;
  thc_pct: number | null;
  is_on_sale: boolean;
  sale_pct_off: number | null;
  first_seen_at: string;
  days_old: number;
}

interface FilterOptions {
  cannabinoids: { key: string; label: string; group: string }[];
  terpenes: { key: string; label: string; group: string }[];
  categories: { key: string; label: string }[];
  product_types: { key: string; label: string }[];
  weight_options: { key: string; label: string; grams: number }[];
}
