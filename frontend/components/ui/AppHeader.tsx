"use client";

import Link from "next/link";
import { Heart, User } from "lucide-react";
import { JerseyBudLockupCompact } from "@/components/brand/JerseyBudLogo";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-md border-b border-surface-border">
      <div className="px-4 py-3 flex items-center gap-3">
        <Link href="/" aria-label="Jersey Bud home">
          <JerseyBudLockupCompact markSize={32} />
        </Link>
        <div className="flex-1" />
        <Link
          href="/favorites"
          className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-brand hover:bg-surface-elevated transition-colors"
          aria-label="Saved"
        >
          <Heart size={16} />
        </Link>
        <Link
          href="/account"
          className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-brand hover:bg-surface-elevated transition-colors"
          aria-label="Account"
        >
          <User size={16} />
        </Link>
      </div>
    </header>
  );
}
