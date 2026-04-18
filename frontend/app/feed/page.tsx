"use client";

import { useState, useCallback } from "react";
import { SlidersHorizontal, Search, X } from "lucide-react";
import useSWRInfinite from "swr/infinite";
import { motion } from "framer-motion";
import { FilterPanel, FilterState, DEFAULT_FILTERS } from "@/components/ui/FilterPanel";
import { ProductCard } from "@/components/product/ProductCard";
import { api } from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { CannabisLeaf } from "@/components/ui/CannabisLeaf";
import { cn } from "@/lib/utils";

function filtersToParams(f: FilterState, lat?: number | null, lng?: number | null): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.category) p.category = f.category;
  if (f.product_type) p.product_type = f.product_type;
  if (f.on_sale) p.on_sale = "true";
  if (f.max_price) p.max_price = f.max_price;
  if (f.max_price_per_gram) p.max_price_per_gram = f.max_price_per_gram;
  if (f.min_thc) p.min_thc = f.min_thc;
  if (f.max_thc) p.max_thc = f.max_thc;
  if (f.min_total_terpenes) p.min_total_terpenes = f.min_total_terpenes;
  if (f.cannabinoids.length) { p.cannabinoids = f.cannabinoids.join(","); p.min_cannabinoid_pct = f.min_cannabinoid_pct; }
  if (f.terpenes.length) { p.terpenes = f.terpenes.join(","); p.min_terpene_pct = f.min_terpene_pct; }
  if (f.sort) p.sort = f.sort;
  if (lat) p.lat = String(lat);
  if (lng) p.lng = String(lng);
  p.limit = "20";
  return p;
}

export default function FeedPage() {
  const { lat, lng } = useLocation();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");

  const getKey = (pageIndex: number, prev: ProductOut[] | null) => {
    if (prev && prev.length === 0) return null;
    const params = filtersToParams(filters, lat, lng);
    params.offset = String(pageIndex * 20);
    if (search) params.search = search;
    return ["products", params];
  };

  const { data, size, setSize, isLoading } = useSWRInfinite(
    getKey,
    ([, params]) => api.products(params as Record<string, string>),
    { revalidateFirstPage: false }
  );

  const products = data?.flat() ?? [];
  const hasMore = data?.at(-1)?.length === 20;

  return (
    <div className="min-h-screen bg-surface">
      {/* Sticky search + filter bar */}
      <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-lg border-b border-surface-border px-4 py-3 flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-surface-card border border-surface-border rounded-xl px-3 py-2">
          <Search size={14} className="text-zinc-500 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search strains, brands…"
            className="flex-1 bg-transparent text-white text-sm placeholder:text-zinc-600 outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={14} className="text-zinc-500" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors flex-shrink-0",
            Object.values(filters).some((v) => v && v !== DEFAULT_FILTERS[Object.keys(filters)[0] as keyof FilterState])
              ? "border-brand text-brand bg-brand/10"
              : "border-surface-border text-zinc-400"
          )}
        >
          <SlidersHorizontal size={14} />
          Filter
        </button>
      </div>

      {/* Results count */}
      <div className="px-4 py-3">
        <p className="text-xs text-zinc-600">
          {isLoading ? "Loading…" : `${products.length}${hasMore ? "+" : ""} products`}
        </p>
      </div>

      {/* Product grid */}
      <div className="px-4 space-y-4 pb-32">
        {products.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
          >
            <ProductCard product={p} />
          </motion.div>
        ))}

        {/* Load more */}
        {hasMore && (
          <button
            onClick={() => setSize(size + 1)}
            className="w-full py-4 text-sm text-zinc-500 hover:text-brand transition-colors"
          >
            Load more
          </button>
        )}

        {/* Empty state */}
        {!isLoading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CannabisLeaf size={48} className="text-zinc-700 mb-3" />
            <p className="text-white font-semibold mb-1">No products found</p>
            <p className="text-zinc-500 text-sm">Try adjusting your filters or search.</p>
          </div>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
