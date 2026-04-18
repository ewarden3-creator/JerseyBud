"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Sparkles, Loader2, ArrowRight, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { ProductCardCompact } from "@/components/product/ProductCardCompact";
import { BudAvatar } from "@/components/brand/BudAvatar";
import { cn } from "@/lib/utils";

const QUICK_INTENTS = [
  { label: "Help me sleep",    emoji: "🌙", query: "Something to help me sleep without grogginess" },
  { label: "Get creative",     emoji: "🎨", query: "Something uplifting for creative work, not too strong" },
  { label: "Relax after work", emoji: "😌", query: "Something to take the edge off after a long day" },
  { label: "Be social",        emoji: "💬", query: "Something social, chatty, good for hanging with friends" },
  { label: "Pain relief",      emoji: "🩹", query: "Something for body pain that won't put me to sleep" },
  { label: "Best deal flower", emoji: "💰", query: "Best deal on flower near me" },
];

const BROWSE_CHIPS = [
  { label: "On sale",    href: "/feed?on_sale=true" },
  { label: "Best value", href: "/feed?sort=price_per_gram" },
  { label: "High THC",   href: "/feed?min_thc=25" },
  { label: "Sativa",     href: "/feed?product_type=sativa" },
  { label: "Indica",     href: "/feed?product_type=indica" },
  { label: "Hybrid",     href: "/feed?product_type=hybrid" },
];

function looksLikeAskBudQuery(q: string): boolean {
  const trimmed = q.trim();
  if (trimmed.length === 0) return false;
  const words = trimmed.split(/\s+/);
  if (words.length >= 4) return true;
  if (/[?!]/.test(trimmed)) return true;
  if (/\b(help|need|want|looking|feel|relax|sleep|focus|creative|social|pain|cheap|deal|under \$)\b/i.test(trimmed)) return true;
  return false;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initialQuery?: string | null;
}

export function SearchSheet({ open, onClose, initialQuery }: Props) {
  const { lat, lng } = useLocation();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [results, setResults] = useState<ProductOut[]>([]);
  const [searching, setSearching] = useState(false);
  const [askResult, setAskResult] = useState<RecommendResponse | null>(null);
  const [asking, setAsking] = useState(false);

  const isAskBud = looksLikeAskBudQuery(query);

  // Reset state on open / focus input / auto-fire if initialQuery provided
  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); setAskResult(null); return; }
    if (initialQuery) {
      setQuery(initialQuery);
      askBud(initialQuery);
    } else {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced || isAskBud) { setResults([]); return; }
    setSearching(true);
    api.products({ search: debounced, limit: "20" })
      .then(setResults)
      .finally(() => setSearching(false));
  }, [debounced, isAskBud]);

  async function askBud(text?: string) {
    const finalQuery = (text ?? query).trim();
    if (!finalQuery) return;
    setQuery(finalQuery);
    setAsking(true);
    setAskResult(null);
    try {
      const res = await api.recommend({ query: finalQuery, lat, lng, radius_miles: 30 });
      setAskResult(res);
    } finally {
      setAsking(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-surface flex flex-col"
        >
          {/* Top input bar */}
          <div className="bg-surface-card border-b border-surface-border">
            <div className="px-4 py-3 flex items-center gap-3">
              {isAskBud ? (
                <Sparkles size={18} className="text-brand flex-shrink-0" />
              ) : (
                <Search size={18} className="text-zinc-500 flex-shrink-0" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setAskResult(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isAskBud) askBud();
                }}
                placeholder="Search strains, brands… or ask Bud"
                className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-zinc-600"
              />
              <button onClick={onClose} aria-label="Close">
                <X size={20} className="text-zinc-500 hover:text-white" />
              </button>
            </div>

            {query && (
              <div className="px-4 pb-2 flex items-center gap-2">
                {isAskBud ? (
                  <button
                    onClick={() => askBud()}
                    disabled={asking}
                    className="flex items-center gap-1.5 text-xs font-bold text-black bg-brand px-3 py-1.5 rounded-pill hover:bg-brand-dark disabled:opacity-50 transition-colors"
                  >
                    {asking ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    Ask Bud
                    <ArrowRight size={11} />
                  </button>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1">
                    <Search size={9} /> Searching products
                  </span>
                )}
                <Link
                  href="/feed"
                  onClick={onClose}
                  className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-brand"
                >
                  <SlidersHorizontal size={11} /> Advanced
                </Link>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto pb-32">
            {/* Empty state — Bud greeting + intents + browse chips */}
            {!query && !asking && (
              <div className="px-4 py-6">
                {/* Bud greeting */}
                <div className="flex flex-col items-center text-center mb-6">
                  <BudAvatar size={88} state="idle" />
                  <p className="font-display font-bold text-xl text-white mt-3">Hi, I'm Bud.</p>
                  <p className="text-sm text-zinc-400 mt-1 max-w-xs">
                    Tell me what you're after, or pick an idea below.
                  </p>
                </div>

                {/* Quick intent list — single-column, fires immediately on tap */}
                <div className="space-y-2 mb-6">
                  {QUICK_INTENTS.map((i) => (
                    <button
                      key={i.label}
                      onClick={() => askBud(i.query)}
                      className="w-full flex items-center gap-3 bg-surface-card border border-surface-border rounded-2xl px-4 py-3 hover:border-brand/40 transition-colors text-left"
                    >
                      <span className="text-2xl flex-shrink-0">{i.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{i.label}</p>
                        <p className="text-[11px] text-zinc-500 truncate">{i.query}</p>
                      </div>
                      <ArrowRight size={14} className="text-zinc-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>

                {/* Browse chips — for "I know what category I want" */}
                <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 px-1">
                  Or just browse
                </p>
                <div className="flex flex-wrap gap-2">
                  {BROWSE_CHIPS.map((c) => (
                    <Link
                      key={c.label}
                      href={c.href}
                      onClick={onClose}
                      className="text-xs px-3 py-2 rounded-pill bg-surface-elevated border border-surface-border text-zinc-300 hover:border-brand/50 hover:text-brand transition-colors"
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Bud is thinking */}
            {asking && (
              <div className="px-4 py-12 flex flex-col items-center text-center">
                <BudAvatar size={96} state="thinking" />
                <p className="text-sm text-zinc-400 mt-4 italic">"{query}"</p>
                <p className="text-xs text-zinc-600 mt-1">Bud is thinking…</p>
              </div>
            )}

            {/* Ask Bud result */}
            {askResult && (
              <div className="px-4 py-4">
                <div className="flex items-start gap-3 mb-3">
                  <BudAvatar size={48} state="speaking" className="flex-shrink-0 mt-1" />
                  <div className="flex-1 bg-gradient-to-br from-brand/15 via-surface-card to-surface-card border border-brand/30 rounded-2xl p-4 rounded-tl-sm">
                    <p className="text-sm text-zinc-200 leading-relaxed">{askResult.answer}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {askResult.products.map((p) => (
                    <div key={p.id} onClick={onClose}>
                      <ProductCardCompact product={p} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live product search results */}
            {!isAskBud && query && !asking && (
              <div className="px-4 py-4">
                {searching && results.length === 0 ? (
                  <p className="text-zinc-500 text-sm py-8 text-center">Searching…</p>
                ) : results.length > 0 ? (
                  <>
                    <p className="text-xs text-zinc-500 mb-3">{results.length} result{results.length === 1 ? "" : "s"}</p>
                    <div className="space-y-3">
                      {results.map((p) => (
                        <div key={p.id} onClick={onClose}>
                          <ProductCardCompact product={p} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-zinc-400 text-sm mb-3">No products match "{query}"</p>
                    <button
                      onClick={() => askBud()}
                      className="inline-flex items-center gap-2 bg-brand text-black font-bold px-4 py-2.5 rounded-xl"
                    >
                      <Sparkles size={14} /> Ask Bud about it instead
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
