"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

// The Leafly-style terpene radar — every common terpene gets a spoke,
// filled area shows the strain's profile across all of them.
const COMMON_TERPENES = [
  "myrcene",
  "caryophyllene",
  "limonene",
  "pinene",
  "linalool",
  "humulene",
  "terpinolene",
  "ocimene",
];

const FRIENDLY: Record<string, string> = {
  myrcene:       "Myrcene",
  caryophyllene: "Caryophyllene",
  limonene:      "Limonene",
  pinene:        "Pinene",
  linalool:      "Linalool",
  humulene:      "Humulene",
  terpinolene:   "Terpinolene",
  ocimene:       "Ocimene",
};

function normalizeKey(k: string): string {
  return k.toLowerCase()
    .replace("alpha ", "").replace("beta ", "")
    .replace("alpha_", "").replace("beta_", "")
    .replace(/\s+/g, "");
}

interface Props {
  terpenes: Record<string, number>;
  size?: number;
}

export function TerpeneRadar({ terpenes, size = 260 }: Props) {
  // Map incoming keys to the common 8 spokes
  const norm: Record<string, number> = {};
  for (const [k, v] of Object.entries(terpenes)) {
    const nk = normalizeKey(k);
    norm[nk] = (norm[nk] ?? 0) + v;
  }

  const data = COMMON_TERPENES.map((t) => ({
    terpene: FRIENDLY[t],
    value: +(norm[t] ?? 0).toFixed(3),
  }));

  // All-zero strains — don't render an empty chart
  const max = Math.max(...data.map((d) => d.value));
  if (max === 0) return null;

  return (
    <div style={{ height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="#27272A" />
          <PolarAngleAxis
            dataKey="terpene"
            tick={{ fill: "#71717A", fontSize: 11 }}
          />
          <Radar
            name="Profile"
            dataKey="value"
            stroke="#2DD4BF"
            fill="#2DD4BF"
            fillOpacity={0.35}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#A1A1AA" }}
            formatter={(v: number) => [`${v.toFixed(2)}%`, ""]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
