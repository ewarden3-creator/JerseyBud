"use client";

// The single canonical visualization for a strain.
// Donut shows top 3 terpenes as colored segments (proportional).
// Center shows THC % (or CBD% if CBD-dominant).
// Same colors used in the matching <TerpenePill /> and <TerpeneLegend />.

import { terpColor, friendlyTerp } from "@/lib/terpeneColors";
import { cn } from "@/lib/utils";

interface DonutProps {
  terpenes: Record<string, number> | null;
  thcPct: number | null;
  cbdPct?: number | null;
  size?: number;
  /** Show terpene labels around the perimeter (only readable at large sizes) */
  showLabels?: boolean;
  className?: string;
}

export function TerpeneDonut({
  terpenes, thcPct, cbdPct = null, size = 110, showLabels = false, className,
}: DonutProps) {
  const top3 = Object.entries(terpenes ?? {})
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const strokeWidth = size * 0.16;

  // Center label
  const isCbdDominant = (cbdPct ?? 0) > (thcPct ?? 0) * 0.5;
  const centerNum = isCbdDominant ? cbdPct : thcPct;
  const centerLabel = isCbdDominant ? "CBD" : "THC";

  // If no terps, just draw a soft brand ring with the THC % inside
  if (top3.length === 0) {
    return (
      <div className={cn("relative", className)} style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#27272A" strokeWidth={strokeWidth} />
          {centerNum != null && <CenterLabel size={size} cx={cx} cy={cy} num={centerNum} label={centerLabel} />}
        </svg>
      </div>
    );
  }

  // Build segments with small gaps
  const total = top3.reduce((s, [, v]) => s + v, 0);
  const circumference = 2 * Math.PI * r;
  const gap = 4; // pixels between segments

  let cumulative = 0;
  const segments = top3.map(([name, val]) => {
    const pct = val / total;
    const segLen = pct * circumference - gap;
    const offset = cumulative;
    cumulative += pct * circumference;
    return {
      name,
      val,
      color: terpColor(name),
      strokeDasharray: `${segLen} ${circumference - segLen}`,
      strokeDashoffset: -offset,
    };
  });

  return (
    <div className={cn("relative inline-block", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1F1F23" strokeWidth={strokeWidth} />
        {/* Segments */}
        {segments.map((seg) => (
          <circle
            key={seg.name}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={seg.strokeDasharray}
            strokeDashoffset={seg.strokeDashoffset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      {/* Center label — outside SVG so we don't fight rotation */}
      {centerNum != null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex items-baseline gap-px leading-none">
            <span
              className="font-display font-black text-white"
              style={{ fontSize: size * 0.28, lineHeight: 1 }}
            >
              {centerNum.toFixed(0)}
            </span>
            <span
              className="font-bold text-zinc-400"
              style={{ fontSize: size * 0.13, lineHeight: 1 }}
            >
              %
            </span>
          </div>
          <span
            className="text-zinc-500 font-bold uppercase tracking-wider mt-1"
            style={{ fontSize: size * 0.085, lineHeight: 1 }}
          >
            {centerLabel}
          </span>
        </div>
      )}
    </div>
  );
}

function CenterLabel({ size, cx, cy, num, label }: { size: number; cx: number; cy: number; num: number; label: string }) {
  return (
    <>
      <text x={cx} y={cy + size * 0.04} textAnchor="middle" fill="white" fontWeight="900" fontSize={size * 0.26}>
        {num.toFixed(0)}%
      </text>
      <text x={cx} y={cy + size * 0.18} textAnchor="middle" fill="#71717A" fontWeight="700" fontSize={size * 0.09} letterSpacing={1}>
        {label}
      </text>
    </>
  );
}

// ---------- Companion: terpene legend ----------
// Use anywhere we want to expose what's in the donut. Same colors.

export function TerpeneLegend({ terpenes, max = 6 }: { terpenes: Record<string, number>; max?: number }) {
  const entries = Object.entries(terpenes)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, max);

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([name, val]) => (
        <div
          key={name}
          className="flex items-center gap-1.5 bg-surface-elevated border border-surface-border px-2 py-1 rounded-pill"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: terpColor(name) }}
          />
          <span className="text-xs text-white font-semibold">{friendlyTerp(name)}</span>
          <span className="text-[10px] text-zinc-500">{val.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}
