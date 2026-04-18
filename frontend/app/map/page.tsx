"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Clock, Truck, Accessibility, Phone, ExternalLink,
  Navigation, ShoppingBag, Crosshair,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { directionsUrl } from "@/lib/handoff";
import { cn } from "@/lib/utils";

// Leaflet relies on `window` — must be client-only
const DispensaryMap = dynamic(
  () => import("@/components/map/DispensaryMap").then((m) => m.DispensaryMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-zinc-950" /> }
);

export default function MapPage() {
  const { lat, lng } = useLocation();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filters, setFilters] = useState({ open_now: false, delivery: false });

  const { data: dispensaries } = useSWR(
    ["dispensaries-map", filters.open_now, filters.delivery],
    () => api.dispensaries({
      ...(filters.open_now ? { open_now: "true" } : {}),
      ...(filters.delivery ? { delivery: "true" } : {}),
    })
  );

  const selected = dispensaries?.find((d) => d.id === selectedId);

  function recenter() {
    if (!lat || !lng) return;
    // Force re-render of MapController by toggling selection
    setSelectedId(null);
  }

  return (
    <div className="relative bg-surface flex flex-col" style={{ height: "100vh" }}>
      {/* Top filter bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-surface/85 backdrop-blur-md border-b border-surface-border">
        <div className="px-4 py-3 flex items-center gap-2">
          <h1 className="font-display font-bold text-white text-lg flex-1">Map</h1>
          <button
            onClick={() => setFilters({ ...filters, open_now: !filters.open_now })}
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-pill border transition-colors",
              filters.open_now
                ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                : "border-surface-border text-zinc-400"
            )}
          >
            <Clock size={11} /> Open
          </button>
          <button
            onClick={() => setFilters({ ...filters, delivery: !filters.delivery })}
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-pill border transition-colors",
              filters.delivery
                ? "border-teal-500 text-teal-400 bg-teal-500/10"
                : "border-surface-border text-zinc-400"
            )}
          >
            <Truck size={11} /> Delivery
          </button>
        </div>
      </div>

      {/* Map fills available space (above bottom nav) */}
      <div className="flex-1 relative" style={{ paddingBottom: "60px" }}>
        <DispensaryMap
          dispensaries={dispensaries ?? []}
          selectedId={selectedId}
          onSelect={(d) => setSelectedId(d.id)}
          userLat={lat}
          userLng={lng}
        />

        {/* Recenter button */}
        {lat && lng && (
          <button
            onClick={recenter}
            className="absolute bottom-24 right-4 z-30 w-11 h-11 rounded-full bg-surface-card border border-surface-border shadow-lg flex items-center justify-center text-brand hover:bg-surface-elevated transition-colors"
            aria-label="Recenter on me"
          >
            <Crosshair size={18} />
          </button>
        )}

        {/* Legend pill */}
        <div className="absolute bottom-24 left-4 z-30 bg-surface-card/90 backdrop-blur border border-surface-border rounded-pill px-3 py-1.5 flex items-center gap-2 text-[10px] text-zinc-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Open</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Deal</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500" /> Closed</span>
        </div>
      </div>

      {/* Bottom sheet for selected dispensary */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30 }}
            className="absolute bottom-16 left-0 right-0 z-40 max-w-xl mx-auto bg-surface-card border-t border-surface-border rounded-t-3xl p-5 pb-7"
          >
            {/* Drag handle */}
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />

            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0 overflow-hidden">
                {selected.logo_url ? (
                  <img src={selected.logo_url} alt={selected.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">🏪</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white text-base leading-tight">{selected.name}</h3>
                  <button onClick={() => setSelectedId(null)} className="text-zinc-500 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{selected.address}</p>
                <p className="text-xs text-zinc-600">{selected.city}, NJ {selected.zip_code}</p>
              </div>
            </div>

            {/* Status + amenities */}
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {selected.is_open_now !== null && (
                <span className={cn(
                  "text-xs font-bold px-2.5 py-1 rounded-pill",
                  selected.is_open_now ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                )}>
                  {selected.is_open_now ? "OPEN" : "CLOSED"}
                </span>
              )}
              {selected.distance_miles != null && (
                <span className="text-xs text-zinc-500">{selected.distance_miles.toFixed(1)} mi</span>
              )}
              {selected.delivery && (
                <span className="flex items-center gap-1 text-xs text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded-pill">
                  <Truck size={9} /> Delivery
                </span>
              )}
              {selected.wheelchair_accessible && (
                <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-pill">
                  <Accessibility size={9} /> Accessible
                </span>
              )}
            </div>

            {/* Action row */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              {selected.lat != null && selected.lng != null && (
                <a
                  href={directionsUrl(selected.lat, selected.lng, selected.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-brand text-black font-bold text-sm hover:bg-brand-dark transition-colors"
                >
                  <Navigation size={14} /> Directions
                </a>
              )}
              {selected.website && (
                <a
                  href={selected.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-surface-elevated border border-surface-border text-white font-semibold text-sm hover:border-zinc-500 transition-colors"
                >
                  <ShoppingBag size={14} /> Shop
                </a>
              )}
              <Link
                href={`/dispensaries/${selected.slug}`}
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-surface-elevated border border-surface-border text-white font-semibold text-sm hover:border-zinc-500 transition-colors"
              >
                Menu <ExternalLink size={11} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
