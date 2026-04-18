"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Search, Flame, Clock, Tag } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function BrandsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "just_dropped" | "on_sale">("all");

  const { data: brands } = useSWR("brands-all", () => api.brands());

  const filtered = (brands ?? []).filter((b) => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "just_dropped" && !b.is_just_dropped) return false;
    if (filter === "on_sale" && b.on_sale_count === 0) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="px-4 pt-12 pb-4">
        <h1 className="font-display font-bold text-2xl text-white mb-3">Brands</h1>

        <div className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-xl px-3 py-2 mb-3">
          <Search size={14} className="text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands…"
            className="flex-1 bg-transparent text-white text-sm placeholder:text-zinc-600 outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {[
            { key: "all", label: "All", icon: null },
            { key: "just_dropped", label: "Just Dropped", icon: Flame },
            { key: "on_sale", label: "On Sale", icon: Tag },
          ].map((f) => {
            const Icon = f.icon as any;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as any)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-pill border font-semibold transition-colors",
                  filter === f.key
                    ? "border-brand bg-brand/20 text-brand"
                    : "border-surface-border text-zinc-500 hover:border-zinc-400"
                )}
              >
                {Icon && <Icon size={11} />} {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 space-y-2">
        {filtered.map((b) => (
          <Link key={b.name} href={`/brands/${encodeURIComponent(b.name)}`}>
            <div className="bg-surface-card border border-surface-border rounded-2xl p-4 flex items-center gap-3 hover:border-brand/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0 overflow-hidden">
                {b.image_url ? (
                  <img src={b.image_url} alt={b.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display font-bold text-zinc-500">
                    {b.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white text-sm truncate">{b.name}</p>
                  {b.is_just_dropped && (
                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-pill">
                      <Flame size={9} /> Hot
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                  <span>{b.strain_count} strains</span>
                  <span>· {b.dispensary_count} shops</span>
                  {b.on_sale_count > 0 && (
                    <span className="text-orange-400 font-semibold">· {b.on_sale_count} on sale</span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <Clock size={11} className="text-zinc-600 inline mr-1" />
                <span className="text-xs text-zinc-500">{b.days_since_last_drop}d</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
