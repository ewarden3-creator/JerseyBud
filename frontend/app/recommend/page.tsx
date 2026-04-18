"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Loader2, RotateCcw, Mic, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductActionRow } from "@/components/ui/HandoffButtons";
import { useAuth, isPro } from "@/lib/auth";
import { ProBadge } from "@/components/pro/ProGate";

const FREE_QUERIES_PER_DAY = 3;

function getQueriesUsedToday(): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toISOString().slice(0, 10);
  const stored = JSON.parse(localStorage.getItem("jb-recommend-usage") ?? "{}");
  return stored[today] ?? 0;
}

function bumpQueriesUsedToday(): number {
  const today = new Date().toISOString().slice(0, 10);
  const stored = JSON.parse(localStorage.getItem("jb-recommend-usage") ?? "{}");
  stored[today] = (stored[today] ?? 0) + 1;
  // Cleanup old days
  Object.keys(stored).forEach((d) => { if (d !== today) delete stored[d]; });
  localStorage.setItem("jb-recommend-usage", JSON.stringify(stored));
  return stored[today];
}

const QUICK_INTENTS = [
  { label: "Help me sleep",          icon: "🌙", query: "Something to help me sleep without grogginess" },
  { label: "Creative focus",         icon: "🎨", query: "Something uplifting for creative work, not too strong" },
  { label: "Relax after work",       icon: "😌", query: "Something to take the edge off after a long day" },
  { label: "Social and chatty",      icon: "💬", query: "Something social, chatty, good for hanging with friends" },
  { label: "Pain relief",            icon: "🩹", query: "Something for body pain that won't put me to sleep" },
  { label: "Best deal flower",       icon: "💰", query: "Best deal on flower near me, doesn't matter what kind" },
];

export default function RecommendPage() {
  const { lat, lng } = useLocation();
  const auth = useAuth();
  const userIsPro = isPro(auth);
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [queriesUsed, setQueriesUsed] = useState(0);

  useEffect(() => { setQueriesUsed(getQueriesUsedToday()); }, []);

  const queriesLeft = FREE_QUERIES_PER_DAY - queriesUsed;
  const limitReached = !userIsPro && queriesLeft <= 0;

  async function ask(q?: string) {
    const finalQuery = q ?? query;
    if (!finalQuery.trim()) return;
    if (limitReached) return;
    setLoading(true);
    setQuery(finalQuery);
    try {
      const res = await api.recommend({
        query: finalQuery,
        lat, lng,
        radius_miles: 30,
        budget: budget ? parseFloat(budget) : undefined,
      });
      setResult(res);
      if (!userIsPro) setQueriesUsed(bumpQueriesUsedToday());
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setQuery("");
  }

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-brand" />
          <h1 className="font-display font-bold text-2xl text-white">Ask Bud</h1>
          {userIsPro && (
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-pill bg-amber-500/20 text-amber-400 border border-amber-500/40 ml-1">
              Personalized
            </span>
          )}
          {!userIsPro && (
            <span className="ml-auto text-[10px] font-bold text-zinc-500">
              {queriesLeft > 0 ? `${queriesLeft}/${FREE_QUERIES_PER_DAY} free today` : "Daily limit reached"}
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500">
          {userIsPro
            ? "Bud knows your taste. Ask anything."
            : "Tell me what you're looking for. I'll recommend specific products on shelves near you."}
        </p>

        {/* Voice chat — Pro only */}
        <div className="mt-3 flex gap-2">
          {userIsPro ? (
            <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-pill bg-brand/15 border border-brand/40 text-brand hover:bg-brand/25 transition-colors">
              <Mic size={11} /> Voice
            </button>
          ) : (
            <Link href="/upgrade" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-pill bg-surface-card border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors">
              <Lock size={10} /> <Mic size={11} /> Voice <ProBadge className="ml-1" />
            </Link>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {limitReached ? (
          <motion.div
            key="limit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4"
          >
            <div className="rounded-3xl bg-gradient-to-br from-amber-500/15 via-surface-card to-surface-card border border-amber-500/40 p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Lock size={18} className="text-amber-400" />
              </div>
              <h2 className="font-display font-bold text-lg text-white mb-1">
                You've used your {FREE_QUERIES_PER_DAY} free questions today
              </h2>
              <p className="text-sm text-zinc-400 mb-5">
                Pro gives you unlimited Ask Bud queries — plus personalized recommendations that get smarter every time you rate something.
              </p>
              <Link
                href="/upgrade"
                className="inline-flex items-center gap-2 bg-amber-400 text-black font-bold px-5 py-3 rounded-xl"
              >
                <Sparkles size={14} /> Try Pro free for 7 days
              </Link>
            </div>
          </motion.div>
        ) : !result ? (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4"
          >
            {/* Quick intent grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {QUICK_INTENTS.map((i) => (
                <button
                  key={i.label}
                  onClick={() => ask(i.query)}
                  disabled={loading}
                  className="bg-surface-card border border-surface-border rounded-2xl p-4 text-left hover:border-brand/50 transition-colors disabled:opacity-50"
                >
                  <span className="text-2xl block mb-2">{i.icon}</span>
                  <span className="text-sm text-white font-semibold leading-tight">{i.label}</span>
                </button>
              ))}
            </div>

            {/* Free-text input */}
            <div className="bg-surface-card border border-surface-border rounded-2xl p-4 focus-within:border-brand/60 transition-colors">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="…or tell me in your own words"
                rows={3}
                className="w-full bg-transparent text-white text-base placeholder:text-zinc-600 outline-none resize-none"
              />

              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-surface-border">
                <div className="flex-1 flex items-center gap-2 bg-surface-elevated rounded-xl px-3 py-2">
                  <span className="text-zinc-500 text-sm">Budget</span>
                  <span className="text-zinc-500">$</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="any"
                    className="flex-1 bg-transparent text-white text-sm outline-none w-12"
                  />
                </div>
                <button
                  onClick={() => ask()}
                  disabled={loading || !query.trim()}
                  className="bg-brand text-black font-bold px-5 py-3 rounded-xl flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-dark transition-colors"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Ask
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4"
          >
            {/* Original query echo */}
            <div className="bg-surface-card border border-surface-border rounded-2xl p-3 mb-4 flex items-start justify-between gap-3">
              <p className="text-sm text-zinc-400 italic">"{query}"</p>
              <button onClick={reset} className="text-zinc-500 hover:text-brand flex items-center gap-1 flex-shrink-0">
                <RotateCcw size={12} />
                <span className="text-xs">New</span>
              </button>
            </div>

            {/* Answer */}
            <div className="bg-gradient-to-br from-brand/10 to-transparent border border-brand/30 rounded-2xl p-4 mb-4">
              <div className="flex items-start gap-2">
                <Sparkles size={14} className="text-brand mt-1 flex-shrink-0" />
                <p className="text-sm text-zinc-200 leading-relaxed">{result.answer}</p>
              </div>
            </div>

            {/* Recommended products — each card already has Reserve + Directions
                in its footer; wrap with a quick "go now" CTA strip on top of
                the first pick to make the assistant feel decisive. */}
            <div className="space-y-3">
              {result.products.map((p, idx) => (
                <div key={p.id}>
                  {idx === 0 && (
                    <div className="mb-2 px-1">
                      <p className="text-xs text-brand uppercase tracking-wide font-bold mb-2">Top pick</p>
                      <ProductActionRow product={p} />
                    </div>
                  )}
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
