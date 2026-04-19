"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Search, Mic, ChevronDown, RefreshCw, Store, Globe2 } from "lucide-react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { useShopPreference } from "@/hooks/useShopPreference";
import { ProductCardCompact } from "@/components/product/ProductCardCompact";
import { SearchSheet } from "@/components/ui/SearchSheet";
import { ShopPicker } from "@/components/ui/ShopPicker";
import { cn } from "@/lib/utils";

const QUICK_INTENTS = [
  { emoji: "🌙", label: "Sleep",    query: "Something to help me sleep" },
  { emoji: "🎨", label: "Creative", query: "Something uplifting for creative work" },
  { emoji: "😌", label: "Relax",    query: "Something to take the edge off" },
  { emoji: "💰", label: "Best deal", query: "Best deal on flower near me" },
];

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

export function HomeFeed() {
  const { lat, lng } = useLocation();
  const { slug: preferredShopSlug, set: setPreferredShop } = useShopPreference();
  const [searchOpen, setSearchOpen] = useState(false);
  const [seedQuery, setSeedQuery] = useState<string | null>(null);
  const [shopPickerOpen, setShopPickerOpen] = useState(false);
  const [category, setCategory] = useState<string>("flower");
  const [productType, setProductType] = useState<string | null>(null);
  const [onSale, setOnSale] = useState(false);
  const [sort, setSort] = useState<string>("price_per_gram");
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Resolve shop name for the indicator (only fetches when set)
  const { data: preferredShop } = useSWR(
    preferredShopSlug ? ["shop", preferredShopSlug] : null,
    () => api.dispensary(preferredShopSlug!)
  );

  // Build query params for the inventory fetch
  const params: Record<string, string> = useMemo(() => {
    const p: Record<string, string> = { sort, limit: "60" };
    if (preferredShopSlug) p.dispensary_slug = preferredShopSlug;
    if (category) p.category = category;
    if (productType) p.product_type = productType;
    if (onSale) p.on_sale = "true";
    if (lat) p.lat = String(lat);
    if (lng) p.lng = String(lng);
    return p;
  }, [preferredShopSlug, category, productType, onSale, sort, lat, lng]);

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

  return (
    <div className="min-h-screen bg-surface pb-32">
      {/* Shop context indicator — primary scoping filter, persistent across visits */}
      <div className="px-5 pt-4">
        <button
          onClick={() => setShopPickerOpen(true)}
          className="w-full flex items-center gap-3 bg-surface-card border border-surface-border hover:border-brand/40 rounded-2xl px-4 py-3 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0">
            {preferredShopSlug ? (
              <Store size={15} className="text-brand" />
            ) : (
              <Globe2 size={15} className="text-zinc-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
              Shopping at
            </p>
            <p className="text-sm font-bold text-white truncate">
              {preferredShop ? preferredShop.name : "All NJ shops"}
            </p>
          </div>
          <ChevronDown size={14} className="text-zinc-500 flex-shrink-0" />
        </button>
      </div>

      {/* AI concierge — the prominent entry to the assistant */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-bold mb-2">
          What are you in the mood for?
        </p>
        <button
          onClick={() => openAi()}
          className="w-full flex items-center gap-3 bg-surface-card border border-surface-border hover:border-brand/50 rounded-2xl px-4 py-3.5 transition-colors text-left mb-2"
        >
          <Sparkles size={16} className="text-brand flex-shrink-0" />
          <span className="flex-1 text-[15px] text-zinc-400">Tell Bud what you're after…</span>
          <Mic size={14} className="text-zinc-600" />
        </button>

        {/* Quick intent chips — inline, single row */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
          {QUICK_INTENTS.map((i) => (
            <button
              key={i.label}
              onClick={() => openAi(i.query)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 bg-surface-card border border-surface-border hover:border-brand/40 rounded-pill px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              <span>{i.emoji}</span>
              <span>{i.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sticky filter bar — category tabs + freshness + sort */}
      <div className="sticky top-[61px] z-20 bg-surface/85 backdrop-blur-md border-b border-surface-border">
        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide px-5 pt-3">
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

        {/* Type pills + sort + on sale toggle */}
        <div className="flex items-center gap-2 px-5 py-2.5 overflow-x-auto scrollbar-hide">
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

          {/* Sort dropdown — pushed right */}
          <div className="ml-auto relative flex-shrink-0">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="text-xs font-semibold px-3 py-1.5 rounded-pill border border-surface-border text-zinc-300 hover:text-white flex items-center gap-1"
            >
              {SORT_OPTIONS.find((s) => s.key === sort)?.label}
              <ChevronDown size={11} />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 bg-surface-elevated border border-surface-border rounded-xl py-1 shadow-xl z-30 min-w-[180px]">
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
            )}
          </div>
        </div>

        {/* Freshness + count strip */}
        <div className="flex items-center justify-between px-5 py-2 border-t border-surface-border/40">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              <span className="text-emerald-400 font-bold">{products?.length ?? "—"}</span> in stock now
            </span>
          </div>
          <button
            onClick={() => mutate()}
            className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-brand transition-colors"
          >
            <RefreshCw size={9} />
            Updated {minutesSinceUpdate}m ago
          </button>
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
        selectedSlug={preferredShopSlug}
        onSelect={setPreferredShop}
      />
    </div>
  );
}
