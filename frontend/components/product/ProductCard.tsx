"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Heart, MapPin, Scale, Package, ChevronRight } from "lucide-react";
import { TerpeneDonut } from "@/components/charts/TerpeneDonut";
import { ProductPlaceholder } from "@/components/ui/CannabisLeaf";
import { HandoffButton, DispensaryDirectionsButton } from "@/components/ui/HandoffButtons";
import { AlertSheet } from "@/components/product/AlertSheet";
import { QuickActions, TasteWarning } from "@/components/product/QuickActions";
import { useDeviceId } from "@/hooks/useDeviceId";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  product: ProductOut;
  onClick?: () => void;
  onFavorite?: (id: number) => void;
  onAlert?: (id: number) => void;
  isFavorited?: boolean;
  hasAlert?: boolean;
  /** Compact mode for feed rows — expand to full card on tap */
  compact?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  sativa:  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  indica:  "bg-violet-500/20 text-violet-400 border-violet-500/30",
  hybrid:  "bg-teal-500/20 text-teal-400 border-teal-500/30",
  cbd:     "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const VALUE_COLOR = (ppg: number | null) => {
  if (!ppg) return "text-zinc-400";
  if (ppg < 8)  return "text-emerald-400";
  if (ppg < 12) return "text-teal-400";
  if (ppg < 16) return "text-yellow-400";
  return "text-zinc-400";
};

export function ProductCard({ product, onClick, onFavorite, onAlert, isFavorited, hasAlert, compact }: Props) {
  const deviceId = useDeviceId();
  const [favored, setFavored] = useState(isFavorited ?? false);
  const [alerted, setAlerted] = useState(hasAlert ?? false);
  const [showAlertSheet, setShowAlertSheet] = useState(false);

  async function handleFavorite() {
    setFavored(!favored);
    onFavorite?.(product.id);
    if (!favored && deviceId) {
      try {
        await api.addFavorite({
          device_id: deviceId,
          favorite_type: "product",
          product_id: product.id,
        });
      } catch {
        // Already favorited or error — silently ignore
      }
    }
  }

  function handleAlertClick() {
    setShowAlertSheet(true);
    onAlert?.(product.id);
  }

  const bestPricing = product.pricing
    ?.filter((p) => "original_price" in p)
    .sort((a, b) => (a.price_per_gram ?? 99) - (b.price_per_gram ?? 99))[0]
    ?? product.pricing?.sort((a, b) => (a.price_per_gram ?? 99) - (b.price_per_gram ?? 99))[0];

  const stockCount = null; // would come from scraper if available

  const hasTerpenes = product.terpenes && Object.keys(product.terpenes).length > 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-surface-card rounded-card border border-surface-border cursor-pointer group"
      onClick={onClick}
    >
      {/* Hero image — owns its own overflow + rounded top corners */}
      <div className="relative w-full aspect-[16/9] bg-zinc-900 rounded-t-card overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <ProductPlaceholder
            productType={product.product_type}
            strainName={product.strain_name ?? product.name}
            className="w-full h-full"
          />
        )}

        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Sale badge */}
        {product.is_on_sale && product.sale_pct_off && (
          <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-pill">
            {product.sale_pct_off.toFixed(0)}% OFF
          </div>
        )}
      </div>

      {/* Donut sits in the article (not the hero), so it can overflow freely.
          Negative margin pulls it up to overlap the hero bottom edge. */}
      {hasTerpenes && (
        <div className="relative z-10 -mt-11 mb-2 flex justify-center pointer-events-none drop-shadow-2xl">
          <TerpeneDonut
            terpenes={product.terpenes!}
            totalPct={product.total_terpenes_pct}
            size={88}
          />
        </div>
      )}

      {/* Content */}
      <div className={cn("px-4 pb-4 relative", hasTerpenes ? "pt-2" : "pt-4")}>
        {/* Taste warning — surfaces if user previously rejected this product/strain/brand */}
        <div className="mb-2">
          <TasteWarning product={product} />
        </div>
        {/* Strain name + type */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="font-display font-bold text-lg text-white leading-tight">
              {product.strain_name ?? product.name}
            </h3>
            {product.brand && (
              <p className="text-xs text-zinc-500 mt-0.5">{product.brand}</p>
            )}
          </div>
          {product.product_type && (
            <span className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-pill border flex-shrink-0 uppercase tracking-wide",
              TYPE_COLORS[product.product_type] ?? "bg-zinc-700/50 text-zinc-400 border-zinc-600"
            )}>
              {product.product_type[0]}
            </span>
          )}
        </div>

        {/* Potency row */}
        <div className="flex gap-3 mb-3">
          {product.thc_pct && (
            <span className="text-sm font-semibold text-white">
              THC <span className="text-brand">{product.thc_pct.toFixed(1)}%</span>
            </span>
          )}
          {product.cbd_pct && product.cbd_pct > 0.1 && (
            <span className="text-sm font-semibold text-white">
              CBD <span className="text-blue-400">{product.cbd_pct.toFixed(1)}%</span>
            </span>
          )}
          {product.total_terpenes_pct && (
            <span className="text-sm font-semibold text-white">
              Terps <span className="text-orange-400">{product.total_terpenes_pct.toFixed(2)}%</span>
            </span>
          )}
        </div>

        {/* Dispensary + open status */}
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin size={12} className="text-zinc-500 flex-shrink-0" />
          <span className="text-sm text-zinc-400 truncate">{product.dispensary.name}</span>
          {product.dispensary.is_open_now !== null && (
            <span className={cn(
              "text-xs font-semibold ml-auto flex-shrink-0",
              product.dispensary.is_open_now ? "text-emerald-400" : "text-red-400"
            )}>
              {product.dispensary.is_open_now ? "OPEN" : "CLOSED"}
            </span>
          )}
          {product.distance_miles !== null && (
            <span className="text-xs text-zinc-500 flex-shrink-0">
              · {product.distance_miles.toFixed(1)} mi
            </span>
          )}
        </div>

        {/* Pricing — best weight highlighted */}
        {bestPricing && (
          <div className="bg-surface-elevated rounded-xl p-3 mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">${bestPricing.price}</span>
              {bestPricing.original_price && (
                <span className="text-base text-zinc-500 line-through">${bestPricing.original_price}</span>
              )}
              <span className="text-sm text-zinc-400 ml-1">{bestPricing.weight}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              {bestPricing.price_per_gram && (
                <span className={cn("flex items-center gap-1 text-sm font-semibold", VALUE_COLOR(bestPricing.price_per_gram))}>
                  <Scale size={12} />
                  ${bestPricing.price_per_gram}/g
                </span>
              )}
              {stockCount && (
                <span className="flex items-center gap-1 text-sm text-zinc-500">
                  <Package size={12} />
                  {stockCount} left
                </span>
              )}
              {product.harvest_date && (
                <span className="text-xs text-zinc-600 ml-auto">
                  {new Date(product.harvest_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Weight tier pills — tap to see all prices */}
        {product.pricing && product.pricing.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {product.pricing.map((p) => (
              <button
                key={p.weight}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-pill border transition-colors",
                  p === bestPricing
                    ? "border-brand text-brand bg-brand/10"
                    : "border-surface-border text-zinc-500 hover:border-zinc-500"
                )}
              >
                {p.weight} · ${p.price}
              </button>
            ))}
          </div>
        )}

        {/* Favorite + Alert — centered icon+label buttons, visually balanced */}
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleFavorite}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all text-sm font-semibold",
              favored
                ? "bg-brand/20 border-brand text-brand"
                : "bg-surface-elevated border-surface-border text-zinc-400 hover:border-zinc-500"
            )}
          >
            <Heart size={15} fill={favored ? "currentColor" : "none"} />
            {favored ? "Saved" : "Favorite"}
          </button>

          <button
            onClick={handleAlertClick}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all text-sm font-semibold",
              alerted
                ? "bg-brand/20 border-brand text-brand"
                : "bg-surface-elevated border-surface-border text-zinc-400 hover:border-zinc-500"
            )}
          >
            <Bell size={15} fill={alerted ? "currentColor" : "none"} />
            {alerted ? "Watching" : "Set Alert"}
          </button>
        </div>

        {/* Alert bottom sheet */}
        {showAlertSheet && (
          <AlertSheet
            product={product}
            onClose={() => { setShowAlertSheet(false); setAlerted(true); }}
          />
        )}

        {/* Reserve / Find on Menu + Directions — the smart hand-off row */}
        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          <HandoffButton product={product} variant="primary" className="flex-1" />
          <DispensaryDirectionsButton dispensary={product.dispensary} variant="ghost" />
        </div>

        {/* Quick actions: thumbs up/down + add to shopping list */}
        <div className="mt-3">
          <QuickActions product={product} />
        </div>

        {/* Secondary metadata */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-border">
          {product.dispensary.nj_license_number && (
            <span className="text-xs text-zinc-600 font-mono">
              # {product.dispensary.nj_license_number}
            </span>
          )}
          <a
            href={`https://reddit.com/search/?q=${encodeURIComponent(product.strain_name ?? product.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-zinc-500 hover:text-orange-400 transition-colors flex items-center gap-1 ml-auto"
          >
            Reddit Reviews <ChevronRight size={10} />
          </a>
        </div>
      </div>
    </motion.article>
  );
}
