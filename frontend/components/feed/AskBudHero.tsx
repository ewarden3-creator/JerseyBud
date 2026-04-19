"use client";

import { useState } from "react";
import { Search, Mic } from "lucide-react";
import { SearchSheet } from "@/components/ui/SearchSheet";

// Slim, single-line entry to search/Ask Bud.
// No avatar, no greeting clutter — just a clear, inviting input.
export function AskBudHero() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="px-5 pt-5 pb-1">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 bg-surface-card border border-surface-border hover:border-brand/40 rounded-2xl px-4 py-3.5 transition-colors text-left"
        >
          <Search size={16} className="text-zinc-500 flex-shrink-0" />
          <span className="flex-1 text-[15px] text-zinc-500">Search or ask Bud…</span>
          <Mic size={14} className="text-zinc-600" />
        </button>
      </div>

      <SearchSheet open={open} onClose={() => setOpen(false)} initialQuery={null} />
    </>
  );
}
