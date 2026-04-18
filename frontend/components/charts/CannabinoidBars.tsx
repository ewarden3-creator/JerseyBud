"use client";

const COLORS: Record<string, string> = {
  thc: "#2DD4BF", thca: "#14B8A6", d9: "#0D9488",
  cbd: "#60A5FA", cbda: "#3B82F6",
  cbn: "#A78BFA", cbna: "#8B5CF6",
  cbg: "#34D399", cbga: "#10B981",
  cbc: "#FBBF24", cbca: "#F59E0B",
  thcv: "#F472B6", thcva: "#EC4899",
};

export function CannabinoidBars({ cannabinoids }: { cannabinoids: Record<string, number> }) {
  const entries = Object.entries(cannabinoids)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  if (!entries.length) return null;
  const max = entries[0][1];

  return (
    <div className="space-y-1.5 mb-3">
      {entries.map(([name, val]) => (
        <div key={name} className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 uppercase w-10 flex-shrink-0">{name}</span>
          <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(val / max) * 100}%`,
                backgroundColor: COLORS[name.toLowerCase()] ?? "#6B7280",
              }}
            />
          </div>
          <span className="text-xs text-zinc-400 w-10 text-right flex-shrink-0">{val.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}
