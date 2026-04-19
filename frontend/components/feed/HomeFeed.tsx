"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight, MapPin, ShoppingBag } from "lucide-react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { ProductCardCompact } from "@/components/product/ProductCardCompact";
import { BrandDropsRow } from "@/components/feed/BrandDropsRow";
import { AskBudHero } from "@/components/feed/AskBudHero";
import { ProductPlaceholder } from "@/components/ui/CannabisLeaf";

function SectionHeader({ title, kicker, href }: { title: string; kicker?: string; href?: string }) {
  return (
    <div className="flex items-end justify-between px-5 mb-4">
      <div>
        {kicker && (
          <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-bold mb-0.5">{kicker}</p>
        )}
        <h2 className="font-display font-black text-white text-2xl leading-none">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-sm text-brand font-semibold flex items-center gap-0.5">
          See all <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

function ProductRow({ products }: { products: ProductOut[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto px-5 pb-2 snap-x snap-mandatory scrollbar-hide">
      {products.map((p) => (
        <div key={p.id} className="flex-shrink-0 w-[330px] snap-start">
          <ProductCardCompact product={p} />
        </div>
      ))}
    </div>
  );
}

// The hero — singular, dominant, today's top deal
function TopDealHero({ deal }: { deal: DealOut }) {
  const p = deal.product;
  return (
    <div className="px-5 pt-2 pb-2">
      <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-bold mb-2">
        Today's top deal
      </p>
      <Link href={`/products/${p.id}`}>
        <div className="bg-surface-card border border-surface-border rounded-3xl overflow-hidden active:border-brand/40 transition-colors">
          {/* Big image */}
          <div className="relative w-full aspect-[16/9] bg-zinc-900 overflow-hidden">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <ProductPlaceholder
                productType={p.product_type}
                strainName={p.strain_name}
                className="w-full h-full"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
            {/* Sale stamp top-right */}
            {deal.sale_pct_off && (
              <div className="absolute top-4 right-4 bg-orange-500 text-white text-sm font-black px-3 py-1.5 rounded-pill">
                {deal.sale_pct_off.toFixed(0)}% OFF
              </div>
            )}
            {/* Strain name overlaid bottom */}
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white text-xs font-semibold opacity-80">{p.brand}</p>
              <h3 className="text-white font-display font-black text-3xl leading-tight">
                {p.strain_name ?? p.name}
              </h3>
            </div>
          </div>

          {/* Stat strip */}
          <div className="px-5 py-4">
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-black text-white">${deal.best_price.toFixed(0)}</span>
              {deal.original_price && (
                <span className="text-base text-zinc-500 line-through ml-1">${deal.original_price}</span>
              )}
              <span className="text-sm text-zinc-400 ml-1">{deal.best_weight}</span>
              {deal.best_price_per_gram && (
                <span className="text-sm font-semibold text-brand ml-2">
                  ${deal.best_price_per_gram}/g
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-zinc-400">
              <MapPin size={11} className="text-zinc-600" />
              <span>{deal.dispensary_name}</span>
              {deal.distance_miles != null && (
                <span className="text-zinc-600">· {deal.distance_miles.toFixed(1)} mi</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export function HomeFeed() {
  const { lat, lng } = useLocation();
  const locParams: Record<string, string> = lat ? { lat: String(lat), lng: String(lng) } : {};

  const { data: deals } = useSWR(["deals", lat, lng], () =>
    api.deals({ ...locParams, sort: "pct_off", limit: "12" })
  );
  const { data: valuePicks } = useSWR(["deals-value", lat, lng], () =>
    api.deals({ ...locParams, sort: "price_per_gram", limit: "12" })
  );
  const { data: trends } = useSWR("trends", () => api.trends("flower"));
  const { data: brands } = useSWR("brands", () => api.brands());

  return (
    <div className="min-h-screen bg-surface pb-32">
      <AskBudHero />

      <div className="space-y-10 mt-4">
        {/* On sale — the cards do the visual work now */}
        {deals && deals.length > 0 && (
          <section>
            <SectionHeader kicker="Save big" title="On sale near you" href="/feed?on_sale=true" />
            <ProductRow products={deals.map((d) => d.product)} />
          </section>
        )}

        {/* Best Value */}
        {valuePicks && valuePicks.length > 0 && (
          <section>
            <SectionHeader kicker="Most for your money" title="Best value" href="/feed?sort=price_per_gram" />
            <ProductRow products={valuePicks.map((d) => d.product)} />
          </section>
        )}

        {/* Trending strains */}
        {trends && trends.length > 0 && (
          <section>
            <SectionHeader kicker="Right now" title="Trending in NJ" />
            <div className="flex gap-3 overflow-x-auto px-5 pb-2 snap-x scrollbar-hide">
              {trends.slice(0, 12).map((t) => (
                <Link
                  key={t.strain_name}
                  href={`/strains/${encodeURIComponent(t.strain_name)}`}
                  className="flex-shrink-0 bg-surface-card border border-surface-border rounded-2xl px-5 py-4 hover:border-brand/40 transition-colors min-w-[180px]"
                >
                  <p className="font-display font-bold text-white text-base leading-tight mb-1">{t.strain_name}</p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    {t.product_type && <span className="capitalize">{t.product_type}</span>}
                    {t.avg_thc && <span className="text-brand font-semibold">· {t.avg_thc}% THC</span>}
                  </div>
                  <p className="text-xs text-zinc-600 mt-2">at {t.dispensary_count} dispensaries</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Brand drops */}
        {brands && brands.length > 0 && (
          <section>
            <SectionHeader kicker="Fresh shelves" title="Brand drops" href="/brands" />
            <BrandDropsRow brands={brands} />
          </section>
        )}
      </div>
    </div>
  );
}
