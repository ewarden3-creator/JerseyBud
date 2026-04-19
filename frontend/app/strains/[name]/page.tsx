"use client";

import { useState } from "react";
import { use } from "react";
import { ArrowLeft, MapPin, Scale, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { TerpeneDonut, TerpeneLegend } from "@/components/charts/TerpeneDonut";
import { EffectsRadar } from "@/components/charts/EffectsRadar";
import { PriceHistoryChart } from "@/components/charts/PriceHistoryChart";
import { CannabinoidBars } from "@/components/charts/CannabinoidBars";
import { directionsUrl, productHandoffUrl, handoffLabel } from "@/lib/handoff";
import { Navigation, ShoppingBag, Lock } from "lucide-react";
import Link from "next/link";
import { useAuth, isPro } from "@/lib/auth";
import { cn } from "@/lib/utils";

const WEIGHT_OPTIONS = ["1g", "3.5g", "7g", "14g", "28g"];

export default function StrainPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const strainName = decodeURIComponent(name);
  const router = useRouter();
  const { lat, lng } = useLocation();
  const [selectedWeight, setSelectedWeight] = useState("3.5g");
  const [activeTab, setActiveTab] = useState<"compare" | "lab" | "history">("compare");

  const locParams: Record<string, string> = lat ? { lat: String(lat), lng: String(lng) } : {};

  const { data: comparisons } = useSWR(
    ["strain-compare", strainName, lat, lng],
    () => api.strainCompare(strainName, { ...locParams, weight: selectedWeight })
  );
  const { data: medians } = useSWR(
    ["strain-median", strainName],
    () => api.strainMedianPrice(strainName)
  );

  // Use first comparison result for lab data display
  const sample = comparisons?.[0];
  const { data: history } = useSWR(
    sample ? ["price-history", sample.product_id] : null,
    () => api.priceHistory(sample!.product_id)
  );
  const { data: labHistory } = useSWR(
    sample ? ["lab-history", sample.product_id] : null,
    () => api.labHistory(sample!.product_id)
  );

  // Aggregate terpenes across all matching products (use first that has data)
  const latestLab = labHistory?.[0];
  const medianForWeight = medians?.find((m) => m.weight === selectedWeight);

  const TABS = [
    { key: "compare", label: "Compare" },
    { key: "lab",     label: "Lab Data" },
    { key: "history", label: "Price Chart" },
  ] as const;

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <button onClick={() => router.back()} className="text-zinc-500 hover:text-white mb-4 flex items-center gap-1 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="font-display font-bold text-3xl text-white leading-tight">{strainName}</h1>
        {latestLab && (
          <div className="flex gap-3 mt-2">
            {latestLab.thc_pct && (
              <span className="text-sm font-semibold">
                THC <span className="text-brand">{latestLab.thc_pct.toFixed(1)}%</span>
              </span>
            )}
            {latestLab.total_terpenes_pct && (
              <span className="text-sm font-semibold">
                Terps <span className="text-orange-400">{latestLab.total_terpenes_pct.toFixed(2)}%</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Big donut + matching color-coded terpene pills.
          Side-by-side so the visual language teaches itself. */}
      {latestLab && (
        <div className="mx-4 mb-4 bg-surface-card border border-surface-border rounded-2xl p-5">
          <div className="flex gap-5 items-center">
            <TerpeneDonut
              terpenes={latestLab.terpenes}
              thcPct={latestLab.thc_pct}
              cbdPct={latestLab.cbd_pct}
              size={120}
            />
            <div className="flex-1 min-w-0">
              {latestLab.terpenes && Object.keys(latestLab.terpenes).length > 0 && (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Top terpenes</p>
                  <TerpeneLegend terpenes={latestLab.terpenes} />
                </>
              )}
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-surface-border">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Common effects</p>
            <EffectsRadar effects={["relaxed", "happy", "euphoric"]} size={160} />
          </div>
        </div>
      )}

      {/* Statewide median price indicator */}
      {medianForWeight && (
        <div className="mx-4 mb-4 bg-surface-card border border-surface-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Scale size={14} className="text-brand" />
            <span className="text-sm font-semibold text-white">NJ Price Range — {selectedWeight}</span>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-bold text-white">${medianForWeight.median_price}</span>
            <span className="text-sm text-zinc-500 mb-0.5">median</span>
          </div>
          {/* Range bar */}
          <div className="relative h-2 bg-surface-elevated rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-gradient-to-r from-emerald-500 to-brand rounded-full"
              style={{
                left: "0%",
                width: `${((medianForWeight.median_price - medianForWeight.min_price) / (medianForWeight.max_price - medianForWeight.min_price)) * 100}%`,
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-brand shadow"
              style={{
                left: `calc(${((medianForWeight.median_price - medianForWeight.min_price) / (medianForWeight.max_price - medianForWeight.min_price)) * 100}% - 6px)`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-zinc-600">
            <span>Low ${medianForWeight.min_price}</span>
            <span>{medianForWeight.sample_count} dispensaries</span>
            <span>High ${medianForWeight.max_price}</span>
          </div>
        </div>
      )}

      {/* Weight selector */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-hide">
        {WEIGHT_OPTIONS.map((w) => (
          <button
            key={w}
            onClick={() => setSelectedWeight(w)}
            className={cn(
              "flex-shrink-0 text-sm px-4 py-2 rounded-pill border transition-colors font-medium",
              selectedWeight === w
                ? "border-brand bg-brand/20 text-brand"
                : "border-surface-border text-zinc-500 hover:border-zinc-400"
            )}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-4 mb-4 border-b border-surface-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex-1 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px",
              activeTab === t.key
                ? "border-brand text-brand"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4">
        {/* Compare tab — same strain at every dispensary */}
        {activeTab === "compare" && (
          <div className="space-y-2">
            {!comparisons && <p className="text-zinc-500 text-sm py-4">Loading…</p>}
            {comparisons?.map((c, i) => {
              const entry = c.pricing.find((p) => p.weight === selectedWeight);

              // Build hand-off URL inline — we have the bare bones from PriceCompareEntry
              const reserveHref = c.dispensary_source === "iheartjane"
                ? `https://www.iheartjane.com/stores/${c.dispensary_source_id}/products/${c.product_source_id}`
                : `https://dutchie.com/dispensary/${c.dispensary_slug.replace(/^dutchie-/, "")}?search=${encodeURIComponent(strainName)}`;

              const directionsHref = c.dispensary_lat != null && c.dispensary_lng != null
                ? directionsUrl(c.dispensary_lat, c.dispensary_lng, c.dispensary_name)
                : null;

              return (
                <div
                  key={c.product_id}
                  className="bg-surface-card border border-surface-border rounded-2xl px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                      i === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-surface-elevated text-zinc-500"
                    )}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{c.dispensary_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <MapPin size={10} className="text-zinc-600" />
                        <span className="text-xs text-zinc-500">{c.dispensary_city}</span>
                        {c.distance_miles && (
                          <span className="text-xs text-zinc-600">· {c.distance_miles.toFixed(1)} mi</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {entry ? (
                        <>
                          <p className="text-white font-bold">${entry.price}</p>
                          {entry.price_per_gram && (
                            <p className="text-xs text-emerald-400">${entry.price_per_gram}/g</p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-zinc-600">No {selectedWeight}</p>
                      )}
                      {c.is_on_sale && (
                        <p className="text-xs text-orange-400 font-semibold">{c.sale_pct_off?.toFixed(0)}% off</p>
                      )}
                    </div>
                  </div>

                  {/* Hand-off + Directions row */}
                  <div className="flex gap-2 mt-3">
                    <a
                      href={reserveHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-brand text-black hover:bg-brand-dark transition-colors"
                    >
                      <ShoppingBag size={11} />
                      {c.dispensary_source === "iheartjane" ? "Reserve" : "Find on Menu"}
                    </a>
                    {directionsHref && (
                      <a
                        href={directionsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-surface-elevated text-zinc-300 hover:text-brand hover:bg-brand/10 border border-surface-border transition-colors"
                      >
                        <Navigation size={11} />
                        Directions
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lab Data tab — free users see latest batch only; older batches gated */}
        {activeTab === "lab" && <LabDataTab labHistory={labHistory} />}

        {/* Price History tab — Pro only */}
        {activeTab === "history" && <PriceHistoryTab history={history} weight={selectedWeight} />}
      </div>
    </div>
  );
}

function PriceHistoryTab({ history, weight }: { history: PriceHistoryPoint[] | undefined; weight: string }) {
  const auth = useAuth();
  const userIsPro = isPro(auth);

  if (!userIsPro) {
    return (
      <Link
        href="/upgrade"
        className="block bg-gradient-to-br from-brand/15 via-surface-card to-surface-card border border-brand/40 rounded-2xl p-6 text-center hover:border-brand/70 transition-colors"
      >
        <Lock size={20} className="text-brand mx-auto mb-2" />
        <p className="text-sm font-bold text-white mb-1">Price history is a Pro feature</p>
        <p className="text-xs text-zinc-400 mb-3">
          See the full 90-day price chart, sale dots, and the median benchmark line.
        </p>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand">
          Unlock price chart →
        </span>
      </Link>
    );
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
      <p className="text-sm font-semibold text-white mb-3">Price over time — {weight}</p>
      {history ? (
        <PriceHistoryChart history={history} weight={weight} />
      ) : (
        <p className="text-zinc-500 text-sm py-8 text-center">Loading history…</p>
      )}
    </div>
  );
}

function LabDataTab({ labHistory }: { labHistory: LabHistoryEntry[] | undefined }) {
  const auth = useAuth();
  const userIsPro = isPro(auth);

  if (!labHistory || labHistory.length === 0) {
    return <p className="text-zinc-500 text-sm py-8 text-center">No batch lab data yet for this strain.</p>;
  }

  // Free: only the most-recent batch. Pro: full archive.
  const visible = userIsPro ? labHistory : labHistory.slice(0, 1);
  const hiddenCount = labHistory.length - visible.length;

  return (
    <div className="space-y-4">
      {visible.map((entry) => (
        <div key={entry.batch_id} className="bg-surface-card border border-surface-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-zinc-500">Batch {entry.batch_id}</span>
            {entry.harvest_date && (
              <span className="text-xs text-zinc-600">
                {new Date(entry.harvest_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </div>
          <div className="flex gap-4 mb-3">
            {entry.thc_pct && <div><p className="text-xs text-zinc-500">THC</p><p className="font-bold text-brand">{entry.thc_pct.toFixed(1)}%</p></div>}
            {entry.cbd_pct && <div><p className="text-xs text-zinc-500">CBD</p><p className="font-bold text-blue-400">{entry.cbd_pct.toFixed(1)}%</p></div>}
            {entry.total_terpenes_pct && <div><p className="text-xs text-zinc-500">Terps</p><p className="font-bold text-orange-400">{entry.total_terpenes_pct.toFixed(2)}%</p></div>}
          </div>
          {entry.cannabinoids && Object.keys(entry.cannabinoids).length > 0 && (
            <CannabinoidBars cannabinoids={entry.cannabinoids} />
          )}
          {entry.terpenes && <TerpeneLegend terpenes={entry.terpenes} />}
        </div>
      ))}

      {hiddenCount > 0 && (
        <Link
          href="/upgrade"
          className="block bg-gradient-to-br from-brand/15 via-surface-card to-surface-card border border-brand/40 rounded-2xl p-5 text-center hover:border-brand/70 transition-colors"
        >
          <Lock size={18} className="text-brand mx-auto mb-2" />
          <p className="text-sm font-bold text-white mb-1">
            {hiddenCount} previous batch{hiddenCount > 1 ? "es" : ""} archived
          </p>
          <p className="text-xs text-zinc-400 mb-3">
            Compare lab data across every batch this strain has shipped — only on Pro.
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand">
            Unlock batch archive →
          </span>
        </Link>
      )}
    </div>
  );
}
