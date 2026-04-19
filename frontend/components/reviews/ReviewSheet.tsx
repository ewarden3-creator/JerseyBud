"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Check, Award, Loader2 } from "lucide-react";
import { useDeviceId } from "@/hooks/useDeviceId";
import { cn } from "@/lib/utils";

const COMMON_EFFECTS = [
  { key: "relaxed",  emoji: "😌" },
  { key: "happy",    emoji: "😊" },
  { key: "uplifted", emoji: "🚀" },
  { key: "creative", emoji: "🎨" },
  { key: "focused",  emoji: "🎯" },
  { key: "sleepy",   emoji: "😴" },
  { key: "hungry",   emoji: "🍕" },
  { key: "social",   emoji: "💬" },
  { key: "couchy",   emoji: "🛋️" },
];

const COMMON_TERPS = [
  "citrus", "pine", "earth", "gas", "berry", "floral",
  "pepper", "mint", "skunk", "cheese", "cream", "fuel",
];

const MIN_BODY = 80;

interface Props {
  product?: ProductOut;
  strainName?: string;
  onClose: () => void;
  onSubmitted?: (creditEligible: boolean) => void;
}

export function ReviewSheet({ product, strainName, onClose, onSubmitted }: Props) {
  const deviceId = useDeviceId();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [effects, setEffects] = useState<string[]>([]);
  const [terps, setTerps] = useState<string[]>([]);
  const [buyAgain, setBuyAgain] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isCreditEligible = body.length >= MIN_BODY && rating > 0;
  const charsToCredit = Math.max(0, MIN_BODY - body.length);

  function toggle(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  async function submit() {
    if (rating === 0) return;
    setLoading(true);
    // Mock submission — when backend is wired, POST /reviews
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setDone(true);
    onSubmitted?.(isCreditEligible);
    setTimeout(onClose, 1600);
  }

  const target = product?.strain_name ?? product?.name ?? strainName ?? "this";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-surface-card border-t border-surface-border rounded-t-3xl max-h-[88vh] overflow-y-auto"
        >
          {/* Drag handle */}
          <div className="sticky top-0 bg-surface-card pt-3 pb-2 z-10">
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto" />
          </div>

          <div className="px-5 pb-7">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display font-bold text-xl text-white">Rate {target}</h2>
                <p className="text-xs text-zinc-500 mt-1">Your honest take helps Bud learn you.</p>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {!done ? (
              <>
                {/* Star rating */}
                <div className="flex justify-center gap-1.5 py-4">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={36}
                        className={cn(
                          "transition-colors",
                          n <= rating ? "text-amber-400" : "text-zinc-700"
                        )}
                        fill={n <= rating ? "currentColor" : "none"}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-center text-sm text-zinc-300 -mt-2 mb-4">
                    {["Hated it", "Meh", "Decent", "Liked it", "Loved it"][rating - 1]}
                  </p>
                )}

                {/* Effects felt */}
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">
                    What did you feel?
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_EFFECTS.map((e) => (
                      <button
                        key={e.key}
                        onClick={() => toggle(effects, setEffects, e.key)}
                        className={cn(
                          "text-xs px-2.5 py-1.5 rounded-pill border flex items-center gap-1 transition-colors",
                          effects.includes(e.key)
                            ? "border-brand bg-brand/20 text-brand"
                            : "border-surface-border text-zinc-400 hover:border-zinc-500"
                        )}
                      >
                        <span>{e.emoji}</span>
                        <span className="capitalize">{e.key}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Terps noted */}
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">
                    Flavor / aroma
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_TERPS.map((t) => (
                      <button
                        key={t}
                        onClick={() => toggle(terps, setTerps, t)}
                        className={cn(
                          "text-xs px-2.5 py-1.5 rounded-pill border transition-colors capitalize",
                          terps.includes(t)
                            ? "border-orange-400 bg-orange-400/15 text-orange-400"
                            : "border-surface-border text-zinc-400 hover:border-zinc-500"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Buy again */}
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">
                    Buy again?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBuyAgain(true)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors",
                        buyAgain === true
                          ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                          : "border-surface-border text-zinc-400"
                      )}
                    >
                      👍 Yeah
                    </button>
                    <button
                      onClick={() => setBuyAgain(false)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors",
                        buyAgain === false
                          ? "border-red-500 bg-red-500/15 text-red-400"
                          : "border-surface-border text-zinc-400"
                      )}
                    >
                      👎 Nah
                    </button>
                  </div>
                </div>

                {/* Body — credit-eligible if 80+ chars */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
                      Your take
                    </p>
                    <p className={cn(
                      "text-[10px] font-bold flex items-center gap-1",
                      isCreditEligible ? "text-amber-400" : "text-zinc-600"
                    )}>
                      {isCreditEligible ? (
                        <><Award size={11} /> Credit eligible ✓</>
                      ) : (
                        <>{charsToCredit} chars to credit</>
                      )}
                    </p>
                  </div>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    placeholder="What hit different? What didn't? Be honest — Bud uses this to learn you."
                    className="w-full bg-surface-elevated border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand placeholder:text-zinc-600 resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={submit}
                  disabled={rating === 0 || loading}
                  className="w-full bg-brand text-black font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-dark transition-colors"
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Posting…</> : "Post review"}
                </button>

                {isCreditEligible && (
                  <p className="text-center text-xs text-amber-400 mt-3 font-semibold">
                    +1 credit toward your next free month 🎯
                  </p>
                )}
              </>
            ) : (
              <div className="py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-emerald-400" />
                </div>
                <h3 className="font-display font-bold text-xl text-white mb-1">Review posted</h3>
                {isCreditEligible ? (
                  <p className="text-sm text-amber-400 font-semibold flex items-center justify-center gap-1">
                    <Award size={14} /> +1 credit earned
                  </p>
                ) : (
                  <p className="text-sm text-zinc-400">Bud just learned a little more about you.</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
