"use client";

import { useState } from "react";
import { Sparkles, Search } from "lucide-react";
import { SearchSheet } from "@/components/ui/SearchSheet";

const QUICK_INTENTS = [
  { label: "Help me sleep",    emoji: "🌙", query: "Something to help me sleep without grogginess" },
  { label: "Creative focus",   emoji: "🎨", query: "Something uplifting for creative work, not too strong" },
  { label: "Relax",            emoji: "😌", query: "Something to take the edge off after a long day" },
  { label: "Best deal",        emoji: "💰", query: "Best deal on flower near me" },
];

export function AskBudHero() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div className="px-4 pt-4 pb-2">
        {/* Tap-to-open search/ask bar — looks like an input but opens the full sheet */}
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 bg-surface-card border border-surface-border hover:border-brand/40 rounded-2xl px-4 py-3.5 transition-colors text-left"
        >
          <Sparkles size={16} className="text-brand flex-shrink-0" />
          <span className="flex-1 text-sm text-zinc-500">Search or ask Bud anything…</span>
          <Search size={14} className="text-zinc-600" />
        </button>

        {/* Quick intents — one-tap entry into the assistant */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {QUICK_INTENTS.map((i) => (
            <button
              key={i.label}
              onClick={() => setSearchOpen(true)}
              className="bg-surface-card border border-surface-border rounded-xl py-3 px-2 text-center hover:border-brand/40 transition-colors"
            >
              <span className="text-xl block mb-1">{i.emoji}</span>
              <span className="text-[10px] text-zinc-300 font-semibold leading-tight block">
                {i.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
