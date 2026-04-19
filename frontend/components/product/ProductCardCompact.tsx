"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { Heart } from "lucide-react";
import { TerpeneDonut } from "@/components/charts/TerpeneDonut";
import { ProductPlaceholder } from "@/components/ui/CannabisLeaf";
import { useDeviceId } from "@/hooks/useDeviceId";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// "Spotify of weed" card — Strain Bloom as album art on the left,
// dense lab + price info on the right. The bloom carries the terpene
// + potency story visually so we don't duplicate it in text.

interface Props {
  product: ProductOut;
  isFavorited?: boolean;
}

const VALUE_GRADE = (ppg: number | null) => {
  if (!ppg) return { label: "—", color: "bg-zinc-700 text-zinc-300" };
  if (ppg < 8)  return { label: "GREAT VALUE", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" };
  if (ppg < 12) return { label: "GOOD VALUE",  color: "bg-brand/20 text-brand border-brand/40" };
  if (ppg < 16) return { label: "AVG VALUE",   color: "bg-zinc-700/60 text-zinc-300 border-zinc-600" };
  return { label: "PREMIUM", color: "bg-zinc-700/60 text-zinc-400 border-zinc-700" };
};

export function ProductCardCompact({ product, isFavorited }: Props) {
  const deviceId = useDeviceId();
  const [favored, setFavored] = useState(isFavorited ?? false);

  const bestPricing = product.pricing
    ?.filter((p) => "original_price" in p)
    .sort((a, b) => (a.price_per_gram ?? 99) - (b.price_per_gram ?? 99))[0]
    ?? product.pricing?.sort((a, b) => (a.price_per_gram ?? 99) - (b.price_per_gram ?? 99))[0];

  const valueGrade = VALUE_GRADE(product.best_price_per_gram);

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
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        className="bg-surface-card rounded-2xl border border-surface-border overflow-hidden active:border-brand/40 transition-colors"
      >
        <div className="flex gap-3 p-3">
          {/* Terpene donut — top 3 terpenes as colored arcs, THC% in center.
              Same colors used in the legend pills below the card → user learns
              the visual language by seeing both side-by-side. */}
          <div className="flex-shrink-0 relative w-[88px] h-[88px] flex items-center justify-center">
            {product.terpenes && Object.keys(product.terpenes).length > 0 ? (
              <TerpeneDonut
                terpenes={product.terpenes}
                thcPct={product.thc_pct}
                cbdPct={product.cbd_pct}
                size={88}
              />
            ) : (
              <ProductPlaceholder
                productType={product.product_type}
                strainName={product.strain_name}
                className="w-full h-full rounded-xl"
              />
            )}
            {/* Sale chevron */}
            {product.is_on_sale && product.sale_pct_off && (
              <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded z-10">
                −{product.sale_pct_off.toFixed(0)}%
              </div>
            )}
          </div>

          {/* Right column — dense info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            {/* Top: name + brand + favorite */}
            <div>
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-white text-base leading-tight truncate">
                    {product.strain_name ?? product.name}
                  </h3>
                  {product.brand && (
                    <p className="text-xs text-zinc-500 truncate">{product.brand}</p>
                  )}
                </div>
                <button
                  onClick={toggleFav}
                  className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                    favored ? "text-brand" : "text-zinc-600 hover:text-brand"
                  )}
                  aria-label={favored ? "Saved" : "Save"}
                >
                  <Heart size={14} fill={favored ? "currentColor" : "none"} />
                </button>
              </div>

            </div>

            {/* Bottom: price + value grade */}
            <div className="flex items-end justify-between gap-2 mt-2">
              <div>
                {bestPricing && (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-white leading-none">
                        ${bestPricing.price.toFixed(0)}
                      </span>
                      {bestPricing.original_price && (
                        <span className="text-[11px] text-zinc-500 line-through">${bestPricing.original_price}</span>
                      )}
                      <span className="text-[11px] text-zinc-500 ml-0.5">{bestPricing.weight}</span>
                    </div>
                    {bestPricing.price_per_gram && (
                      <p className="text-[11px] text-zinc-400 font-semibold mt-0.5">
                        ${bestPricing.price_per_gram}/g
                      </p>
                    )}
                  </>
                )}
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap",
                valueGrade.color
              )}>
                {valueGrade.label}
              </span>
            </div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
