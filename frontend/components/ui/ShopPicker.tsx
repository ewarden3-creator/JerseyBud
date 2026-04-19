"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, MapPin, Check, Globe2 } from "lucide-react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
}

export function ShopPicker({ open, onClose, selectedSlug, onSelect }: Props) {
  const { lat, lng } = useLocation();
  const [search, setSearch] = useState("");

  const { data: dispensaries } = useSWR(
    open ? ["shop-picker", lat, lng] : null,
    () => api.dispensaries(lat ? { lat: String(lat), lng: String(lng) } : {})
  );

  const filtered = (dispensaries ?? []).filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase())
      || d.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-surface-card border-t border-surface-border rounded-t-3xl flex flex-col max-h-[85vh]"
          >
            {/* Drag handle */}
            <div className="pt-3 pb-2">
              <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto" />
            </div>

            {/* Header */}
            <div className="px-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-xl text-white">Shopping at</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Pick your shop, or browse everything in NJ.</p>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pt-4">
              <div className="flex items-center gap-2 bg-surface-elevated border border-surface-border rounded-xl px-3 py-2.5">
                <Search size={14} className="text-zinc-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search shops or cities…"
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* All NJ option */}
            <div className="px-5 pt-3">
              <button
                onClick={() => { onSelect(null); onClose(); }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors",
                  selectedSlug === null
                    ? "bg-brand/15 border-brand text-brand"
                    : "bg-surface-elevated border-surface-border hover:border-zinc-500"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-surface-card flex items-center justify-center flex-shrink-0">
                  <Globe2 size={16} className={selectedSlug === null ? "text-brand" : "text-zinc-400"} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-white">All NJ shops</p>
                  <p className="text-xs text-zinc-500">Browse every dispensary</p>
                </div>
                {selectedSlug === null && <Check size={16} className="text-brand" />}
              </button>
            </div>

            {/* Shop list */}
            <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6 space-y-2">
              {filtered.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { onSelect(d.slug); onClose(); }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors text-left",
                    selectedSlug === d.slug
                      ? "bg-brand/15 border-brand text-brand"
                      : "bg-surface-elevated border-surface-border hover:border-zinc-500"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-surface-card flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {d.logo_url ? (
                      <img src={d.logo_url} alt={d.name} className="w-full h-full object-cover" />
                    ) : (
                      <MapPin size={14} className="text-zinc-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{d.name}</p>
                      {d.is_open_now != null && (
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wider flex-shrink-0",
                          d.is_open_now ? "text-emerald-400" : "text-red-400"
                        )}>
                          {d.is_open_now ? "OPEN" : "CLOSED"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5">
                      <span>{d.city}, NJ</span>
                      {d.distance_miles != null && (
                        <span className="text-zinc-600">· {d.distance_miles.toFixed(1)} mi</span>
                      )}
                    </div>
                  </div>
                  {selectedSlug === d.slug && <Check size={16} className="text-brand flex-shrink-0" />}
                </button>
              ))}

              {filtered.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-6">No shops match.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
