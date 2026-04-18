"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, TrendingUp, Sparkles, Tag, ChevronRight, Package2 } from "lucide-react";
import { ProductCardCompact } from "@/components/product/ProductCardCompact";
import { BrandDropsRow } from "@/components/feed/BrandDropsRow";
import { UpgradeBanner } from "@/components/pro/ProGate";
import { AskBudHero } from "@/components/feed/AskBudHero";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useDeviceId } from "@/hooks/useDeviceId";
import { useLocation } from "@/hooks/useLocation";

// Horizontal scroll section header
function SectionHeader({ icon: Icon, title, href }: { icon: any; title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between px-4 mb-3">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-brand" />
        <h2 className="font-display font-bold text-white text-base">{title}</h2>
      </div>
      {href && (
        <a href={href} className="text-xs text-zinc-500 hover:text-brand flex items-center gap-0.5 transition-colors">
          See all <ChevronRight size={12} />
        </a>
      )}
    </div>
  );
}

// Horizontal scroll row of product cards
function ProductRow({ products }: { products: ProductOut[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide">
      {products.map((p) => (
        <div key={p.id} className="flex-shrink-0 w-72 snap-start">
          <ProductCardCompact product={p} />
        </div>
      ))}
    </div>
  );
}

// Trend pill for trending strains section
function TrendPill({ trend }: { trend: TrendEntry }) {
  return (
    <a
      href={`/strains/${encodeURIComponent(trend.strain_name)}`}
      className="flex-shrink-0 bg-surface-card border border-surface-border rounded-xl px-4 py-3 hover:border-brand/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-white text-sm">{trend.strain_name}</span>
        {trend.product_type && (
          <span className="text-xs text-zinc-500 capitalize">{trend.product_type}</span>
        )}
      </div>
      <div className="flex gap-3 text-xs text-zinc-500">
        {trend.avg_thc && <span className="text-brand font-medium">{trend.avg_thc}% THC</span>}
        {trend.avg_price_eighth && <span>${trend.avg_price_eighth} avg 1/8</span>}
        <span>{trend.dispensary_count} dispensaries</span>
      </div>
    </a>
  );
}

export function HomeFeed() {
  const deviceId = useDeviceId();
  const { lat, lng } = useLocation();
  const locParams: Record<string, string> = lat ? { lat: String(lat), lng: String(lng) } : {};

  const { data: deals } = useSWR(
    ["deals", lat, lng],
    () => api.deals({ ...locParams, sort: "pct_off", limit: "12" })
  );

  const { data: valuePicks } = useSWR(
    ["deals-value", lat, lng],
    () => api.deals({ ...locParams, sort: "price_per_gram", limit: "12" })
  );

  const { data: trends } = useSWR("trends", () => api.trends("flower"));

  const { data: brands } = useSWR("brands", () => api.brands());

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Ask Bud hero — quick intents + tap-to-open the search/ask sheet */}
      <AskBudHero />

      {/* Pro upgrade nudge — hidden for Pro users automatically */}
      <UpgradeBanner message="Unlock predictive pricing, voice chat, and a Bud that learns your taste." />


      <div className="space-y-8">
        {/* Hottest Deals — deepest % off */}
        {deals && deals.length > 0 && (
          <section>
            <SectionHeader icon={Tag} title="Hottest Deals" href="/feed?sort=pct_off" />
            <ProductRow products={deals.map((d) => d.product)} />
          </section>
        )}

        {/* Trending strains — horizontal pill row */}
        {trends && trends.length > 0 && (
          <section>
            <SectionHeader icon={TrendingUp} title="Trending in NJ" href="/feed?sort=trending" />
            <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x scrollbar-hide">
              {trends.slice(0, 12).map((t) => (
                <TrendPill key={t.strain_name} trend={t} />
              ))}
            </div>
          </section>
        )}

        {/* Best Value — lowest $/g */}
        {valuePicks && valuePicks.length > 0 && (
          <section>
            <SectionHeader icon={Flame} title="Best Value ($/g)" href="/feed?sort=price_per_gram" />
            <ProductRow products={valuePicks.map((d) => d.product)} />
          </section>
        )}

        {/* Brand-first drops — what people actually get hyped about */}
        {brands && brands.length > 0 && (
          <section>
            <SectionHeader icon={Package2} title="Brand Drops" href="/brands" />
            <BrandDropsRow brands={brands} />
          </section>
        )}
      </div>
    </div>
  );
}
