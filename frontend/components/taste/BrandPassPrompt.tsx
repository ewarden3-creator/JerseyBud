"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ThumbsDown, Check } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useDeviceId } from "@/hooks/useDeviceId";

// Bottom sheet asking the user to escalate from product-level dislikes
// to a brand-level pass once a clear pattern emerges (3+ disliked products).
// Triggered programmatically right after the dislike that crosses the threshold.

interface Props {
  open: boolean;
  brandName: string;
  productCount: number;
  onClose: () => void;
}

const SKIP_KEY_PREFIX = "jb-brand-pass-skipped-";
const SKIP_DAYS = 14;

export function BrandPassPrompt({ open, brandName, productCount, onClose }: Props) {
  const deviceId = useDeviceId();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  async function confirm() {
    setConfirming(true);
    try {
      await api.judge({
        verdict: "avoid",
        brand_name: brandName,
        device_id: deviceId,
      });
      setDone(true);
      setTimeout(onClose, 1100);
    } finally {
      setConfirming(false);
    }
  }

  function skip() {
    // Don't re-prompt for this brand for a couple weeks
    localStorage.setItem(`${SKIP_KEY_PREFIX}${brandName}`, String(Date.now()));
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-surface-card border-t border-surface-border rounded-t-3xl p-6 pb-8"
          >
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-5" />

            {!done ? (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center flex-shrink-0">
                    <ThumbsDown size={20} className="text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-lg text-white leading-tight">
                      Pattern detected
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1 leading-snug">
                      You've passed on <span className="font-bold text-white">{productCount} {brandName}</span> products.
                      Want Bud to skip the whole brand from now on?
                    </p>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed mb-5 bg-surface-elevated rounded-xl p-3">
                  We'll flag any {brandName} product in your list, hide them from recommendations,
                  and stop suggesting their drops. Reverse it anytime from {brandName}'s page.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={skip}
                    className="flex-1 py-3 rounded-xl bg-surface-elevated text-zinc-400 font-semibold hover:text-white transition-colors"
                  >
                    Not yet
                  </button>
                  <button
                    onClick={confirm}
                    disabled={confirming}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ThumbsDown size={14} fill="currentColor" />
                    Skip {brandName}
                  </button>
                </div>
              </>
            ) : (
              <div className="py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-3">
                  <Check size={24} className="text-emerald-400" strokeWidth={3} />
                </div>
                <p className="font-bold text-white">{brandName} is on Bud's pass list.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function shouldPromptForBrand(brandName: string): boolean {
  const skippedAt = localStorage.getItem(`${SKIP_KEY_PREFIX}${brandName}`);
  if (!skippedAt) return true;
  const ageDays = (Date.now() - parseInt(skippedAt)) / (1000 * 60 * 60 * 24);
  return ageDays >= SKIP_DAYS;
}
