"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft, MapPin, Scale, Package, Calendar, Hash,
  ExternalLink, Sparkles, TrendingDown, Navigation, ShoppingBag, Trophy,
} from "lucide-react";
import { api } from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { directionsUrl } from "@/lib/handoff";
import { TerpeneDonut, TerpeneLegend } from "@/components/charts/TerpeneDonut";
import { ProductPlaceholder } from "@/components/ui/CannabisLeaf";
import { HandoffButton, DispensaryDirectionsButton } from "@/components/ui/HandoffButtons";
import { QuickActions, TasteWarning } from "@/components/product/QuickActions";
import { CannabinoidBars } from "@/components/charts/CannabinoidBars";
import { cn } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  sativa: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  indica: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  hybrid: "bg-teal-500/20 text-teal-400 border-teal-500/30",
};

const VALUE_COLOR = (ppg: number | null | undefined) => {
  if (!ppg) return "text-zinc-400";
  if (ppg < 8)  return "text-emerald-400";
  if (ppg < 12) return "text-teal-400";
  if (ppg < 16) return "text-yellow-400";
  return "text-zinc-400";
};

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { lat, lng } = useLocation();

  const { data: product } = useSWR(
    ["product", id, lat, lng],
    () => api.product(parseInt(id), lat ?? undefined, lng ?? undefined)
  );

  // Pull the cross-NJ comparison for the same strain — drives the "available cheaper at..." section
  const locParams: Record<string, string> = lat ? { lat: String(lat), lng: String(lng) } : {};
  const { data: comparisons } = useSWR(
    product?.strain_name ? ["strain-compare", product.strain_name, lat, lng] : null,
    () => api.strainCompare(product!.strain_name!, locParams)
  );

  if (!product) return <div className="p-8 text-zinc-500">Loading…</div>;

  // Find offerings at OTHER dispensaries (exclude the current one) — sorted by best $/g
  const otherDispensaries = (comparisons ?? [])
    .filter((c) => c.product_id !== product.id)
    .slice(0, 5);

  // Identify the cheapest tier across all dispensaries — used to highlight the savings opp
  const currentBestPpg = product.best_price_per_gram ?? 999;
  const cheapestElsewhere = otherDispensaries[0];
  const savingsPerG = cheapestElsewhere?.best_price_per_gram
    ? +(currentBestPpg - cheapestElsewhere.best_price_per_gram).toFixed(2)
    : 0;

  const hasTerpenes = product.terpenes && Object.keys(product.terpenes).length > 0;
  const sortedPricing = (product.pricing ?? []).slice().sort((a, b) => (a.grams ?? 0) - (b.grams ?? 0));

  return (
    <div className="min-h-screen bg-surface pb-32">
      {/* Hero — full image with back button overlay */}
      <div className="relative">
        <div className="relative w-full aspect-[4/3] bg-zinc-900 overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ProductPlaceholder
              productType={product.product_type}
              strainName={product.strain_name}
              className="w-full h-full"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-surface" />
        </div>

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Sale badge */}
        {product.is_on_sale && product.sale_pct_off && (
          <div className="absolute top-4 right-4 bg-orange-500 text-white text-sm font-black px-3 py-1.5 rounded-pill">
            {product.sale_pct_off.toFixed(0)}% OFF
          </div>
        )}
      </div>

      {/* Info section overlapping the hero */}
      <div className="px-4 -mt-16 relative z-10">
        <div className="bg-surface-card border border-surface-border rounded-3xl p-5">
          {/* Donut + name + type */}
          <div className="flex items-start gap-4 mb-3">
            <div className="flex-shrink-0">
              {hasTerpenes ? (
                <TerpeneDonut
                  terpenes={product.terpenes}
                  thcPct={product.thc_pct}
                  cbdPct={product.cbd_pct}
                  size={96}
                />
              ) : (
                <div className="w-[96px] h-[96px] rounded-full bg-surface-elevated flex items-center justify-center">
                  <div className="text-center">
                    <p className="font-display font-black text-2xl text-white">{product.thc_pct?.toFixed(0)}%</p>
                    <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">THC</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="font-display font-black text-xl text-white leading-tight">
                    {product.strain_name ?? product.name}
                  </h1>
                  {product.brand && (
                    <Link href={`/brands/${encodeURIComponent(product.brand)}`} className="text-sm text-zinc-400 hover:text-brand">
                      {product.brand}
                    </Link>
                  )}
                </div>
                {product.product_type && (
                  <span className={cn(
                    "text-[10px] font-black px-2.5 py-1 rounded-pill border uppercase tracking-wider flex-shrink-0",
                    TYPE_COLORS[product.product_type] ?? "bg-zinc-700/50 text-zinc-400 border-zinc-600"
                  )}>
                    {product.product_type}
                  </span>
                )}
              </div>

              {/* Potency strip */}
              <div className="flex gap-3 mt-2">
                {product.thc_pct && <Stat label="THC" value={`${product.thc_pct.toFixed(1)}%`} accent="text-brand" />}
                {product.cbd_pct && product.cbd_pct > 0.1 && <Stat label="CBD" value={`${product.cbd_pct.toFixed(1)}%`} accent="text-blue-400" />}
                {product.total_terpenes_pct && <Stat label="Terps" value={`${product.total_terpenes_pct.toFixed(2)}%`} accent="text-orange-400" />}
              </div>
            </div>
          </div>

          {/* Taste warning */}
          <TasteWarning product={product} />
        </div>
      </div>

      {/* Dispensary card */}
      <div className="px-4 mt-4">
        <Link href={`/dispensaries/${product.dispensary.slug}`}>
          <div className="bg-surface-card border border-surface-border rounded-2xl p-4 hover:border-brand/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center">
                <MapPin size={16} className="text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm truncate">{product.dispensary.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {product.dispensary.is_open_now != null && (
                    <span className={cn(
                      "text-[10px] font-bold",
                      product.dispensary.is_open_now ? "text-emerald-400" : "text-red-400"
                    )}>
                      {product.dispensary.is_open_now ? "OPEN" : "CLOSED"}
                    </span>
                  )}
                  <span className="text-xs text-zinc-500">{product.dispensary.city}, NJ</span>
                  {product.distance_miles != null && (
                    <span className="text-xs text-zinc-600">· {product.distance_miles.toFixed(1)} mi</span>
                  )}
                </div>
              </div>
              <ExternalLink size={14} className="text-zinc-600" />
            </div>
          </div>
        </Link>
      </div>

      {/* Pricing tiers — interactive selectable list */}
      <div className="px-4 mt-4">
        <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Pricing</p>
        <div className="bg-surface-card border border-surface-border rounded-2xl divide-y divide-surface-border overflow-hidden">
          {sortedPricing.map((p) => (
            <div key={p.weight} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">{p.weight}</p>
                {p.price_per_gram && (
                  <p className={cn("text-[11px] flex items-center gap-1", VALUE_COLOR(p.price_per_gram))}>
                    <Scale size={9} /> ${p.price_per_gram}/g
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-white">${p.price}</p>
                {p.original_price && (
                  <p className="text-[11px] text-zinc-500 line-through">was ${p.original_price}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reserve + Directions — primary CTA row */}
      <div className="px-4 mt-4">
        <div className="flex gap-2">
          <HandoffButton product={product} variant="primary" className="flex-1 py-3.5" />
          <DispensaryDirectionsButton dispensary={product.dispensary} variant="ghost" className="py-3.5" />
        </div>
      </div>

      {/* Quick actions row — taste judgments + add to list + review */}
      <div className="px-4 mt-3 relative">
        <QuickActions product={product} />
      </div>

      {/* Cannabinoids breakdown */}
      {product.cannabinoids && Object.keys(product.cannabinoids).length > 0 && (
        <div className="px-4 mt-6">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Cannabinoids</p>
          <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
            <CannabinoidBars cannabinoids={product.cannabinoids} />
          </div>
        </div>
      )}

      {/* Terpenes legend */}
      {hasTerpenes && (
        <div className="px-4 mt-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Terpenes</p>
          <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
            <TerpeneLegend terpenes={product.terpenes!} />
          </div>
        </div>
      )}

      {/* Same strain at other NJ dispensaries — the "should I drive farther" question */}
      {otherDispensaries.length > 0 && (
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
              Also at {otherDispensaries.length} other NJ dispensar{otherDispensaries.length === 1 ? "y" : "ies"}
            </p>
            {product.strain_name && (
              <Link
                href={`/strains/${encodeURIComponent(product.strain_name)}`}
                className="text-[11px] font-semibold text-brand flex items-center gap-0.5"
              >
                See all <ExternalLink size={9} />
              </Link>
            )}
          </div>

          {/* Savings callout if there's a meaningfully cheaper option */}
          {savingsPerG > 0.5 && cheapestElsewhere && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2.5 mb-2 flex items-center gap-2">
              <Trophy size={14} className="text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-300 leading-tight">
                <span className="font-bold">${savingsPerG.toFixed(2)}/g cheaper</span> at <span className="font-bold">{cheapestElsewhere.dispensary_name}</span>
                {cheapestElsewhere.distance_miles != null && (
                  <span className="text-emerald-400/70"> · {cheapestElsewhere.distance_miles.toFixed(1)} mi</span>
                )}
              </p>
            </div>
          )}

          {/* Per-dispensary comparison rows */}
          <div className="bg-surface-card border border-surface-border rounded-2xl divide-y divide-surface-border overflow-hidden">
            {otherDispensaries.map((c, i) => {
              const reserveUrl = c.dispensary_source === "iheartjane"
                ? `https://www.iheartjane.com/stores/${c.dispensary_source_id}/products/${c.product_source_id}`
                : `https://dutchie.com/dispensary/${c.dispensary_slug.replace(/^dutchie-/, "")}?search=${encodeURIComponent(product.strain_name ?? product.name)}`;
              const ppg = c.best_price_per_gram;
              const isCheaper = ppg != null && ppg < currentBestPpg;

              return (
                <div key={c.product_id} className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    {/* Rank badge */}
                    <span className={cn(
                      "text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                      i === 0 && isCheaper ? "bg-emerald-500/20 text-emerald-400" : "bg-surface-elevated text-zinc-500"
                    )}>
                      {i + 1}
                    </span>

                    <Link href={`/products/${c.product_id}`} className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{c.dispensary_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <MapPin size={9} className="text-zinc-600" />
                        <span className="text-[11px] text-zinc-500 truncate">
                          {c.dispensary_city}{c.distance_miles != null && ` · ${c.distance_miles.toFixed(1)} mi`}
                        </span>
                      </div>
                    </Link>

                    <div className="text-right flex-shrink-0">
                      {ppg != null ? (
                        <p className={cn(
                          "text-sm font-black",
                          isCheaper ? "text-emerald-400" : "text-zinc-300"
                        )}>
                          ${ppg.toFixed(2)}<span className="text-[10px] font-normal text-zinc-500">/g</span>
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-600">—</p>
                      )}
                      {c.is_on_sale && (
                        <p className="text-[10px] font-bold text-orange-400">−{c.sale_pct_off?.toFixed(0)}%</p>
                      )}
                    </div>
                  </div>

                  {/* Mini action row — Reserve + Directions, icon-only */}
                  <div className="flex gap-1.5 mt-2 pl-8">
                    <a
                      href={reserveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 rounded-lg bg-brand/15 text-brand border border-brand/30 hover:bg-brand/25 transition-colors"
                    >
                      <ShoppingBag size={10} /> Reserve
                    </a>
                    {c.dispensary_lat != null && c.dispensary_lng != null && (
                      <a
                        href={directionsUrl(c.dispensary_lat, c.dispensary_lng, c.dispensary_name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 text-[11px] font-semibold px-2 py-1.5 rounded-lg bg-surface-elevated text-zinc-300 border border-surface-border hover:text-brand transition-colors"
                      >
                        <Navigation size={10} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deep dive into strain — terpenes, lab history, price chart */}
      {product.strain_name && (
        <div className="px-4 mt-4">
          <Link
            href={`/strains/${encodeURIComponent(product.strain_name)}`}
            className="block bg-surface-card border border-surface-border rounded-2xl p-4 hover:border-brand/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sparkles size={16} className="text-brand" />
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Strain deep-dive</p>
                <p className="text-xs text-zinc-500">Lab data, price chart, terpene profile, batch archive</p>
              </div>
              <ExternalLink size={14} className="text-zinc-600" />
            </div>
          </Link>
        </div>
      )}

      {/* Lab metadata footer */}
      <div className="px-4 mt-4 flex items-center justify-between text-[11px] text-zinc-600">
        {product.batch_id && (
          <span className="flex items-center gap-1"><Hash size={10} /> {product.batch_id}</span>
        )}
        {product.harvest_date && (
          <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(product.harvest_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        )}
        {product.dispensary.nj_license_number && (
          <span className="font-mono">RE{product.dispensary.nj_license_number}</span>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{label}</p>
      <p className={cn("text-sm font-black", accent)}>{value}</p>
    </div>
  );
}
