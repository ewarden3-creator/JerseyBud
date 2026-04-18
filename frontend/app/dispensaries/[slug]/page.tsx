"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft, Phone, Globe, MapPin, Clock, Truck,
  Accessibility, CreditCard, Flag, ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { ProductCardCompact } from "@/components/product/ProductCardCompact";
import { cn } from "@/lib/utils";

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

function todayKey(): string {
  const idx = new Date().getDay();
  return DAYS[idx === 0 ? 6 : idx - 1].key;
}

export default function DispensaryDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [menuCategory, setMenuCategory] = useState<string>("");

  const { data: dispensary } = useSWR(["dispensary", slug], () => api.dispensary(slug));
  const { data: menu } = useSWR(
    ["menu", slug, menuCategory],
    () => api.menu(slug, { ...(menuCategory ? { category: menuCategory } : {}), sort: "price_per_gram" })
  );

  if (!dispensary) {
    return <div className="p-8 text-center text-zinc-500">Loading…</div>;
  }

  const today = todayKey();
  const mapUrl = dispensary.lat && dispensary.lng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${dispensary.lng - 0.01},${dispensary.lat - 0.01},${dispensary.lng + 0.01},${dispensary.lat + 0.01}&layer=mapnik&marker=${dispensary.lat},${dispensary.lng}`
    : null;
  const directionsUrl = dispensary.lat && dispensary.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${dispensary.lat},${dispensary.lng}`
    : null;

  const CATEGORIES = ["", "flower", "pre-roll", "vaporizer", "edible", "concentrate"];

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Hero with map */}
      <div className="relative">
        {mapUrl ? (
          <iframe
            src={mapUrl}
            className="w-full h-56 border-0"
            loading="lazy"
            title="Dispensary location"
          />
        ) : (
          <div className="w-full h-56 bg-surface-card flex items-center justify-center">
            <MapPin size={48} className="text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/0 to-surface/0 pointer-events-none" />
        <button
          onClick={() => router.back()}
          className="absolute top-12 left-4 w-10 h-10 rounded-full bg-surface-card/90 backdrop-blur flex items-center justify-center text-white hover:bg-surface-elevated transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Header info */}
      <div className="px-4 -mt-8 relative z-10">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
          <div className="flex gap-3 mb-3">
            <div className="w-14 h-14 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0 overflow-hidden">
              {dispensary.logo_url ? (
                <img src={dispensary.logo_url} alt={dispensary.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🏪</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-xl text-white leading-tight">{dispensary.name}</h1>
              <p className="text-sm text-zinc-500 mt-0.5">{dispensary.address}</p>
              <p className="text-xs text-zinc-600">{dispensary.city}, NJ {dispensary.zip_code}</p>
            </div>
          </div>

          {/* Open status pill */}
          {dispensary.is_open_now !== null && (
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-pill text-sm font-semibold mb-3",
              dispensary.is_open_now ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            )}>
              <Clock size={12} />
              {dispensary.is_open_now ? "Open Now" : "Closed"}
              {dispensary.hours?.[today] && (
                <span className="text-zinc-400 font-normal">· Today {dispensary.hours[today]}</span>
              )}
            </div>
          )}

          {/* Action row */}
          <div className="grid grid-cols-3 gap-2">
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-surface-elevated hover:bg-surface-border transition-colors"
              >
                <MapPin size={16} className="text-brand" />
                <span className="text-xs text-white font-semibold">Directions</span>
              </a>
            )}
            {dispensary.phone && (
              <a
                href={`tel:${dispensary.phone}`}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-surface-elevated hover:bg-surface-border transition-colors"
              >
                <Phone size={16} className="text-brand" />
                <span className="text-xs text-white font-semibold">Call</span>
              </a>
            )}
            {dispensary.website && (
              <a
                href={dispensary.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-surface-elevated hover:bg-surface-border transition-colors"
              >
                <Globe size={16} className="text-brand" />
                <span className="text-xs text-white font-semibold">Order</span>
              </a>
            )}
          </div>

          {/* Amenity chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {dispensary.delivery && (
              <span className="flex items-center gap-1 text-xs text-teal-400 bg-teal-400/10 px-2.5 py-1 rounded-pill">
                <Truck size={10} /> Delivery
              </span>
            )}
            {dispensary.curbside_pickup && (
              <span className="text-xs text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-pill">Curbside</span>
            )}
            {dispensary.wheelchair_accessible && (
              <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-pill">
                <Accessibility size={10} /> Accessible
              </span>
            )}
            {dispensary.atm && (
              <span className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-400/10 px-2.5 py-1 rounded-pill">
                <CreditCard size={10} /> ATM
              </span>
            )}
            {dispensary.medical && (
              <span className="text-xs text-purple-400 bg-purple-400/10 px-2.5 py-1 rounded-pill">Medical</span>
            )}
            {dispensary.recreational && (
              <span className="text-xs text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-pill">Recreational</span>
            )}
          </div>
        </div>
      </div>

      {/* Hours grid */}
      {dispensary.hours && (
        <div className="px-4 mt-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Clock size={14} className="text-brand" /> Hours
            </h3>
            <div className="grid grid-cols-7 gap-1 text-center">
              {DAYS.map((d) => {
                const slot = dispensary.hours![d.key];
                const isToday = d.key === today;
                return (
                  <div
                    key={d.key}
                    className={cn(
                      "flex flex-col gap-1 py-2 rounded-lg",
                      isToday && "bg-brand/10 border border-brand/30"
                    )}
                  >
                    <span className={cn("text-xs font-semibold", isToday ? "text-brand" : "text-zinc-500")}>{d.label}</span>
                    <span className={cn("text-[10px]", isToday ? "text-white" : "text-zinc-600")}>
                      {slot ? slot.replace(" - ", "–") : "Closed"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* License + Report row */}
      <div className="px-4 mt-4">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4 flex items-center justify-between">
          {dispensary.nj_license_number && (
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wide font-semibold">NJ License</p>
              <a
                href="https://www.nj.gov/cannabis/businesses/license-search"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-brand hover:text-brand-dark flex items-center gap-1"
              >
                #{dispensary.nj_license_number} <ExternalLink size={10} />
              </a>
            </div>
          )}
          <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors">
            <Flag size={12} /> Report Issue
          </button>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 mt-6">
        <h3 className="font-display font-bold text-lg text-white mb-3">Live Menu</h3>

        {/* Category tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c || "all"}
              onClick={() => setMenuCategory(c)}
              className={cn(
                "flex-shrink-0 text-sm px-4 py-2 rounded-pill border transition-colors capitalize",
                menuCategory === c
                  ? "border-brand bg-brand/20 text-brand font-semibold"
                  : "border-surface-border text-zinc-500 hover:border-zinc-400"
              )}
            >
              {c || "All"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {menu?.map((p) => <ProductCardCompact key={p.id} product={p} />)}
          {menu && menu.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-8">No products in stock for this category.</p>
          )}
        </div>
      </div>
    </div>
  );
}
