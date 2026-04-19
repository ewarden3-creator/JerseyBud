"use client";

// Compact horizontal cannabinoid strip — designed for product card use.
// Shows THC prominently, then up to 3 minor cannabinoids as colored micro-bars.
// Reads as "this strain's potency profile" at a glance — no text labels needed.

const COLORS: Record<string, string> = {
  thc:  "#2DD4BF",   // brand teal
  cbd:  "#60A5FA",   // blue
  cbn:  "#A78BFA",   // purple
  cbg:  "#34D399",   // green
  cbc:  "#FBBF24",   // amber
  thca: "#14B8A6",
  thcv: "#F472B6",
};

interface Props {
  thcPct: number | null;
  cbdPct: number | null;
  cannabinoids: Record<string, number> | null;
  /** Compact = no labels, dense; verbose = small labels under each bar */
  variant?: "compact" | "verbose";
}

export function CannabinoidStrip({ thcPct, cbdPct, cannabinoids, variant = "compact" }: Props) {
  // Build the lineup: THC always shown, then top minor cannabinoids by value
  const items: Array<{ key: string; pct: number }> = [];
  if (thcPct != null && thcPct > 0) items.push({ key: "thc", pct: thcPct });
  if (cbdPct != null && cbdPct > 0.1) items.push({ key: "cbd", pct: cbdPct });

  // Add minors (cbn, cbg, cbc, etc.) sorted by abundance
  const minors = Object.entries(cannabinoids ?? {})
    .filter(([k, v]) => v > 0 && !["thc", "cbd", "thca", "cbda"].includes(k.toLowerCase()))
    .sort(([, a], [, b]) => b - a);
  for (const [k, v] of minors) {
    if (items.length >= 4) break;
    items.push({ key: k, pct: v });
  }

  if (items.length === 0) return null;

  // Scale: THC tends to dominate (15-30%) so use a max of ~30 for bar width
  const max = Math.max(30, ...items.map((i) => i.pct));

  return (
    <div className="flex items-end gap-1 w-full">
      {items.map((item) => {
        const widthPct = (item.pct / max) * 100;
        const color = COLORS[item.key.toLowerCase()] ?? "#71717A";
        return (
          <div key={item.key} className="flex-1 flex flex-col items-start gap-0.5 min-w-0">
            {variant === "verbose" && (
              <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider">
                {item.key}
              </span>
            )}
            <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${widthPct}%`, backgroundColor: color }}
              />
            </div>
            {variant === "verbose" && (
              <span className="text-[9px] font-bold" style={{ color }}>
                {item.pct < 1 ? item.pct.toFixed(2) : item.pct.toFixed(1)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
