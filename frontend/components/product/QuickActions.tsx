"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { ThumbsUp, ThumbsDown, ShoppingBasket, Check, AlertTriangle, Heart, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useDeviceId } from "@/hooks/useDeviceId";
import { ReviewSheet } from "@/components/reviews/ReviewSheet";
import { BrandPassPrompt, shouldPromptForBrand } from "@/components/taste/BrandPassPrompt";
import { cn } from "@/lib/utils";

const BRAND_DISLIKE_THRESHOLD = 3;

interface Props {
  product: ProductOut;
}

export function TasteWarning({ product }: Props) {
  const deviceId = useDeviceId();
  const { data } = useSWR(
    deviceId ? ["taste-check", product.id, deviceId] : null,
    () => api.checkTaste({
      product_id: product.id,
      strain_name: product.strain_name ?? undefined,
      brand_name: product.brand ?? undefined,
      device_id: deviceId,
    })
  );

  if (!data?.message) return null;

  const isWarning = data.tone === "warning";
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
      isWarning
        ? "bg-red-500/15 border border-red-500/30 text-red-300"
        : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
    )}>
      {isWarning ? <AlertTriangle size={12} /> : <Heart size={12} fill="currentColor" />}
      <span className="flex-1">{data.message}</span>
    </div>
  );
}

export function QuickActions({ product }: Props) {
  const deviceId = useDeviceId();
  const [verdict, setVerdict] = useState<string | null>(null);
  const [addedToList, setAddedToList] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [brandPrompt, setBrandPrompt] = useState<{ brand: string; count: number } | null>(null);

  // Hydrate verdict from existing judgment
  useEffect(() => {
    if (!deviceId) return;
    api.checkTaste({
      product_id: product.id,
      strain_name: product.strain_name ?? undefined,
      brand_name: product.brand ?? undefined,
      device_id: deviceId,
    }).then((r) => setVerdict(r.verdict ?? null));
  }, [deviceId, product.id]);

  async function judge(v: "liked" | "disliked") {
    const newVerdict = verdict === v ? "neutral" : v;
    setVerdict(newVerdict);
    // Default scope is PRODUCT-LEVEL only — broader scopes happen via inferred
    // prompt or manual brand/strain pass on the brand/strain pages.
    await api.judge({
      verdict: newVerdict,
      product_id: product.id,
      device_id: deviceId,
    });

    // After a fresh dislike, check if a brand-pattern prompt is warranted
    if (newVerdict === "disliked" && product.brand) {
      checkAndPromptBrandPattern(product.brand);
    }
  }

  async function checkAndPromptBrandPattern(brand: string) {
    if (!shouldPromptForBrand(brand)) return;
    try {
      const all = await api.judgments?.(deviceId);
      if (!all) return;
      // Already escalated to brand level? skip.
      const alreadyBrandPass = all.some((j) =>
        j.brand_name === brand && (j.verdict === "disliked" || j.verdict === "avoid")
      );
      if (alreadyBrandPass) return;
      const dislikedFromBrand = all.filter(
        (j) => j.product_id != null && j.verdict === "disliked"
      );
      // We need to count how many of those dislikes were from this brand —
      // the API doesn't include brand on product judgments, so we approximate
      // with an immediate threshold trigger after the latest dislike. The
      // backend can later return a richer signal.
      if (dislikedFromBrand.length >= BRAND_DISLIKE_THRESHOLD) {
        setBrandPrompt({ brand, count: dislikedFromBrand.length });
      }
    } catch {
      // best-effort, fail silently
    }
  }

  async function addToList(weight: string) {
    await api.addToList({ product_id: product.id, weight, quantity: 1, device_id: deviceId });
    setAddedToList(true);
    setShowWeightPicker(false);
    setTimeout(() => setAddedToList(false), 2200);
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {/* Thumbs up */}
      <button
        onClick={() => judge("liked")}
        title={verdict === "liked" ? "You liked this" : "Mark as liked"}
        className={cn(
          "w-9 h-9 rounded-full border flex items-center justify-center transition-colors",
          verdict === "liked"
            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
            : "bg-surface-elevated border-surface-border text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/50"
        )}
      >
        <ThumbsUp size={14} fill={verdict === "liked" ? "currentColor" : "none"} />
      </button>

      {/* Thumbs down */}
      <button
        onClick={() => judge("disliked")}
        title={verdict === "disliked" ? "You disliked this" : "Mark as disliked"}
        className={cn(
          "w-9 h-9 rounded-full border flex items-center justify-center transition-colors",
          verdict === "disliked"
            ? "bg-red-500/20 border-red-500 text-red-400"
            : "bg-surface-elevated border-surface-border text-zinc-500 hover:text-red-400 hover:border-red-500/50"
        )}
      >
        <ThumbsDown size={14} fill={verdict === "disliked" ? "currentColor" : "none"} />
      </button>

      {/* Review button */}
      <button
        onClick={() => setShowReview(true)}
        title="Rate this product"
        className="w-9 h-9 rounded-full border border-surface-border bg-surface-elevated flex items-center justify-center text-zinc-500 hover:text-amber-400 hover:border-amber-500/50 transition-colors"
      >
        <Star size={14} />
      </button>

      {/* Add to shopping list */}
      <button
        onClick={() => setShowWeightPicker(!showWeightPicker)}
        title="Add to shopping list"
        className="ml-auto flex items-center gap-1.5 px-3 h-9 rounded-full bg-surface-elevated border border-surface-border text-zinc-400 hover:text-brand hover:border-brand/50 text-xs font-semibold transition-colors"
      >
        {addedToList ? (
          <><Check size={13} className="text-brand" /><span className="text-brand">Added</span></>
        ) : (
          <><ShoppingBasket size={13} /><span>Add to list</span></>
        )}
      </button>

      {/* Review modal */}
      {showReview && <ReviewSheet product={product} onClose={() => setShowReview(false)} />}

      {/* Inferred brand-pass prompt — appears after 3+ product dislikes from same brand */}
      {brandPrompt && (
        <BrandPassPrompt
          open
          brandName={brandPrompt.brand}
          productCount={brandPrompt.count}
          onClose={() => setBrandPrompt(null)}
        />
      )}

      {/* Weight picker popover */}
      <AnimatePresence>
        {showWeightPicker && product.pricing && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-4 mt-12 z-30 bg-surface-elevated border border-surface-border rounded-xl p-2 shadow-xl"
          >
            <p className="text-[10px] uppercase tracking-wide text-zinc-500 font-bold px-2 pb-1.5">Add which weight?</p>
            {product.pricing.map((p) => (
              <button
                key={p.weight}
                onClick={() => addToList(p.weight)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-card text-sm"
              >
                <span className="text-white">{p.weight}</span>
                <span className="text-brand font-semibold">${p.price}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
