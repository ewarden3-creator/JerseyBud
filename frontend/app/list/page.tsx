"use client";

import useSWR from "swr";
import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBasket, X, MapPin, AlertTriangle, TrendingDown, TrendingUp,
  Minus, Trophy, Clock, ShoppingBag, Navigation, Award, Plus,
} from "lucide-react";
import { api } from "@/lib/api";
import { useDeviceId } from "@/hooks/useDeviceId";
import { directionsUrl, productHandoffUrl } from "@/lib/handoff";
import { computeOTDC, airlineStylePrediction } from "@/lib/otdc";
import { ProductPlaceholder } from "@/components/ui/CannabisLeaf";
import { ProBadge } from "@/components/pro/ProGate";
import { AddItemSheet } from "@/components/list/AddItemSheet";
import { useAuth, isPro } from "@/lib/auth";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  low:    { icon: TrendingDown, color: "text-emerald-400", bg: "bg-emerald-500/10",  border: "border-emerald-500/30" },
  wait:   { icon: TrendingUp,   color: "text-orange-400",  bg: "bg-orange-500/10",   border: "border-orange-500/30" },
  stable: { icon: Minus,        color: "text-zinc-400",    bg: "bg-zinc-500/10",     border: "border-zinc-500/30" },
} as const;

const RANK_BADGES = ["🥇", "🥈", "🥉"];

export default function ShoppingListPage() {
  const deviceId = useDeviceId();
  const auth = useAuth();
  const userIsPro = isPro(auth);
  const [addOpen, setAddOpen] = useState(false);

  const { data: list, mutate } = useSWR(
    deviceId ? ["list", deviceId] : null,
    () => api.shoppingList(deviceId)
  );

  // Pull all NJ products to compute OTDC across shops
  const { data: allProducts } = useSWR("all-products-for-otdc", () =>
    api.products({ limit: "200" })
  );

  const otdcRanking = useMemo(() => {
    if (!list?.items || !allProducts) return [];
    return computeOTDC(list.items, allProducts, 3);
  }, [list?.items, allProducts]);

  async function remove(id: number) {
    await api.removeFromList(id, deviceId);
    mutate();
  }

  if (!deviceId) return null;
  if (!list) return <div className="p-8 text-zinc-500">Loading…</div>;

  const itemCount = list.item_count;

  return (
    <div className="min-h-screen bg-surface pb-32">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display font-black text-2xl text-white">Your List</h1>
          <span className="text-xs text-zinc-500">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-sm text-zinc-400 leading-snug">
          Add what you're looking to pick up. We'll tell you which nearby shop has the best <span className="text-white font-semibold">out-the-door price</span> for the whole list.
        </p>
      </div>

      {/* OTDC: top 3 cheapest pickups across NJ */}
      {otdcRanking.length > 0 && (
        <div className="px-5 mb-5">
          <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-bold mb-2">
            Cheapest pickups
          </p>
          <div className="space-y-2">
            {otdcRanking.map((shop, i) => {
              const isWinner = i === 0;
              const fullFulfilled = shop.items_available === shop.items_total;
              return (
                <Link
                  key={shop.dispensary_slug}
                  href={`/dispensaries/${shop.dispensary_slug}`}
                  className={cn(
                    "block rounded-2xl p-4 border transition-colors",
                    isWinner
                      ? "bg-gradient-to-br from-emerald-500/15 via-surface-card to-surface-card border-emerald-500/40 hover:border-emerald-500/70"
                      : "bg-surface-card border-surface-border hover:border-brand/40"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{RANK_BADGES[i]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-white text-sm truncate">{shop.dispensary_name}</p>
                        {shop.is_open_now != null && (
                          <span className={cn(
                            "text-[9px] font-bold uppercase flex-shrink-0",
                            shop.is_open_now ? "text-emerald-400" : "text-red-400"
                          )}>
                            {shop.is_open_now ? "OPEN" : "CLOSED"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 mb-2">
                        <MapPin size={10} className="text-zinc-600" />
                        <span>{shop.dispensary_city}</span>
                        {shop.distance_miles != null && (
                          <span className="text-zinc-600">· {shop.distance_miles.toFixed(1)} mi</span>
                        )}
                        <span className={cn(
                          "ml-auto font-semibold",
                          fullFulfilled ? "text-emerald-400" : "text-orange-400"
                        )}>
                          {shop.items_available}/{shop.items_total} items
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* OTD breakdown */}
                  <div className="mt-3 pt-3 border-t border-surface-border flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-0.5">
                        Out the door
                      </p>
                      <p className="text-2xl font-black text-white leading-none">
                        ${shop.otd_total.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-1">
                        ${shop.subtotal.toFixed(2)} + ${shop.tax.toFixed(2)} tax
                      </p>
                    </div>
                    {isWinner && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-pill bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        <Trophy size={10} /> Best deal
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Item list — airline-style price predictions per item */}
      <div className="px-5 space-y-3">
        {list.items.length > 0 && (
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-bold">
              Tracking these
            </p>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-dark transition-colors"
            >
              <Plus size={12} strokeWidth={2.5} /> Add more
            </button>
          </div>
        )}
        <AnimatePresence>
          {list.items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden"
            >
              <ItemRow item={item} onRemove={remove} userIsPro={userIsPro} />
            </motion.div>
          ))}
        </AnimatePresence>

        {list.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBasket size={36} className="text-zinc-700 mb-3" />
            <p className="text-white font-semibold mb-1">Your list is empty</p>
            <p className="text-zinc-500 text-sm max-w-xs mb-5">
              Add the products you want to pick up. We'll find the shop with the lowest out-the-door price.
            </p>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 bg-brand text-black font-bold px-5 py-3 rounded-2xl hover:bg-brand-dark transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} /> Add your first item
            </button>
          </div>
        )}
      </div>

      {/* Floating + button when list has items, for quick add anytime */}
      {list.items.length > 0 && (
        <button
          onClick={() => setAddOpen(true)}
          className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-brand text-black shadow-xl flex items-center justify-center hover:bg-brand-dark transition-all hover:scale-105 active:scale-95"
          aria-label="Add items"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      <AddItemSheet open={addOpen} onClose={() => setAddOpen(false)} onAdded={mutate} />
    </div>
  );
}

function ItemRow({ item, onRemove, userIsPro }: { item: ShoppingItem; onRemove: (id: number) => void; userIsPro: boolean }) {
  const prediction = airlineStylePrediction(item.prediction);
  const tone = prediction ? TONE_STYLES[prediction.tone] : null;
  const ToneIcon = tone?.icon;

  return (
    <div>
      {/* Taste warning */}
      {item.taste_warning && (
        <div className="bg-red-500/15 border-b border-red-500/30 px-4 py-2 flex items-center gap-2">
          <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-300">{item.taste_warning}</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Thumbnail */}
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
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
                  −{item.product.sale_pct_off?.toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{item.product.brand}</p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-base font-bold text-white">${item.line_total?.toFixed(2)}</p>
            <p className="text-[10px] text-zinc-500">{item.weight}</p>
          </div>

          <button
            onClick={() => onRemove(item.id)}
            className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0 p-1"
            aria-label="Remove"
          >
            <X size={14} />
          </button>
        </div>

        {/* Airline-style prediction strip — Pro only */}
        {prediction && tone && ToneIcon && (
          userIsPro ? (
            <div className={cn("mt-3 rounded-xl px-3 py-2.5 flex items-start gap-2 border", tone.bg, tone.border)}>
              <ToneIcon size={13} className={cn("mt-0.5 flex-shrink-0", tone.color)} />
              <div className="flex-1">
                <p className={cn("text-xs font-bold", tone.color)}>{prediction.label}</p>
                <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">{prediction.detail}</p>
              </div>
            </div>
          ) : (
            <Link href="/upgrade" className="mt-3 rounded-xl px-3 py-2.5 flex items-center gap-2 bg-brand/10 border border-brand/30 hover:border-brand/50 transition-colors">
              <Clock size={13} className="text-brand flex-shrink-0" />
              <span className="text-[11px] text-zinc-400 flex-1">
                Want to know if this price is likely to drop?
              </span>
              <ProBadge />
            </Link>
          )
        )}
      </div>
    </div>
  );
}
