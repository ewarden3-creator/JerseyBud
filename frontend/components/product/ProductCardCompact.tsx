"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { Heart } from "lucide-react";
import { ProductPlaceholder } from "@/components/ui/CannabisLeaf";
import { useDeviceId } from "@/hooks/useDeviceId";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// Stripped-down feed card — image, name, brand, price.
// Everything else (status, distance, terps, etc) lives on the detail page.
// One job: be scannable and tap-to-open.

interface Props {
  product: ProductOut;
  isFavorited?: boolean;
}

export function ProductCardCompact({ product, isFavorited }: Props) {
  const deviceId = useDeviceId();
  const [favored, setFavored] = useState(isFavorited ?? false);

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
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        className="bg-surface-card rounded-2xl border border-surface-border overflow-hidden active:border-brand/40 transition-colors"
      >
        {/* Hero — clean, no donut overlay, just sale badge + favorite */}
        <div className="relative w-full aspect-[5/3] bg-zinc-900 overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ProductPlaceholder
              productType={product.product_type}
              strainName={product.strain_name}
              className="w-full h-full"
            />
          )}

          {/* Sale badge */}
          {product.is_on_sale && product.sale_pct_off && (
            <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-black px-2.5 py-1 rounded-pill">
              {product.sale_pct_off.toFixed(0)}% OFF
            </div>
          )}

          {/* Favorite */}
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
        </div>

        {/* Content — just name + brand + price. That's it. */}
        <div className="px-4 py-4">
          <h3 className="font-display font-bold text-white text-lg leading-tight truncate">
            {product.strain_name ?? product.name}
          </h3>
          {product.brand && (
            <p className="text-sm text-zinc-500 truncate mt-0.5">{product.brand}</p>
          )}

          {bestPricing && (
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-2xl font-black text-white">${bestPricing.price.toFixed(0)}</span>
              {bestPricing.original_price && (
                <span className="text-sm text-zinc-500 line-through">${bestPricing.original_price}</span>
              )}
              <span className="text-sm text-zinc-400 ml-auto">{bestPricing.weight}</span>
            </div>
          )}
        </div>
      </motion.article>
    </Link>
  );
}
