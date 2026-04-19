"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Mic, ChevronDown, Store, Globe2, MapPin } from "lucide-react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { useShopPreference } from "@/hooks/useShopPreference";
import { ProductCardCompact } from "@/components/product/ProductCardCompact";
import { SearchSheet } from "@/components/ui/SearchSheet";
import { ShopPicker } from "@/components/ui/ShopPicker";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "flower",      label: "Flower" },
  { key: "pre-roll",    label: "Pre-Roll" },
  { key: "vaporizer",   label: "Vape" },
  { key: "edible",      label: "Edible" },
  { key: "concentrate", label: "Concentrate" },
];

const TYPES = [
  { key: "sativa", label: "Sativa" },
  { key: "indica", label: "Indica" },
  { key: "hybrid", label: "Hybrid" },
];

const SORT_OPTIONS = [
  { key: "price_per_gram", label: "Best $/g" },
  { key: "thc",            label: "Highest THC" },
  { key: "sale",           label: "Biggest discount" },
  { key: "distance",       label: "Nearest first" },
  { key: "relevance",      label: "Default" },
];

// Persisted distance filter (in miles, or null = no limit)
const RADIUS_KEY = "jb-radius-miles";
const RADIUS_OPTIONS: Array<{ key: number | null; label: string }> = [
  { key: 5,    label: "5 mi"   },
  { key: 10,   label: "10 mi"  },
  { key: 25,   label: "25 mi"  },
  { key: null, label: "All NJ" },
];

export function HomeFeed() {
  const { lat, lng } = useLocation();
  const { slugs: preferredShopSlugs, set: setPreferredShops } = useShopPreference();
  const [searchOpen, setSearchOpen] = useState(false);
  const [seedQuery, setSeedQuery] = useState<string | null>(null);
  const [shopPickerOpen, setShopPickerOpen] = useState(false);
  const [category, setCategory] = useState<string>("flower");
  const [productType, setProductType] = useState<string | null>(null);
  const [onSale, setOnSale] = useState(false);
  const [sort, setSort] = useState<string>("price_per_gram");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [radius, setRadius] = useState<number | null>(10);
  const [showRadiusMenu, setShowRadiusMenu] = useState(false);

  // Hydrate persisted radius
  useEffect(() => {
    const stored = localStorage.getItem(RADIUS_KEY);
    if (stored === "null") setRadius(null);
    else if (stored) setRadius(parseInt(stored));
  }, []);

  function updateRadius(r: number | null) {
    setRadius(r);
    localStorage.setItem(RADIUS_KEY, r === null ? "null" : String(r));
    setShowRadiusMenu(false);
  }

  // Resolve first shop's name for the chip label (when only one selected)
  const firstSlug = preferredShopSlugs[0];
  const { data: firstShop } = useSWR(
    preferredShopSlugs.length === 1 && firstSlug ? ["shop", firstSlug] : null,
    () => api.dispensary(firstSlug!)
  );

  // Build query params for the inventory fetch
  const params: Record<string, string> = useMemo(() => {
    const p: Record<string, string> = { sort, limit: "60" };
    if (preferredShopSlugs.length > 0) p.dispensary_slugs = preferredShopSlugs.join(",");
    if (category) p.category = category;
    if (productType) p.product_type = productType;
    if (onSale) p.on_sale = "true";
    if (lat) p.lat = String(lat);
    if (lng) p.lng = String(lng);
    // Distance filter only matters when not scoped to specific shops
    if (preferredShopSlugs.length === 0 && radius != null) p.radius_miles = String(radius);
    return p;
  }, [preferredShopSlugs, category, productType, onSale, sort, lat, lng, radius]);

  const { data: products, isLoading, mutate } = useSWR(
    ["inventory", params],
    () => api.products(params)
  );

  const lastUpdated = useMemo(() => new Date(), [products]);
  const minutesSinceUpdate = Math.max(1, Math.floor((Date.now() - lastUpdated.getTime()) / 60000));

  function openAi(query?: string) {
    setSeedQuery(query ?? null);
    setSearchOpen(true);
  }

  // Chip label by selection state
  const noShopSelected = preferredShopSlugs.length === 0;
  const shopLabel = noShopSelected
    ? "Choose your shops"
    : preferredShopSlugs.length === 1
      ? (firstShop?.name ?? "1 shop")
      : `${preferredShopSlugs.length} shops`;

  return (
    <div className="min-h-screen bg-surface pb-32">
      {/* One-line entry: shop chip + Ask Bud — combines two former rows */}
      <div className="px-5 pt-4 pb-1 flex items-center gap-2">
        <button
          onClick={() => setShopPickerOpen(true)}
          className={cn(
            "flex items-center gap-1.5 px-3 h-11 rounded-pill border transition-colors flex-shrink-0 max-w-[55%]",
            noShopSelected
              ? "bg-brand/15 border-brand/50 text-brand hover:bg-brand/25"
              : "bg-surface-card border-surface-border text-white hover:border-brand/40"
          )}
        >
          {noShopSelected ? <Globe2 size={13} /> : <Store size={13} className="text-brand" />}
          <span className="text-xs font-bold truncate">{shopLabel}</span>
          <ChevronDown size={12} className="opacity-70 flex-shrink-0" />
        </button>

        <button
          onClick={() => openAi()}
          className="flex-1 flex items-center gap-2 h-11 px-4 rounded-pill bg-surface-card border border-surface-border hover:border-brand/40 transition-colors text-left"
        >
          <Sparkles size={14} className="text-brand flex-shrink-0" />
          <span className="flex-1 text-xs text-zinc-400 truncate">Ask Bud…</span>
          <Mic size={13} className="text-zinc-600 flex-shrink-0" />
        </button>
      </div>

      {/* Sticky filter bar — category tabs + filter chips */}
      <div className="sticky top-[61px] z-20 bg-surface/85 backdrop-blur-md border-b border-surface-border">
        {/* Category tabs + freshness on the right */}
        <div className="flex items-center gap-1 px-5 pt-3">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={cn(
                  "flex-shrink-0 px-3 py-2 text-sm font-bold rounded-pill transition-colors whitespace-nowrap",
                  category === c.key
                    ? "bg-brand text-black"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          {/* Freshness — tiny indicator on the right */}
          <button
            onClick={() => mutate()}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-brand transition-colors flex-shrink-0 pl-2"
            title="Refresh"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{minutesSinceUpdate}m</span>
          </button>
        </div>

        {/* Type pills (scrollable) + dropdowns (fixed-position, outside overflow) */}
        <div className="flex items-center gap-2 px-5 py-2.5">
          {/* Scrollable pills — overflow contained here only */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setProductType(productType === t.key ? null : t.key)}
                className={cn(
                  "flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-pill border transition-colors",
                  productType === t.key
                    ? "bg-brand/15 border-brand/50 text-brand"
                    : "border-surface-border text-zinc-400"
                )}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={() => setOnSale(!onSale)}
              className={cn(
                "flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-pill border transition-colors",
                onSale
                  ? "bg-orange-500/15 border-orange-500/50 text-orange-400"
                  : "border-surface-border text-zinc-400"
              )}
            >
              On Sale
            </button>
          </div>

          {/* Distance — outside overflow so the popover renders cleanly */}
          {noShopSelected && lat != null && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => { setShowRadiusMenu(!showRadiusMenu); setShowSortMenu(false); }}
                className={cn(
                  "flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-pill border transition-colors",
                  radius != null
                    ? "bg-brand/15 border-brand/50 text-brand"
                    : "border-surface-border text-zinc-400"
                )}
              >
                <MapPin size={11} />
                {radius != null ? `${radius} mi` : "All NJ"}
                <ChevronDown size={10} />
              </button>
              {showRadiusMenu && (
                <>
                  {/* Click-out catcher */}
                  <button
                    aria-hidden
                    onClick={() => setShowRadiusMenu(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div className="absolute right-0 top-full mt-1 bg-surface-elevated border border-surface-border rounded-xl py-1 shadow-2xl z-50 min-w-[120px]">
                    {RADIUS_OPTIONS.map((r) => (
                      <button
                        key={String(r.key)}
                        onClick={() => updateRadius(r.key)}
                        className={cn(
                          "w-full text-left text-xs px-3 py-2 hover:bg-surface-card transition-colors",
                          radius === r.key ? "text-brand font-bold" : "text-zinc-300"
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Sort — also outside overflow */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => { setShowSortMenu(!showSortMenu); setShowRadiusMenu(false); }}
              className="text-xs font-semibold px-3 py-1.5 rounded-pill border border-surface-border text-zinc-300 hover:text-white flex items-center gap-1"
            >
              {SORT_OPTIONS.find((s) => s.key === sort)?.label}
              <ChevronDown size={11} />
            </button>
            {showSortMenu && (
              <>
                <button
                  aria-hidden
                  onClick={() => setShowSortMenu(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <div className="absolute right-0 top-full mt-1 bg-surface-elevated border border-surface-border rounded-xl py-1 shadow-2xl z-50 min-w-[180px]">
                  {SORT_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => { setSort(s.key); setShowSortMenu(false); }}
                      className={cn(
                        "w-full text-left text-xs px-3 py-2 hover:bg-surface-card transition-colors",
                        sort === s.key ? "text-brand font-bold" : "text-zinc-300"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Inventory list */}
      <div className="px-5 pt-4 space-y-3">
        {isLoading && (
          <p className="text-zinc-500 text-sm py-8 text-center">Loading inventory…</p>
        )}

        {products?.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.4) }}
          >
            <ProductCardCompact product={p} />
          </motion.div>
        ))}

        {products && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-white font-semibold mb-1">No products match these filters</p>
            <p className="text-zinc-500 text-sm">Try clearing filters or asking Bud for help.</p>
          </div>
        )}
      </div>

      <SearchSheet
        open={searchOpen}
        onClose={() => { setSearchOpen(false); setSeedQuery(null); }}
        initialQuery={seedQuery}
      />

      <ShopPicker
        open={shopPickerOpen}
        onClose={() => setShopPickerOpen(false)}
        selectedSlugs={preferredShopSlugs}
        onChange={setPreferredShops}
      />
    </div>
  );
}
