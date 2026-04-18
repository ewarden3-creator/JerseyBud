"use client";

import { useState } from "react";
import { Search, Mic, ArrowRight } from "lucide-react";
import { SearchSheet } from "@/components/ui/SearchSheet";
import { BudAvatar } from "@/components/brand/BudAvatar";

export function AskBudHero() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | null>(null);

  function open(query?: string) {
    setInitialQuery(query ?? null);
    setSearchOpen(true);
  }

  return (
    <>
      <div className="px-4 pt-4 pb-2">
        {/* Bud greeting + search-style entry */}
        <div className="flex items-center gap-3 mb-3">
          <BudAvatar size={56} state="idle" className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-400 leading-tight">Hey, I'm Bud.</p>
            <p className="text-base text-white font-display font-bold leading-tight">
              What are you in the mood for?
            </p>
          </div>
        </div>

        {/* Tap-to-open search/ask bar */}
        <button
          onClick={() => open()}
          className="w-full flex items-center gap-3 bg-surface-card border border-surface-border hover:border-brand/40 rounded-2xl px-4 py-3.5 transition-colors text-left"
        >
          <Search size={16} className="text-zinc-500 flex-shrink-0" />
          <span className="flex-1 text-sm text-zinc-500">Search or ask Bud anything…</span>
          <Mic size={14} className="text-zinc-600" />
        </button>
      </div>

      <SearchSheet
        open={searchOpen}
        onClose={() => { setSearchOpen(false); setInitialQuery(null); }}
        initialQuery={initialQuery}
      />
    </>
  );
}
