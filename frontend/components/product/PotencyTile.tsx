"use client";

// Type-coded potency tile — replaces the bloom as the card's "album art".
// Reads instantly: type tint = strain class, big number = THC%,
// small label = dominant terpene. No legend required.

import { cn } from "@/lib/utils";

const TYPE_TINTS: Record<string, { from: string; to: string; ring: string; pill: string }> = {
  sativa: {
    from: "from-amber-500/30",
    to:   "to-amber-700/10",
    ring: "border-amber-500/30",
    pill: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  },
  indica: {
    from: "from-violet-500/30",
    to:   "to-violet-700/10",
    ring: "border-violet-500/30",
    pill: "bg-violet-500/20 text-violet-400 border-violet-500/40",
  },
  hybrid: {
    from: "from-brand/30",
    to:   "to-brand/5",
    ring: "border-brand/30",
    pill: "bg-brand/20 text-brand border-brand/40",
  },
  cbd: {
    from: "from-blue-500/30",
    to:   "to-blue-700/10",
    ring: "border-blue-500/30",
    pill: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  },
};

function topTerpene(terpenes: Record<string, number> | null): string | null {
  if (!terpenes) return null;
  const entries = Object.entries(terpenes).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
  return entries[0]?.[0] ?? null;
}

function friendlyTerp(name: string): string {
  return name
    .replace(/^(alpha|beta)[\s_]*/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  productType: string | null;
  thcPct: number | null;
  cbdPct: number | null;
  terpenes: Record<string, number> | null;
  size?: number;
  className?: string;
}

export function PotencyTile({ productType, thcPct, cbdPct, terpenes, size = 110, className }: Props) {
  const tint = TYPE_TINTS[productType ?? ""] ?? TYPE_TINTS.hybrid;
  const isCbdDominant = (cbdPct ?? 0) > (thcPct ?? 0) * 0.5;
  const headlinePct = isCbdDominant ? cbdPct : thcPct;
  const headlineLabel = isCbdDominant ? "CBD" : "THC";
  const topTerp = topTerpene(terpenes);

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden flex flex-col items-center justify-center",
        "bg-gradient-to-br", tint.from, tint.to,
        "border", tint.ring,
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Big potency number */}
      <div className="text-center leading-none">
        <span className="font-display font-black text-white" style={{ fontSize: size * 0.32 }}>
          {headlinePct?.toFixed(0) ?? "—"}
        </span>
        <span className="font-black text-white/80 ml-0.5" style={{ fontSize: size * 0.14 }}>
          %
        </span>
      </div>
      <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-white/70 mt-0.5">
        {headlineLabel}
      </p>

      {/* Type pill — bottom */}
      {productType && (
        <div className={cn(
          "absolute bottom-1.5 px-1.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider",
          tint.pill
        )}>
          {productType[0]}
        </div>
      )}

      {/* Top terpene — top */}
      {topTerp && (
        <p className="absolute top-1.5 text-[8px] uppercase tracking-wide font-bold text-white/60 truncate max-w-[80%] text-center">
          {friendlyTerp(topTerp)}
        </p>
      )}
    </div>
  );
}
