"use client";

import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";

interface Props {
  lat: number | null;
  lng: number | null;
}

const PROMPTS = [
  "Something relaxing for tonight...",
  "Help me sleep without grogginess",
  "Creative and uplifting, not too strong",
  "Best deal on flower near me",
  "High terps, I don't care about THC %",
  "Couch-lock indica under $40 an eighth",
];

export function RecommendBar({ lat, lng }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  // Deterministic SSR placeholder; randomize after hydration to avoid mismatch
  const [placeholder, setPlaceholder] = useState(PROMPTS[0]);
  useEffect(() => {
    setPlaceholder(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  }, []);

  async function submit() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await api.recommend({ query, lat, lng, radius_miles: 30 });
      setResult(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {/* Input */}
      <div className="flex gap-2 items-center bg-surface-card border border-surface-border rounded-2xl px-4 py-3 focus-within:border-brand/60 transition-colors">
        <Sparkles size={16} className="text-brand flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white text-sm placeholder:text-zinc-600 outline-none"
        />
        <button
          onClick={submit}
          disabled={loading || !query.trim()}
          className="text-brand hover:text-brand-dark disabled:text-zinc-700 transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        </button>
      </div>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 bg-surface-card border border-surface-border rounded-2xl">
              <div className="flex items-start gap-2 mb-4">
                <Sparkles size={14} className="text-brand mt-0.5 flex-shrink-0" />
                <p className="text-sm text-zinc-300 leading-relaxed">{result.answer}</p>
              </div>
              <div className="space-y-3">
                {result.products.map((p) => (
                  <ProductCard key={p.id} product={p} compact />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
