"use client";

// "Strain Bloom" — our take on the Leafly cult-classic strain visualization.
// Center shape: diamond if THC-dominant, circle if CBD-dominant.
// 3 concentric rings sized & colored by the top 3 terpenes.
// Each strain gets a unique generative bloom — instantly distinguishable.

const TERP_COLORS: Record<string, string> = {
  myrcene:              "#F97316",
  "beta myrcene":       "#F97316",
  beta_myrcene:         "#F97316",
  caryophyllene:        "#8B5CF6",
  "beta caryophyllene": "#8B5CF6",
  beta_caryophyllene:   "#8B5CF6",
  limonene:             "#EAB308",
  pinene:               "#22C55E",
  "alpha pinene":       "#22C55E",
  alpha_pinene:         "#22C55E",
  "beta pinene":        "#16A34A",
  beta_pinene:          "#16A34A",
  linalool:             "#EC4899",
  humulene:             "#A78BFA",
  "alpha humulene":     "#A78BFA",
  alpha_humulene:       "#A78BFA",
  terpinolene:          "#06B6D4",
  ocimene:              "#84CC16",
  bisabolol:            "#F472B6",
  "alpha bisabolol":    "#F472B6",
  alpha_bisabolol:      "#F472B6",
  valencene:            "#FB923C",
  nerolidol:            "#34D399",
  geraniol:             "#FBBF24",
  camphene:             "#94A3B8",
};

const DEFAULT = "#52525B";

function terpColor(name: string): string {
  return TERP_COLORS[name.toLowerCase()] ?? DEFAULT;
}

function friendlyName(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  terpenes: Record<string, number>;
  thcPct: number | null;
  cbdPct: number | null;
  /** Total terpene % to display in center label */
  totalTerpenes?: number | null;
  size?: number;
  /** Show the 3 terpene names labeled around the bloom */
  showLabels?: boolean;
}

export function StrainBloom({
  terpenes, thcPct, cbdPct, totalTerpenes,
  size = 260, showLabels = true,
}: Props) {
  // Top 3 terpenes by value
  const top3 = Object.entries(terpenes ?? {})
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (top3.length === 0) return null;

  const cx = size / 2;
  const cy = size / 2;

  // Three concentric rings: outer (primary), mid (secondary), inner (tertiary)
  // Sized so the primary dominates — this is the visual "this strain is X-forward"
  const R_OUTER = size * 0.46;
  const R_MID   = size * 0.34;
  const R_INNER = size * 0.22;

  // Ring stroke widths so each ring reads as a distinct band
  const W_OUTER = 16;
  const W_MID   = 14;
  const W_INNER = 12;

  // Center shape: diamond for THC-dominant, circle for CBD-dominant
  const isCbdDominant = (cbdPct ?? 0) > (thcPct ?? 0) * 0.5;
  const centerColor = isCbdDominant ? "#60A5FA" : "#2DD4BF";
  const centerSize = size * 0.13;

  // Ring values are PROPORTIONAL to terpene value — primary/secondary/tertiary
  // visually scale with their share of the top 3 (not absolute %)
  const total = top3.reduce((s, [, v]) => s + v, 0);
  const ringFill = (val: number) => Math.max(0.25, val / total) * Math.PI * 2;

  // Build animated stroke arcs (using stroke-dasharray for the "fill" amount)
  function arcDash(circumference: number, val: number, totalRing: number): string {
    const filled = Math.max(0.18, val / totalRing) * circumference;
    return `${filled} ${circumference - filled}`;
  }

  const cOuter = 2 * Math.PI * R_OUTER;
  const cMid   = 2 * Math.PI * R_MID;
  const cInner = 2 * Math.PI * R_INNER;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label={`${top3.map(([n]) => n).join(", ")} dominant strain`}
      >
        {/* Faint backing rings for context */}
        <circle cx={cx} cy={cy} r={R_OUTER} fill="none" stroke="#1F1F23" strokeWidth={W_OUTER} />
        <circle cx={cx} cy={cy} r={R_MID}   fill="none" stroke="#1F1F23" strokeWidth={W_MID} />
        <circle cx={cx} cy={cy} r={R_INNER} fill="none" stroke="#1F1F23" strokeWidth={W_INNER} />

        {/* Outer ring — primary terpene */}
        <circle
          cx={cx} cy={cy} r={R_OUTER} fill="none"
          stroke={terpColor(top3[0][0])} strokeWidth={W_OUTER}
          strokeDasharray={arcDash(cOuter, top3[0][1], total)}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* Mid ring — secondary terpene */}
        {top3[1] && (
          <circle
            cx={cx} cy={cy} r={R_MID} fill="none"
            stroke={terpColor(top3[1][0])} strokeWidth={W_MID}
            strokeDasharray={arcDash(cMid, top3[1][1], total)}
            strokeLinecap="round"
            transform={`rotate(-30 ${cx} ${cy})`}
          />
        )}

        {/* Inner ring — tertiary terpene */}
        {top3[2] && (
          <circle
            cx={cx} cy={cy} r={R_INNER} fill="none"
            stroke={terpColor(top3[2][0])} strokeWidth={W_INNER}
            strokeDasharray={arcDash(cInner, top3[2][1], total)}
            strokeLinecap="round"
            transform={`rotate(120 ${cx} ${cy})`}
          />
        )}

        {/* Center shape — diamond for THC, circle for CBD */}
        {isCbdDominant ? (
          <circle cx={cx} cy={cy} r={centerSize} fill={centerColor} />
        ) : (
          <rect
            x={cx - centerSize}
            y={cy - centerSize}
            width={centerSize * 2}
            height={centerSize * 2}
            fill={centerColor}
            transform={`rotate(45 ${cx} ${cy})`}
          />
        )}

        {/* Center potency label */}
        <text
          x={cx} y={cy + 4}
          textAnchor="middle"
          fill="#000"
          fontSize={centerSize * 0.55}
          fontWeight="900"
          fontFamily="system-ui"
        >
          {(isCbdDominant ? cbdPct : thcPct)?.toFixed(0)}
        </text>
      </svg>

      {/* Terpene labels positioned around the bloom */}
      {showLabels && (
        <div className="absolute inset-0 pointer-events-none">
          {top3.map(([name, val], i) => {
            // Distribute labels: top, bottom-right, bottom-left
            const angles = [-90, 30, 150];
            const dist = R_OUTER + 22;
            const angle = (angles[i] * Math.PI) / 180;
            const x = cx + dist * Math.cos(angle);
            const y = cy + dist * Math.sin(angle);
            return (
              <div
                key={name}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center"
                style={{ left: x, top: y }}
              >
                <span
                  className="w-2 h-2 rounded-full mb-1"
                  style={{ backgroundColor: terpColor(name) }}
                />
                <span className="text-[10px] font-semibold text-white whitespace-nowrap">
                  {friendlyName(name)}
                </span>
                <span className="text-[9px] text-zinc-500">{val.toFixed(2)}%</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Total terpenes badge */}
      {totalTerpenes != null && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-surface-elevated border border-surface-border px-3 py-1 rounded-pill">
          <span className="text-xs text-zinc-400">Terps </span>
          <span className="text-xs font-bold text-orange-400">{totalTerpenes.toFixed(2)}%</span>
        </div>
      )}
    </div>
  );
}
