"use client";

// Terpene donut wheel — overlaid on product hero image.
// Segments are proportional to each terpene's % value.
// Consistent color per terpene across the entire app.

const TERPENE_COLORS: Record<string, string> = {
  myrcene:              "#F97316",
  "beta myrcene":       "#F97316",
  beta_myrcene:         "#F97316",
  caryophyllene:        "#8B5CF6",
  "beta caryophyllene": "#8B5CF6",
  beta_caryophyllene:   "#8B5CF6",
  limonene:             "#EAB308",
  "alpha pinene":       "#22C55E",
  alpha_pinene:         "#22C55E",
  "beta pinene":        "#16A34A",
  beta_pinene:          "#16A34A",
  linalool:             "#EC4899",
  "alpha humulene":     "#A78BFA",
  alpha_humulene:       "#A78BFA",
  terpinolene:          "#06B6D4",
  ocimene:              "#84CC16",
  "alpha bisabolol":    "#F472B6",
  alpha_bisabolol:      "#F472B6",
  valencene:            "#FB923C",
  nerolidol:            "#34D399",
  geraniol:             "#FBBF24",
  camphene:             "#94A3B8",
  guaiol:               "#67E8F9",
};

function getTerpColor(name: string): string {
  return TERPENE_COLORS[name.toLowerCase()] ?? "#6B7280";
}

interface Props {
  terpenes: Record<string, number>;
  totalPct: number | null;
  size?: number;
}

export function TerpeneDonut({ terpenes, totalPct, size = 100 }: Props) {
  const entries = Object.entries(terpenes)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  if (entries.length === 0) return null;

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const innerR = size * 0.27;
  const gap = 0.03; // radians gap between segments

  // Build SVG arc paths
  let angle = -Math.PI / 2;
  const segments = entries.map(([name, val]) => {
    const sweep = (val / total) * (Math.PI * 2) - gap;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + sweep);
    const y2 = cy + r * Math.sin(angle + sweep);
    const ix1 = cx + innerR * Math.cos(angle);
    const iy1 = cy + innerR * Math.sin(angle);
    const ix2 = cx + innerR * Math.cos(angle + sweep);
    const iy2 = cy + innerR * Math.sin(angle + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1}`,
      "Z",
    ].join(" ");
    angle += sweep + gap;
    return { name, val, d, color: getTerpColor(name) };
  });

  const label = totalPct != null
    ? `${totalPct.toFixed(2)}%`
    : `${total.toFixed(2)}%`;

  const fontSize = size * 0.13;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`Terpene profile: ${entries.map(([n, v]) => `${n} ${v}%`).join(", ")}`}
    >
      {segments.map((seg) => (
        <path key={seg.name} d={seg.d} fill={seg.color} opacity={0.95} />
      ))}
      {/* inner dark circle */}
      <circle cx={cx} cy={cy} r={innerR - 1} fill="#141414" />
      <text
        x={cx}
        y={cy + fontSize * 0.35}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="700"
        fill="white"
        fontFamily="system-ui"
      >
        {label}
      </text>
    </svg>
  );
}

// Legend strip for product detail page
export function TerpeneLegend({ terpenes }: { terpenes: Record<string, number> }) {
  const entries = Object.entries(terpenes)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([name, val]) => (
        <div key={name} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: getTerpColor(name) }}
          />
          <span className="text-xs text-zinc-300 capitalize">
            {name.replace(/_/g, " ")}
          </span>
          <span className="text-xs text-zinc-500">{val.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}
