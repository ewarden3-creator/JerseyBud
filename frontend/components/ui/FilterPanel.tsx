"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { api } from "@/lib/api";
import { ProGate, ProBadge } from "@/components/pro/ProGate";

export interface FilterState {
  category: string;
  product_type: string;
  on_sale: boolean;
  max_price: string;
  max_price_per_gram: string;
  min_thc: string;
  max_thc: string;
  min_total_terpenes: string;
  cannabinoids: string[];
  min_cannabinoid_pct: string;
  terpenes: string[];
  min_terpene_pct: string;
  sort: string;
}

export const DEFAULT_FILTERS: FilterState = {
  category: "",
  product_type: "",
  on_sale: false,
  max_price: "",
  max_price_per_gram: "",
  min_thc: "",
  max_thc: "",
  min_total_terpenes: "",
  cannabinoids: [],
  min_cannabinoid_pct: "0",
  terpenes: [],
  min_terpene_pct: "0",
  sort: "relevance",
};

function activeCount(f: FilterState): number {
  let n = 0;
  if (f.category) n++;
  if (f.product_type) n++;
  if (f.on_sale) n++;
  if (f.max_price) n++;
  if (f.max_price_per_gram) n++;
  if (f.min_thc) n++;
  if (f.cannabinoids.length) n++;
  if (f.terpenes.length) n++;
  return n;
}

interface CollapsibleProps { title: string; children: React.ReactNode; defaultOpen?: boolean }
function Collapsible({ title, children, defaultOpen = false }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-surface-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-white hover:text-brand transition-colors"
      >
        {title}
        {open ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onClose: () => void;
}

export function FilterPanel({ filters, onChange, onClose }: Props) {
  const { data: meta } = useSWR("filter-meta", api.filterOptions);
  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });
  const toggleList = (key: "cannabinoids" | "terpenes", val: string) => {
    const cur = filters[key];
    set({ [key]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] });
  };

  const SORT_OPTIONS = [
    { key: "relevance",     label: "Relevance" },
    { key: "price_per_gram",label: "Best Value" },
    { key: "thc",           label: "Highest THC" },
    { key: "sale",          label: "Biggest Discount" },
    { key: "distance",      label: "Nearest First" },
  ];

  const QUICK_PRESETS = [
    { label: "On Sale",       patch: { on_sale: true } },
    { label: "High THC",      patch: { min_thc: "25" } },
    { label: "Terp-Forward",  patch: { min_total_terpenes: "2" } },
    { label: "Best Value",    patch: { sort: "price_per_gram", max_price_per_gram: "12" } },
    { label: "CBD-Dominant",  patch: { cannabinoids: ["cbd"], min_cannabinoid_pct: "5" } },
  ];

  const cannabinoidGroups = meta
    ? ["major", "minor", "rare"].map((g) => ({
        group: g,
        items: meta.cannabinoids.filter((c) => c.group === g),
      }))
    : [];

  const terpeneGroups = meta
    ? ["common", "secondary"].map((g) => ({
        group: g,
        items: meta.terpenes.filter((t) => t.group === g),
      }))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-brand" />
          <span className="font-bold text-white">Filters</span>
          {activeCount(filters) > 0 && (
            <span className="bg-brand text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {activeCount(filters)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Reset
          </button>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Quick presets */}
        <div className="px-4 py-3 border-b border-surface-border">
          <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide font-semibold">Quick Presets</p>
          <div className="flex gap-2 flex-wrap">
            {QUICK_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => set(p.patch as Partial<FilterState>)}
                className="text-xs px-3 py-1.5 rounded-pill bg-surface-elevated border border-surface-border text-zinc-300 hover:border-brand hover:text-brand transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <Collapsible title="Sort By" defaultOpen>
          <div className="space-y-1">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => set({ sort: o.key })}
                className={cn(
                  "w-full text-left text-sm px-3 py-2 rounded-lg transition-colors",
                  filters.sort === o.key
                    ? "bg-brand/20 text-brand font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-surface-elevated"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Collapsible>

        {/* Category */}
        <Collapsible title="Category" defaultOpen>
          <div className="flex flex-wrap gap-2">
            {(meta?.categories ?? []).map((c) => (
              <button
                key={c.key}
                onClick={() => set({ category: filters.category === c.key ? "" : c.key })}
                className={cn(
                  "text-sm px-3 py-1.5 rounded-pill border transition-colors",
                  filters.category === c.key
                    ? "border-brand bg-brand/20 text-brand"
                    : "border-surface-border text-zinc-400 hover:border-zinc-500"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Collapsible>

        {/* Type */}
        <Collapsible title="Type" defaultOpen>
          <div className="flex gap-2">
            {(meta?.product_types ?? []).map((t) => (
              <button
                key={t.key}
                onClick={() => set({ product_type: filters.product_type === t.key ? "" : t.key })}
                className={cn(
                  "flex-1 text-sm py-2 rounded-xl border transition-colors",
                  filters.product_type === t.key
                    ? "border-brand bg-brand/20 text-brand font-semibold"
                    : "border-surface-border text-zinc-400 hover:border-zinc-500"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Collapsible>

        {/* Price */}
        <Collapsible title="Price">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Max price</label>
              <div className="flex items-center gap-2 bg-surface-elevated rounded-xl px-3 py-2 border border-surface-border">
                <span className="text-zinc-500">$</span>
                <input
                  type="number"
                  value={filters.max_price}
                  onChange={(e) => set({ max_price: e.target.value })}
                  placeholder="No limit"
                  className="flex-1 bg-transparent text-white text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Max $/g (value filter)</label>
              <div className="flex items-center gap-2 bg-surface-elevated rounded-xl px-3 py-2 border border-surface-border">
                <span className="text-zinc-500">$</span>
                <input
                  type="number"
                  step="0.5"
                  value={filters.max_price_per_gram}
                  onChange={(e) => set({ max_price_per_gram: e.target.value })}
                  placeholder="e.g. 12"
                  className="flex-1 bg-transparent text-white text-sm outline-none"
                />
                <span className="text-zinc-500 text-xs">/g</span>
              </div>
            </div>
            <button
              onClick={() => set({ on_sale: !filters.on_sale })}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors",
                filters.on_sale ? "border-orange-500 bg-orange-500/10 text-orange-400" : "border-surface-border text-zinc-400"
              )}
            >
              <span className="text-sm font-semibold">On Sale Only</span>
              <div className={cn("w-10 h-5 rounded-pill relative", filters.on_sale ? "bg-orange-500" : "bg-zinc-700")}>
                <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform", filters.on_sale ? "left-5" : "left-0.5")} />
              </div>
            </button>
          </div>
        </Collapsible>

        {/* THC */}
        <Collapsible title="THC %">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Min</label>
              <input
                type="number"
                value={filters.min_thc}
                onChange={(e) => set({ min_thc: e.target.value })}
                placeholder="0"
                className="w-full bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-brand"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Max</label>
              <input
                type="number"
                value={filters.max_thc}
                onChange={(e) => set({ max_thc: e.target.value })}
                placeholder="—"
                className="w-full bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-brand"
              />
            </div>
          </div>
        </Collapsible>

        {/* Cannabinoids — Pro feature */}
        <Collapsible title="Cannabinoids">
          <ProGate feature="Cannabinoid filtering">
            <div className="mb-3">
              <label className="text-xs text-zinc-500 mb-1 block">Min % (for selected)</label>
              <input
                type="number"
                step="0.1"
                value={filters.min_cannabinoid_pct}
                onChange={(e) => set({ min_cannabinoid_pct: e.target.value })}
                className="w-32 bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-brand"
              />
            </div>
            {cannabinoidGroups.map(({ group, items }) => (
              <div key={group} className="mb-3">
                <p className="text-xs text-zinc-600 uppercase tracking-wide font-semibold mb-2 capitalize">{group}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => toggleList("cannabinoids", c.key)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-pill border transition-colors",
                        filters.cannabinoids.includes(c.key)
                          ? "border-brand bg-brand/20 text-brand font-semibold"
                          : "border-surface-border text-zinc-400 hover:border-zinc-500"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </ProGate>
        </Collapsible>

        {/* Terpenes — Pro feature */}
        <Collapsible title="Terpenes">
          <ProGate feature="Terpene filtering">
            <div className="mb-3">
              <label className="text-xs text-zinc-500 mb-1 block">Min % (for selected)</label>
              <input
                type="number"
                step="0.05"
                value={filters.min_terpene_pct}
                onChange={(e) => set({ min_terpene_pct: e.target.value })}
                className="w-32 bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-brand"
              />
            </div>
            {terpeneGroups.map(({ group, items }) => (
              <div key={group} className="mb-3">
                <p className="text-xs text-zinc-600 uppercase tracking-wide font-semibold mb-2 capitalize">{group}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => toggleList("terpenes", t.key)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-pill border transition-colors",
                        filters.terpenes.includes(t.key)
                          ? "border-brand bg-brand/20 text-brand font-semibold"
                          : "border-surface-border text-zinc-400 hover:border-zinc-500"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </ProGate>
        </Collapsible>
      </div>

      {/* Apply */}
      <div className="px-4 py-4 border-t border-surface-border">
        <button
          onClick={onClose}
          className="w-full bg-brand text-black font-bold py-4 rounded-2xl text-base hover:bg-brand-dark transition-colors"
        >
          Apply Filters {activeCount(filters) > 0 ? `(${activeCount(filters)})` : ""}
        </button>
      </div>
    </div>
  );
}
