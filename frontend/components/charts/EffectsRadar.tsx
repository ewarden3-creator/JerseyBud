"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

// Companion to TerpeneRadar — shows the strain's effect profile.
// Effects are 0-1 booleans from the scrape, but we infer relative weights
// from how often each effect appears across batches/products of the same strain.
const COMMON_EFFECTS = [
  "relaxed",
  "happy",
  "euphoric",
  "uplifted",
  "creative",
  "focused",
  "energetic",
  "sleepy",
  "hungry",
];

const FRIENDLY: Record<string, string> = {
  relaxed:   "Relaxed",
  happy:     "Happy",
  euphoric:  "Euphoric",
  uplifted:  "Uplifted",
  creative:  "Creative",
  focused:   "Focused",
  energetic: "Energetic",
  sleepy:    "Sleepy",
  hungry:    "Hungry",
};

interface Props {
  /** Either a list of effect strings, or a record of effect → weight (0-1) */
  effects: string[] | Record<string, number>;
  size?: number;
}

export function EffectsRadar({ effects, size = 260 }: Props) {
  // Build a uniform record {effect: weight}
  let weights: Record<string, number> = {};
  if (Array.isArray(effects)) {
    for (const e of effects) weights[e.toLowerCase()] = 1;
  } else {
    for (const [k, v] of Object.entries(effects)) weights[k.toLowerCase()] = v;
  }

  const data = COMMON_EFFECTS.map((e) => ({
    effect: FRIENDLY[e],
    value: weights[e] ?? 0,
  }));

  if (data.every((d) => d.value === 0)) return null;

  return (
    <div style={{ height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="#27272A" />
          <PolarAngleAxis dataKey="effect" tick={{ fill: "#71717A", fontSize: 11 }} />
          <Radar
            name="Effects"
            dataKey="value"
            stroke="#A78BFA"
            fill="#A78BFA"
            fillOpacity={0.35}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#A1A1AA" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
