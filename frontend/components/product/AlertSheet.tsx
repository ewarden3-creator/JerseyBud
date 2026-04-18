"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Check } from "lucide-react";
import * as Slider from "@radix-ui/react-slider";
import { api } from "@/lib/api";
import { useDeviceId } from "@/hooks/useDeviceId";
import { cn } from "@/lib/utils";

interface Props {
  product: ProductOut;
  onClose: () => void;
}

export function AlertSheet({ product, onClose }: Props) {
  const deviceId = useDeviceId();

  // Default to cheapest weight tier
  const cheapest = product.pricing?.sort((a, b) => a.price - b.price)[0];
  const [weight, setWeight] = useState(cheapest?.weight ?? "3.5g");
  const currentEntry = product.pricing?.find((p) => p.weight === weight) ?? cheapest;
  const current = currentEntry?.price ?? 0;

  // Default threshold = 10% below current
  const [threshold, setThreshold] = useState(Math.floor(current * 0.9));
  const [type, setType] = useState<"price_threshold" | "back_in_stock">("price_threshold");
  const [saved, setSaved] = useState(false);

  const minPrice = Math.max(1, Math.floor(current * 0.4));
  const maxPrice = Math.ceil(current);

  async function save() {
    await api.createAlert({
      device_id: deviceId,
      alert_type: type,
      product_id: product.id,
      strain_name: product.strain_name,
      target_weight: type === "price_threshold" ? weight : null,
      threshold_price: type === "price_threshold" ? threshold : null,
    });
    setSaved(true);
    setTimeout(onClose, 1200);
  }

  const pctOff = current ? Math.round((1 - threshold / current) * 100) : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-surface-card border-t border-surface-border rounded-t-3xl p-5 pb-8"
        >
          {/* Drag handle */}
          <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-brand" />
              <h3 className="font-display font-bold text-white">Watch this</h3>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <p className="text-sm text-zinc-500 mb-4 truncate">{product.strain_name ?? product.name}</p>

          {/* Alert type toggle */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setType("price_threshold")}
              className={cn(
                "py-3 rounded-xl border text-sm font-semibold transition-colors",
                type === "price_threshold"
                  ? "border-brand bg-brand/20 text-brand"
                  : "border-surface-border text-zinc-400"
              )}
            >
              Price Drop
            </button>
            <button
              onClick={() => setType("back_in_stock")}
              className={cn(
                "py-3 rounded-xl border text-sm font-semibold transition-colors",
                type === "back_in_stock"
                  ? "border-brand bg-brand/20 text-brand"
                  : "border-surface-border text-zinc-400"
              )}
            >
              Back in Stock
            </button>
          </div>

          {/* Price threshold UI */}
          {type === "price_threshold" && (
            <>
              {/* Weight selector */}
              {product.pricing && product.pricing.length > 1 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {product.pricing.map((p) => (
                    <button
                      key={p.weight}
                      onClick={() => { setWeight(p.weight); setThreshold(Math.floor(p.price * 0.9)); }}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-pill border transition-colors",
                        weight === p.weight
                          ? "border-brand text-brand bg-brand/10"
                          : "border-surface-border text-zinc-500"
                      )}
                    >
                      {p.weight} · ${p.price}
                    </button>
                  ))}
                </div>
              )}

              {/* Threshold slider */}
              <div className="bg-surface-elevated rounded-2xl p-4 mb-4">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-zinc-500">Notify me when ≤</p>
                    <p className="text-3xl font-bold text-brand">${threshold}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Currently</p>
                    <p className="text-lg font-semibold text-zinc-400 line-through">${current}</p>
                    {pctOff > 0 && (
                      <p className="text-xs text-orange-400 font-bold">{pctOff}% off</p>
                    )}
                  </div>
                </div>

                <Slider.Root
                  className="relative flex items-center w-full h-5"
                  value={[threshold]}
                  onValueChange={(v) => setThreshold(v[0])}
                  min={minPrice}
                  max={maxPrice}
                  step={1}
                >
                  <Slider.Track className="relative h-1.5 w-full bg-surface-border rounded-full">
                    <Slider.Range className="absolute h-full bg-brand rounded-full" />
                  </Slider.Track>
                  <Slider.Thumb className="block w-5 h-5 bg-white rounded-full border-2 border-brand shadow-lg focus:outline-none" />
                </Slider.Root>

                <div className="flex justify-between mt-2 text-xs text-zinc-600">
                  <span>${minPrice}</span>
                  <span>${maxPrice}</span>
                </div>
              </div>
            </>
          )}

          {type === "back_in_stock" && (
            <div className="bg-surface-elevated rounded-2xl p-4 mb-4">
              <p className="text-sm text-zinc-300">
                We'll notify you immediately when this product becomes available again.
              </p>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={save}
            disabled={saved}
            className={cn(
              "w-full font-bold py-4 rounded-2xl text-base transition-colors flex items-center justify-center gap-2",
              saved ? "bg-emerald-500 text-white" : "bg-brand text-black hover:bg-brand-dark"
            )}
          >
            {saved ? <><Check size={18} /> Alert created</> : "Set Alert"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
