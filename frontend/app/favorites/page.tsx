"use client";

import { useState } from "react";
import useSWR from "swr";
import { Heart, Package, Sparkles, MapPin } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useDeviceId } from "@/hooks/useDeviceId";
import { ProductCardCompact } from "@/components/product/ProductCardCompact";
import { cn } from "@/lib/utils";

type Tab = "all" | "product" | "strain" | "dispensary";

export default function FavoritesPage() {
  const deviceId = useDeviceId();
  const [tab, setTab] = useState<Tab>("all");
  const { data: favs, mutate } = useSWR(
    deviceId ? ["favorites", deviceId] : null,
    () => api.favorites(deviceId)
  );

  async function remove(id: number) {
    await api.removeFavorite(id, deviceId);
    mutate();
  }

  const filtered = favs?.filter((f) => tab === "all" || f.favorite_type === tab) ?? [];

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: "all",         label: "All",         icon: Heart },
    { key: "product",     label: "Products",    icon: Package },
    { key: "strain",      label: "Strains",     icon: Sparkles },
    { key: "dispensary",  label: "Dispensaries",icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="px-4 pt-12 pb-4">
        <h1 className="font-display font-bold text-2xl text-white mb-3">Your Saved</h1>

        {/* Tab strip */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-pill border font-semibold transition-colors",
                  tab === t.key
                    ? "border-brand bg-brand/20 text-brand"
                    : "border-surface-border text-zinc-500 hover:border-zinc-400"
                )}
              >
                <Icon size={11} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 space-y-3">
        {filtered.map((f) => {
          // Product favorite
          if (f.product) {
            return (
              <div key={f.id} className="relative">
                <ProductCardCompact product={f.product} isFavorited />
              </div>
            );
          }
          // Dispensary favorite
          if (f.dispensary) {
            return (
              <Link key={f.id} href={`/dispensaries/${f.dispensary.slug}`}>
                <div className="bg-surface-card border border-surface-border rounded-2xl p-4 flex items-center gap-3 hover:border-brand/40 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {f.dispensary.logo_url ? (
                      <img src={f.dispensary.logo_url} alt={f.dispensary.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">🏪</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{f.dispensary.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{f.dispensary.city}, NJ</p>
                  </div>
                </div>
              </Link>
            );
          }
          // Strain favorite
          if (f.strain_name) {
            return (
              <Link key={f.id} href={`/strains/${encodeURIComponent(f.strain_name)}`}>
                <div className="bg-surface-card border border-surface-border rounded-2xl p-4 flex items-center gap-3 hover:border-brand/40 transition-colors">
                  <Sparkles size={18} className="text-amber-400 flex-shrink-0" />
                  <p className="font-semibold text-white text-sm truncate flex-1">{f.strain_name}</p>
                </div>
              </Link>
            );
          }
          return null;
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Heart size={36} className="text-zinc-700 mb-3" />
            <p className="text-white font-semibold mb-1">Nothing saved yet</p>
            <p className="text-zinc-500 text-sm max-w-xs">
              Tap the heart on any product, strain, or dispensary to save it for quick access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
