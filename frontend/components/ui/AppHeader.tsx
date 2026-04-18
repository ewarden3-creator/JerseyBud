"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, User, Search } from "lucide-react";
import { JerseyBudLockupCompact } from "@/components/brand/JerseyBudLogo";
import { SearchSheet } from "@/components/ui/SearchSheet";

export function AppHeader() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-md border-b border-surface-border">
        <div className="px-4 py-2.5 flex items-center gap-3">
          <Link href="/" aria-label="Jersey Bud home">
            <JerseyBudLockupCompact markSize={48} />
          </Link>
          <div className="flex-1" />
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search or ask Bud"
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-brand hover:bg-surface-elevated transition-colors"
          >
            <Search size={17} />
          </button>
          <Link
            href="/favorites"
            aria-label="Saved"
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-brand hover:bg-surface-elevated transition-colors"
          >
            <Heart size={16} />
          </Link>
          <Link
            href="/account"
            aria-label="Account"
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-brand hover:bg-surface-elevated transition-colors"
          >
            <User size={16} />
          </Link>
        </div>
      </header>

      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
