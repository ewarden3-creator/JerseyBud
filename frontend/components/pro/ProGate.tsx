"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { useAuth, isPro } from "@/lib/auth";
import { cn } from "@/lib/utils";

// Wrap a Pro-only feature. If the user isn't Pro, the children are blurred,
// non-interactive, and overlaid with an upgrade prompt.

interface Props {
  children: React.ReactNode;
  /** Short label of what they're locked out of, e.g. "advanced filters" */
  feature: string;
  /** Optional: skip the blur, just show a tiny inline lock icon */
  inline?: boolean;
  className?: string;
}

export function ProGate({ children, feature, inline, className }: Props) {
  const auth = useAuth();
  const userIsPro = isPro(auth);

  if (userIsPro) return <>{children}</>;

  if (inline) {
    return (
      <Link
        href="/upgrade"
        className={cn("inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300", className)}
      >
        <Lock size={10} /> Pro
      </Link>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none select-none blur-sm opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-surface/40 via-surface/85 to-surface backdrop-blur-[2px] rounded-2xl">
        <Link href="/upgrade" className="group flex flex-col items-center text-center px-6 py-4">
          <div className="w-10 h-10 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Lock size={16} className="text-brand" />
          </div>
          <p className="text-sm font-bold text-white mb-0.5">{feature} is a Pro feature</p>
          <p className="text-xs text-zinc-400 mb-3">Unlock with a 7-day free trial</p>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-black bg-brand px-4 py-2 rounded-pill group-hover:bg-brand-dark transition-colors">
            <Sparkles size={11} /> Try Pro free <ArrowRight size={11} />
          </span>
        </Link>
      </div>
    </div>
  );
}

// Small "PRO" pill badge to drop next to a feature label
export function ProBadge({ className }: { className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-pill bg-brand/20 text-brand border border-brand/40",
      className
    )}>
      <Sparkles size={8} /> Pro
    </span>
  );
}

// Slim banner — for top-of-page upgrade prompts on free user views
export function UpgradeBanner({ message, ctaText = "Upgrade" }: { message: string; ctaText?: string }) {
  const auth = useAuth();
  const [dismissed, setDismissed] = useState(false);
  if (isPro(auth) || dismissed) return null;

  return (
    <Link
      href="/upgrade"
      className="block mx-5 my-4 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-brand/15 via-brand/10 to-transparent border border-brand/30 hover:border-brand/60 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Sparkles size={16} className="text-brand flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white leading-tight">{message}</p>
        </div>
        <span className="text-xs font-bold text-brand flex items-center gap-1 flex-shrink-0">
          {ctaText} <ArrowRight size={11} />
        </span>
      </div>
    </Link>
  );
}
