"use client";

import useSWR from "swr";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBasket, X, MapPin, AlertTriangle, Zap, Clock,
  TrendingDown, ShoppingBag, Navigation, Plus, Minus, Store,
} from "lucide-react";
import { api } from "@/lib/api";
import { useDeviceId } from "@/hooks/useDeviceId";
import Link from "next/link";
import { directionsUrl, productHandoffUrl } from "@/lib/handoff";
import { ProductPlaceholder } from "@/components/ui/CannabisLeaf";
import { ProBadge } from "@/components/pro/ProGate";
import { useAuth, isPro } from "@/lib/auth";
import { cn } from "@/lib/utils";

const REC_META = {
  buy_now: { label: "Buy Now", icon: Zap,           color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  wait:    { label: "Wait",    icon: Clock,         color: "text-brand",   bg: "bg-brand/10",   border: "border-brand/30" },
  neutral: { label: "Steady",  icon: TrendingDown,  color: "text-zinc-400",    bg: "bg-zinc-500/10",    border: "border-zinc-500/30" },
} as const;

const OVERALL_META = {
  strike_now: {
    label: "Strike Now",
    headline: "All signals point to buy",
    icon: Zap,
    glow: "from-emerald-500/40 via-emerald-500/10 to-transparent",
    pill: "bg-emerald-500 text-black",
    accent: "text-emerald-400",
  },
  wait: {
    label: "Hold a Few Days",
    headline: "A drop is likely soon",
    icon: Clock,
    glow: "from-brand/40 via-brand/10 to-transparent",
    pill: "bg-brand text-black",
    accent: "text-brand",
  },
  neutral: {
    label: "Mixed Signals",
    headline: "Some buy, some wait",
    icon: TrendingDown,
    glow: "from-zinc-700/30 via-transparent to-transparent",
    pill: "bg-zinc-600 text-white",
    accent: "text-zinc-300",
  },
  mixed: {
    label: "Mixed Signals",
    headline: "Some buy, some wait",
    icon: TrendingDown,
    glow: "from-zinc-700/30 via-transparent to-transparent",
    pill: "bg-zinc-600 text-white",
    accent: "text-zinc-300",
  },
} as const;

export default function ShoppingListPage() {
  const deviceId = useDeviceId();
  const auth = useAuth();
  const userIsPro = isPro(auth);
  const { data: list, mutate } = useSWR(
    deviceId ? ["list", deviceId] : null,
    () => api.shoppingList(deviceId)
  );
  const [view, setView] = useState<"all" | "by_shop">("by_shop");

  async function remove(id: number) {
    await api.removeFromList(id, deviceId);
    mutate();
  }

  // Group items by dispensary
  const byShop = useMemo(() => {
    if (!list) return new Map<string, ShoppingItem[]>();
    const m = new Map<string, ShoppingItem[]>();
    for (const i of list.items) {
      const key = i.product.dispensary.name;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(i);
    }
    return m;
  }, [list]);

  if (!deviceId) return null;
  if (!list) return <div className="p-8 text-zinc-500">Loading…</div>;

  const overall = OVERALL_META[list.overall_recommendation];
  const OverallIcon = overall.icon;
  const buyNowCount = list.items.filter((i) => i.prediction?.recommendation === "buy_now").length;
  const waitCount = list.items.filter((i) => i.prediction?.recommendation === "wait").length;

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Hero: total + recommendation glow.
          Free users see a locked-state banner instead of the strike-now intelligence. */}
      {list.items.length > 0 && (
        <div className="relative overflow-hidden">
          <div className={cn("absolute inset-0 bg-gradient-to-b pointer-events-none", overall.glow)} />
          <div className="relative px-4 pt-6 pb-6">
            <div className="flex items-center justify-between mb-1">
              <h1 className="font-display font-bold text-2xl text-white">Your List</h1>
              <span className="text-xs text-zinc-500">{list.item_count} item{list.item_count > 1 ? "s" : ""}</span>
            </div>

            <div className="flex items-end gap-3 mt-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Total</p>
                <p className="text-5xl font-black text-white leading-none mt-1">
                  ${list.subtotal.toFixed(0)}<span className="text-2xl text-zinc-500">.{(list.subtotal % 1).toFixed(2).slice(2)}</span>
                </p>
              </div>
              {list.savings_total > 0 && (
                <div className="ml-auto text-right">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Saved since added</p>
                  <p className="text-2xl font-black text-emerald-400">${list.savings_total.toFixed(2)}</p>
                </div>
              )}
            </div>

            {/* Strike-now banner — Pro feature. Free users see a teaser. */}
            {userIsPro ? (
              <div className="mt-5 rounded-2xl bg-surface-card/80 backdrop-blur border border-surface-border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-black px-2.5 py-1 rounded-pill", overall.pill)}>
                    <OverallIcon size={11} /> {overall.label}
                  </span>
                  <span className="text-xs text-zinc-500 ml-auto">
                    {buyNowCount}/{list.items.length} ready
                  </span>
                </div>
                <p className="text-sm font-semibold text-white mb-1">{overall.headline}</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{list.overall_reasoning}</p>

                {list.cheapest_pickup_dispensary && (
                  <div className="mt-3 pt-3 border-t border-surface-border flex items-center gap-2">
                    <Store size={12} className="text-brand" />
                    <span className="text-xs text-zinc-400">Cheapest single pickup:</span>
                    <span className="text-xs font-bold text-white ml-auto">{list.cheapest_pickup_dispensary}</span>
                    <span className="text-sm font-bold text-brand">${list.cheapest_pickup_subtotal}</span>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/upgrade" className="block mt-5 rounded-2xl bg-gradient-to-br from-brand/15 via-surface-card to-surface-card border border-brand/40 p-4 hover:border-brand/70 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <ProBadge />
                  <span className="text-xs text-zinc-400 ml-auto">{list.items.length} items tracked</span>
                </div>
                <p className="text-sm font-semibold text-white mb-1">Should you buy now or wait?</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Pro analyzes price history per item and tells you when to strike — like flight tracking, for weed.
                </p>
                <p className="text-xs font-bold text-brand mt-2 flex items-center gap-1">
                  Unlock predictive pricing →
                </p>
              </Link>
            )}

            {/* View toggle */}
            <div className="mt-4 flex bg-surface-elevated rounded-pill p-1 w-fit">
              <button
                onClick={() => setView("by_shop")}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-pill transition-colors",
                  view === "by_shop" ? "bg-brand text-black" : "text-zinc-400"
                )}
              >
                By Shop
              </button>
              <button
                onClick={() => setView("all")}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-pill transition-colors",
                  view === "all" ? "bg-brand text-black" : "text-zinc-400"
                )}
              >
                All Items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="px-4 space-y-3">
        <AnimatePresence>
          {view === "by_shop" ? (
            Array.from(byShop.entries()).map(([shopName, items]) => {
              const shopTotal = items.reduce((s, i) => s + (i.line_total ?? 0), 0);
              const dispo = items[0].product.dispensary;
              const shopBuyNow = items.filter((i) => i.prediction?.recommendation === "buy_now").length;
              return (
                <motion.div
                  key={shopName}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden"
                >
                  <div className="px-4 py-3 bg-surface-elevated border-b border-surface-border flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-card flex items-center justify-center flex-shrink-0">
                      <Store size={16} className="text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm truncate">{shopName}</p>
                      <p className="text-[10px] text-zinc-500">
                        {items.length} item{items.length > 1 ? "s" : ""}
                        {dispo.distance_miles != null && ` · ${dispo.distance_miles.toFixed(1)} mi`}
                        {shopBuyNow > 0 && (
                          <span className="text-emerald-400 font-semibold"> · {shopBuyNow} ready</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-white">${shopTotal.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-surface-border">
                    {items.map((item) => <ItemRow key={item.id} item={item} onRemove={remove} />)}
                  </div>
                  {/* Per-shop strike CTA */}
                  <div className="px-4 py-3 bg-surface-elevated/50 border-t border-surface-border flex gap-2">
                    {dispo.lat != null && dispo.lng != null && (
                      <a
                        href={directionsUrl(dispo.lat, dispo.lng, dispo.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-zinc-300 hover:text-brand transition-colors"
                      >
                        <Navigation size={11} /> Directions
                      </a>
                    )}
                    {dispo.website && (
                      <a
                        href={dispo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg bg-brand text-black hover:bg-brand-dark transition-colors"
                      >
                        <ShoppingBag size={11} /> Reserve all at {shopName.split(" ")[0]}
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            list.items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden"
              >
                <ItemRow item={item} onRemove={remove} expanded />
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {list.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBasket size={36} className="text-zinc-700 mb-3" />
            <p className="text-white font-semibold mb-1">Your list is empty</p>
            <p className="text-zinc-500 text-sm max-w-xs">
              Tap "Add to list" on any product. We'll track prices and tell you when to strike.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemRow({ item, onRemove, expanded }: { item: ShoppingItem; onRemove: (id: number) => void; expanded?: boolean }) {
  const auth = useAuth();
  const userIsPro = isPro(auth);
  const meta = REC_META[item.prediction?.recommendation ?? "neutral"];
  const Icon = meta.icon;
  const handoffUrl = productHandoffUrl(item.product);
  const dispo = item.product.dispensary;

  return (
    <div className={cn(expanded && "p-4")}>
      {/* Taste warning */}
      {item.taste_warning && (
        <div className="bg-red-500/15 border-b border-red-500/30 px-4 py-2 flex items-center gap-2 -mx-4 -mt-4 mb-3">
          <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-300">{item.taste_warning}</span>
        </div>
      )}

      <div className={cn("flex items-center gap-3", !expanded && "p-4")}>
        {/* Product thumbnail */}
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
          <ProductPlaceholder
            productType={item.product.product_type}
            strainName={item.product.strain_name}
            className="w-full h-full"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-white text-sm leading-tight flex-1 truncate">
              {item.product.strain_name ?? item.product.name}
            </h3>
            {item.product.is_on_sale && (
              <span className="text-[10px] font-bold text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-pill flex-shrink-0">
                -{item.product.sale_pct_off?.toFixed(0)}%
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{item.product.brand}</p>

          {/* Prediction badge inline — Pro only */}
          {item.prediction && userIsPro && (
            <div className={cn("inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-pill border", meta.bg, meta.border)}>
              <Icon size={10} className={meta.color} />
              <span className={cn("text-[10px] uppercase font-bold tracking-wide", meta.color)}>
                {meta.label}
              </span>
            </div>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-white">${item.line_total?.toFixed(2)}</p>
          <p className="text-[10px] text-zinc-500">{item.weight}</p>
          {item.savings_since_add && item.savings_since_add > 0 && (
            <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
              −${item.savings_since_add.toFixed(2)}
            </p>
          )}
        </div>

        <button
          onClick={() => onRemove(item.id)}
          className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0 p-1"
          aria-label="Remove"
        >
          <X size={14} />
        </button>
      </div>

      {/* Reasoning — Pro only */}
      {expanded && userIsPro && item.prediction?.reasoning && (
        <p className="text-xs text-zinc-400 leading-relaxed mt-2 pl-[68px]">
          {item.prediction.reasoning}
        </p>
      )}
    </div>
  );
}
