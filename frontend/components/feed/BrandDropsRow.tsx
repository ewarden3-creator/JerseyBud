"use client";

import Link from "next/link";
import { Flame, Clock, ChevronRight, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import useSWR from "swr";
import { api } from "@/lib/api";
import { ProductPlaceholder } from "@/components/ui/CannabisLeaf";
import { cn } from "@/lib/utils";

const TYPE_DOT: Record<string, string> = {
  sativa: "bg-amber-400",
  indica: "bg-violet-400",
  hybrid: "bg-teal-400",
};

// "Just dropped" — bigger card showing 3 strain thumbnails with names
function JustDroppedCard({ brand }: { brand: BrandSummary }) {
  // Pull this brand's actual products to surface what dropped
  const { data: products } = useSWR(
    ["brand-products-mini", brand.name],
    () => api.brandProducts(brand.name)
  );
  const recentStrains = (products ?? []).slice(0, 3);

  return (
    <Link href={`/brands/${encodeURIComponent(brand.name)}`}>
      <div className="flex-shrink-0 w-72 bg-gradient-to-br from-orange-500/15 via-surface-card to-surface-card border border-orange-500/40 rounded-2xl overflow-hidden hover:border-orange-500/70 transition-colors">
        {/* Header strip */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-1.5">
          <Flame size={12} className="text-orange-400" />
          <span className="text-[10px] uppercase font-black tracking-wider text-orange-400">
            Just Dropped
          </span>
          <span className="text-[10px] text-zinc-500 ml-auto font-medium">
            {brand.days_since_last_drop === 0 ? "Today" : `${brand.days_since_last_drop}d ago`}
          </span>
        </div>

        <h3 className="font-display font-bold text-white text-xl px-4 leading-tight">
          {brand.name}
        </h3>

        {/* Strain thumbnails — show what they actually dropped */}
        {recentStrains.length > 0 && (
          <div className="px-4 mt-3 space-y-2">
            {recentStrains.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 bg-surface-elevated/60 rounded-xl px-2 py-2">
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  <ProductPlaceholder
                    productType={p.product_type}
                    strainName={p.strain_name}
                    className="w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {p.product_type && (
                      <span className={cn("w-1.5 h-1.5 rounded-full", TYPE_DOT[p.product_type] ?? "bg-zinc-500")} />
                    )}
                    <p className="text-xs font-bold text-white truncate">{p.strain_name}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={9} className="text-zinc-600" />
                    <span className="text-[10px] text-zinc-500 truncate">{p.dispensary.name}</span>
                  </div>
                </div>
                {p.thc_pct && (
                  <span className="text-[10px] font-bold text-brand flex-shrink-0 whitespace-nowrap">
                    {p.thc_pct.toFixed(0)}% THC
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 mt-3 border-t border-surface-border flex items-center gap-3 text-[10px] text-zinc-500">
          <span><span className="text-white font-bold">{brand.dispensary_count}</span> shops</span>
          {brand.on_sale_count > 0 && (
            <span className="text-orange-400 font-bold">
              {brand.on_sale_count} on sale
            </span>
          )}
          <span className="ml-auto flex items-center gap-0.5 text-brand font-semibold">
            See all <ChevronRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  );
}

// "Last drop X days ago" countdown card — shorter, no thumbnails
function CountdownCard({ brand }: { brand: BrandSummary }) {
  const days = brand.days_since_last_drop ?? 0;
  const hot = days < 14;
  return (
    <Link href={`/brands/${encodeURIComponent(brand.name)}`}>
      <div className="flex-shrink-0 w-48 bg-surface-card border border-surface-border rounded-2xl p-4 hover:border-zinc-500 transition-colors h-full">
        <div className="flex items-center gap-1.5 mb-2">
          <Clock size={12} className={cn(hot ? "text-amber-400" : "text-zinc-500")} />
          <span className="text-[10px] uppercase font-bold tracking-wide text-zinc-500">
            Last drop
          </span>
        </div>
        <h3 className="font-display font-bold text-white text-lg leading-tight mb-2">
          {brand.name}
        </h3>
        <p className={cn("text-3xl font-black mb-1", hot ? "text-amber-400" : "text-zinc-500")}>
          {days}
          <span className="text-xs text-zinc-500 ml-1.5 font-medium">d ago</span>
        </p>
        <div className="flex items-center gap-2 text-[10px] text-zinc-600 mt-2">
          <span>{brand.strain_count} strains</span>
          {brand.avg_thc && <span>· {brand.avg_thc}% avg</span>}
        </div>
      </div>
    </Link>
  );
}

export function BrandDropsRow({ brands }: { brands: BrandSummary[] }) {
  const justDropped = brands.filter((b) => b.is_just_dropped);
  const others = brands.filter((b) => !b.is_just_dropped).slice(0, 6);

  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x scrollbar-hide">
      {justDropped.map((b, i) => (
        <motion.div
          key={b.name}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="snap-start"
        >
          <JustDroppedCard brand={b} />
        </motion.div>
      ))}
      {others.map((b) => (
        <div key={b.name} className="snap-start">
          <CountdownCard brand={b} />
        </div>
      ))}
    </div>
  );
}
