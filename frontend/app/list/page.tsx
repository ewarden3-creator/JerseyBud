"use client";

import useSWR from "swr";
import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBasket, X, MapPin, AlertTriangle, TrendingDown, TrendingUp,
  Minus, Trophy, Clock, ShoppingBag, Navigation, Plus, ChevronDown, Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { useDeviceId } from "@/hooks/useDeviceId";
import { directionsUrl } from "@/lib/handoff";
import { computeOTDC, airlineStylePrediction } from "@/lib/otdc";
import { ProductPlaceholder } from "@/components/ui/CannabisLeaf";
import { ProBadge } from "@/components/pro/ProGate";
import { AddItemSheet } from "@/components/list/AddItemSheet";
import { useAuth, isPro } from "@/lib/auth";
import { cn } from "@/lib/utils";

const RANK_BADGES = ["🥇", "🥈", "🥉"];

const TONE_STYLES = {
  low:    { icon: TrendingDown, color: "text-emerald-400" },
  wait:   { icon: TrendingUp,   color: "text-orange-400" },
  stable: { icon: Minus,        color: "text-zinc-400" },
} as const;

export default function ShoppingListPage() {
  const deviceId = useDeviceId();
  const auth = useAuth();
  const userIsPro = isPro(auth);
  const [addOpen, setAddOpen] = useState(false);
  const [expandedShop, setExpandedShop] = useState<string | null>(null);

  const { data: list, mutate } = useSWR(
    deviceId ? ["list", deviceId] : null,
    () => api.shoppingList(deviceId)
  );

  const { data: allProducts } = useSWR("all-products-for-otdc", () =>
    api.products({ limit: "200" })
  );

  const otdcRanking = useMemo(() => {
    if (!list?.items || !allProducts) return [];
    return computeOTDC(list.items, allProducts, 3);
  }, [list?.items, allProducts]);

  const winner = otdcRanking[0];

  async function remove(id: number) {
    await api.removeFromList(id, deviceId);
    mutate();
  }

  if (!deviceId) return null;
  if (!list) return <div className="p-8 text-zinc-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-surface pb-32">
      {/* Header — title + winning total */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-end justify-between gap-3 mb-1">
          <h1 className="font-display font-black text-2xl text-white">Your List</h1>
          {winner && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Best price</p>
              <p className="text-lg font-black text-emerald-400 leading-none">
                ${winner.otd_total.toFixed(0)}<span className="text-xs font-bold text-zinc-500"> OTD</span>
              </p>
            </div>
          )}
        </div>
        <p className="text-sm text-zinc-400 leading-snug">
          Add what you're picking up. We'll show the cheapest shop for the whole list.
        </p>
      </div>

      {/* Compact item rail — see everything you're tracking at once */}
      {list.items.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between px-5 mb-2">
            <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-bold">
              {list.item_count} item{list.item_count === 1 ? "" : "s"}
            </p>
            <button
              onClick={() => setAddOpen(true)}
              className="text-xs font-bold text-brand hover:text-brand-dark flex items-center gap-1"
            >
              <Plus size={11} strokeWidth={2.5} /> Add more
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5 pb-1">
            {list.items.map((item) => (
              <ItemChip key={item.id} item={item} onRemove={remove} userIsPro={userIsPro} />
            ))}
          </div>
        </div>
      )}

      {/* OTDC comparison — top 3 shops with full ratio/total/distance visible.
          Tap any card to expand and see per-item availability. */}
      {otdcRanking.length > 0 && (
        <div className="px-5 space-y-3">
          <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-bold">
            Cheapest pickups
          </p>
          {otdcRanking.map((shop, i) => (
            <ShopCompareCard
              key={shop.dispensary_slug}
              shop={shop}
              rank={i}
              listItems={list.items}
              expanded={expandedShop === shop.dispensary_slug}
              onToggle={() =>
                setExpandedShop(expandedShop === shop.dispensary_slug ? null : shop.dispensary_slug)
              }
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {list.items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-5">
          <ShoppingBasket size={36} className="text-zinc-700 mb-3" />
          <p className="text-white font-semibold mb-1">Your list is empty</p>
          <p className="text-zinc-500 text-sm max-w-xs mb-5">
            Add the products you want to pick up. We'll find the shop with the lowest out-the-door price.
          </p>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 bg-brand text-black font-bold px-5 py-3 rounded-2xl"
          >
            <Plus size={16} strokeWidth={2.5} /> Add your first item
          </button>
        </div>
      )}

      {/* Floating + button */}
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

// Compact item chip — thumbnail + name + tiny remove button
function ItemChip({ item, onRemove, userIsPro }: { item: ShoppingItem; onRemove: (id: number) => void; userIsPro: boolean }) {
  const prediction = airlineStylePrediction(item.prediction);
  const tone = prediction ? TONE_STYLES[prediction.tone] : null;
  const ToneIcon = tone?.icon;

  return (
    <div className="flex-shrink-0 w-36 bg-surface-card border border-surface-border rounded-2xl p-2.5 relative">
      <button
        onClick={() => onRemove(item.id)}
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-surface-elevated/80 backdrop-blur flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors"
        aria-label="Remove"
      >
        <X size={11} />
      </button>
      <div className="w-full aspect-square rounded-xl overflow-hidden mb-2 relative">
        <ProductPlaceholder
          productType={item.product.product_type}
          strainName={item.product.strain_name}
          className="w-full h-full"
        />
        {item.taste_warning && (
          <div className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center" title={item.taste_warning}>
            <AlertTriangle size={11} />
          </div>
        )}
      </div>
      <p className="text-xs font-bold text-white leading-tight line-clamp-1">
        {item.product.strain_name ?? item.product.name}
      </p>
      <p className="text-[10px] text-zinc-500 mt-0.5">{item.weight} · {item.quantity}×</p>
      {userIsPro && tone && ToneIcon && (
        <div className="flex items-center gap-1 mt-1.5">
          <ToneIcon size={9} className={tone.color} />
          <span className={cn("text-[9px] font-bold", tone.color)}>{prediction?.label}</span>
        </div>
      )}
    </div>
  );
}

// Per-shop comparison card — stats visible always, tap to expand item availability
function ShopCompareCard({
  shop, rank, listItems, expanded, onToggle,
}: {
  shop: ReturnType<typeof computeOTDC>[0];
  rank: number;
  listItems: ShoppingItem[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const isWinner = rank === 0;
  const fullFulfilled = shop.items_available === shop.items_total;

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden",
      isWinner
        ? "bg-gradient-to-br from-emerald-500/15 via-surface-card to-surface-card border-emerald-500/40"
        : "bg-surface-card border-surface-border"
    )}>
      {/* Header — always visible, tappable to expand */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{RANK_BADGES[rank]}</span>
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
            {/* The 3-stat row: ratio · OTD · distance */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Stat
                label="Items"
                value={`${shop.items_available}/${shop.items_total}`}
                accent={fullFulfilled ? "text-emerald-400" : "text-orange-400"}
              />
              <Stat
                label="OTD price"
                value={`$${shop.otd_total.toFixed(0)}`}
                accent={isWinner ? "text-emerald-400" : "text-white"}
              />
              <Stat
                label="Distance"
                value={shop.distance_miles != null ? `${shop.distance_miles.toFixed(1)} mi` : "—"}
                accent="text-white"
              />
            </div>
          </div>
          <ChevronDown
            size={16}
            className={cn(
              "text-zinc-500 flex-shrink-0 transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Expanded — per-item availability + actions */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-surface-border/40 pt-3">
              {/* Per-item rows — ✓ available with price, ✗ not available */}
              <div className="space-y-1.5 mb-3">
                {listItems.map((item) => {
                  const fulfillment = shop.fulfillment[item.product.id];
                  const available = fulfillment?.available;
                  return (
                    <div key={item.id} className="flex items-center gap-2 text-xs">
                      {available ? (
                        <Check size={11} className="text-emerald-400 flex-shrink-0" strokeWidth={3} />
                      ) : (
                        <X size={11} className="text-red-400 flex-shrink-0" strokeWidth={3} />
                      )}
                      <span className={cn("flex-1 truncate", available ? "text-zinc-300" : "text-zinc-600 line-through")}>
                        {item.product.strain_name ?? item.product.name} · {item.weight}
                      </span>
                      {available && (
                        <span className="text-zinc-400 font-semibold">${fulfillment.price.toFixed(0)}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tax breakdown */}
              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-surface-border/40">
                <span>Subtotal · ${shop.subtotal.toFixed(2)}</span>
                <span>+ ${shop.tax.toFixed(2)} tax</span>
              </div>

              {/* Action row */}
              <div className="flex gap-2 mt-3">
                <Link
                  href={`/dispensaries/${shop.dispensary_slug}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl bg-brand text-black hover:bg-brand-dark transition-colors"
                >
                  <ShoppingBag size={11} /> View menu
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">{label}</p>
      <p className={cn("text-base font-black mt-0.5 leading-none", accent)}>{value}</p>
    </div>
  );
}
