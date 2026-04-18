"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bell, Heart, MapPin, Scale } from "lucide-react";
import { useState } from "react";
import { TerpeneDonut } from "@/components/charts/TerpeneDonut";
import { ProductPlaceholder } from "@/components/ui/CannabisLeaf";
import { useDeviceId } from "@/hooks/useDeviceId";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// Compact product card — for feed rows, browse, recommend results.
// Tap to open the full detail page. Doesn't try to do everything.

interface Props {
  product: ProductOut;
  isFavorited?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  sativa: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  indica: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  hybrid: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  cbd:    "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const VALUE_COLOR = (ppg: number | null) => {
  if (!ppg) return "text-zinc-400";
  if (ppg < 8)  return "text-emerald-400";
  if (ppg < 12) return "text-teal-400";
  if (ppg < 16) return "text-yellow-400";
  return "text-zinc-400";
};

export function ProductCardCompact({ product, isFavorited }: Props) {
  const deviceId = useDeviceId();
  const [favored, setFavored] = useState(isFavorited ?? false);

  const hasTerpenes = product.terpenes && Object.keys(product.terpenes).length > 0;
  const bestPricing = product.pricing
    ?.filter((p) => "original_price" in p)
    .sort((a, b) => (a.price_per_gram ?? 99) - (b.price_per_gram ?? 99))[0]
    ?? product.pricing?.sort((a, b) => (a.price_per_gram ?? 99) - (b.price_per_gram ?? 99))[0];

  async function toggleFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFavored(!favored);
    if (!favored && deviceId) {
      try {
        await api.addFavorite({ device_id: deviceId, favorite_type: "product", product_id: product.id });
      } catch {}
    }
  }

  return (
    <Link href={`/products/${product.id}`} className="block">
      <motion.article
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        className="relative bg-surface-card rounded-card border border-surface-border overflow-hidden group active:border-brand/40 transition-colors"
      >
        {/* Hero — compact aspect ratio, donut overlay, sale badge */}
        <div className="relative w-full aspect-[2.2/1] bg-zinc-900 overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ProductPlaceholder
              productType={product.product_type}
              strainName={product.strain_name}
              className="w-full h-full"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Sale badge */}
          {product.is_on_sale && product.sale_pct_off && (
            <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-black px-2 py-1 rounded-pill">
              {product.sale_pct_off.toFixed(0)}% OFF
            </div>
          )}

          {/* Favorite button — top right */}
          <button
            onClick={toggleFav}
            className={cn(
              "absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-colors",
              favored ? "bg-brand/30 text-brand" : "bg-black/40 text-white hover:bg-brand/30"
            )}
            aria-label={favored ? "Saved" : "Save"}
          >
            <Heart size={14} fill={favored ? "currentColor" : "none"} />
          </button>

          {/* Donut overlay — bottom right of hero */}
          {hasTerpenes && (
            <div className="absolute bottom-2 right-2 drop-shadow-xl">
              <TerpeneDonut
                terpenes={product.terpenes!}
                totalPct={product.total_terpenes_pct}
                size={52}
              />
            </div>
          )}
        </div>

        {/* Content — terse */}
        <div className="px-4 py-3">
          {/* Name + type pill */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-white text-base leading-tight truncate">
                {product.strain_name ?? product.name}
              </h3>
              {product.brand && (
                <p className="text-xs text-zinc-500 truncate">{product.brand}</p>
              )}
            </div>
            {product.product_type && (
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded-pill border uppercase tracking-wider flex-shrink-0",
                TYPE_COLORS[product.product_type] ?? "bg-zinc-700/50 text-zinc-400 border-zinc-600"
              )}>
                {product.product_type[0]}
              </span>
            )}
          </div>

          {/* Single info row — potency + price + dispensary status */}
          <div className="flex items-center justify-between gap-3 mt-2">
            <div className="flex items-baseline gap-1">
              {product.thc_pct && (
                <span className="text-sm font-bold text-brand">
                  {product.thc_pct.toFixed(0)}%
                </span>
              )}
              {bestPricing && (
                <>
                  <span className="text-2xl font-black text-white ml-2">${bestPricing.price.toFixed(0)}</span>
                  {bestPricing.original_price && (
                    <span className="text-xs text-zinc-500 line-through">${bestPricing.original_price}</span>
                  )}
                  <span className="text-xs text-zinc-400 ml-0.5">{bestPricing.weight}</span>
                  {bestPricing.price_per_gram && (
                    <span className={cn("text-xs font-semibold ml-1", VALUE_COLOR(bestPricing.price_per_gram))}>
                      · ${bestPricing.price_per_gram}/g
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Dispensary line */}
          <div className="flex items-center gap-1 mt-1 text-xs text-zinc-500">
            <MapPin size={10} />
            <span className="truncate">{product.dispensary.name}</span>
            {product.dispensary.is_open_now != null && (
              <span className={cn(
                "ml-auto text-[10px] font-bold flex-shrink-0",
                product.dispensary.is_open_now ? "text-emerald-400" : "text-red-400"
              )}>
                {product.dispensary.is_open_now ? "OPEN" : "CLOSED"}
              </span>
            )}
            {product.distance_miles != null && (
              <span className="text-[10px] text-zinc-600 flex-shrink-0">· {product.distance_miles.toFixed(1)} mi</span>
            )}
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
