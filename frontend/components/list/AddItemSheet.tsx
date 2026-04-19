"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Plus, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useDeviceId } from "@/hooks/useDeviceId";
import { useShopPreference } from "@/hooks/useShopPreference";
import { useLocation } from "@/hooks/useLocation";
import { ProductPlaceholder } from "@/components/ui/CannabisLeaf";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

const CATEGORIES = ["flower", "pre-roll", "vaporizer", "edible", "concentrate"];

export function AddItemSheet({ open, onClose, onAdded }: Props) {
  const deviceId = useDeviceId();
  const { lat, lng } = useLocation();
  const { slugs: shopSlugs } = useShopPreference();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("flower");
  const [debounced, setDebounced] = useState("");
  const [weightPickerFor, setWeightPickerFor] = useState<number | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<number>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const params: Record<string, string> = {
    category,
    sort: "price_per_gram",
    limit: "30",
    ...(debounced ? { search: debounced } : {}),
    ...(shopSlugs.length > 0 ? { dispensary_slugs: shopSlugs.join(",") } : {}),
    ...(lat ? { lat: String(lat), lng: String(lng) } : {}),
  };

  const { data: products, isLoading } = useSWR(
    open ? ["add-search", params] : null,
    () => api.products(params)
  );

  async function addToList(product: ProductOut, weight: string) {
    await api.addToList({
      product_id: product.id,
      weight,
      quantity: 1,
      device_id: deviceId,
    });
    setRecentlyAdded((s) => new Set([...s, product.id]));
    setWeightPickerFor(null);
    onAdded?.();
    // Brief flash, then clear
    setTimeout(() => {
      setRecentlyAdded((s) => {
        const next = new Set(s);
        next.delete(product.id);
        return next;
      });
    }, 1500);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-surface-card border-t border-surface-border rounded-t-3xl flex flex-col h-[85vh]"
          >
            {/* Drag handle */}
            <div className="pt-3 pb-2">
              <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto" />
            </div>

            {/* Header */}
            <div className="px-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-xl text-white">Add to list</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Tap any product to pick a weight and add it.
                </p>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pt-3">
              <div className="flex items-center gap-2 bg-surface-elevated border border-surface-border rounded-xl px-3 py-2.5">
                <Search size={14} className="text-zinc-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by strain or brand…"
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide px-5 pt-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-pill transition-colors capitalize",
                    category === c ? "bg-brand text-black" : "text-zinc-400 hover:text-white"
                  )}
                >
                  {c.replace("-", " ")}
                </button>
              ))}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6 space-y-2">
              {isLoading && <p className="text-zinc-500 text-sm py-4 text-center">Loading…</p>}
              {products?.map((p) => {
                const justAdded = recentlyAdded.has(p.id);
                const showPicker = weightPickerFor === p.id;
                return (
                  <div key={p.id} className="bg-surface-elevated border border-surface-border rounded-2xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                        <ProductPlaceholder
                          productType={p.product_type}
                          strainName={p.strain_name}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {p.strain_name ?? p.name}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                          {p.brand} · {p.dispensary.name}
                        </p>
                      </div>
                      <button
                        onClick={() => setWeightPickerFor(showPicker ? null : p.id)}
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                          justAdded
                            ? "bg-emerald-500 text-black"
                            : showPicker
                              ? "bg-brand/30 text-brand"
                              : "bg-brand text-black hover:bg-brand-dark"
                        )}
                        aria-label="Add to list"
                      >
                        {justAdded ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={2.5} />}
                      </button>
                    </div>

                    {/* Weight picker — appears when + is tapped */}
                    {showPicker && p.pricing && (
                      <div className="mt-3 pt-3 border-t border-surface-border">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">
                          Pick a weight to add
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {p.pricing.map((entry) => (
                            <button
                              key={entry.weight}
                              onClick={() => addToList(p, entry.weight)}
                              className="bg-surface-card hover:bg-brand/15 border border-surface-border hover:border-brand/40 rounded-lg px-2 py-2 text-center transition-colors"
                            >
                              <p className="text-xs text-white font-bold">{entry.weight}</p>
                              <p className="text-[10px] text-brand font-semibold">${entry.price}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {!isLoading && products?.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-8">
                  No products match. Try a different search.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
