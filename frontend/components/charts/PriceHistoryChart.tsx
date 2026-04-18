"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

interface Props {
  history: PriceHistoryPoint[];
  weight: string;
}

export function PriceHistoryChart({ history, weight }: Props) {
  const data = history
    .map((h) => {
      const entry = h.pricing.find((p) => p.weight === weight);
      if (!entry) return null;
      return {
        date: new Date(h.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        price: entry.price,
        sale: h.is_on_sale,
      };
    })
    .filter(Boolean)
    .reverse() as { date: string; price: number; sale: boolean }[];

  if (data.length < 2) return (
    <p className="text-zinc-500 text-sm text-center py-6">Not enough history yet.</p>
  );

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const median = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];

  return (
    <div className="w-full h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717A" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#71717A" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#A1A1AA" }}
            formatter={(v: number) => [`$${v}`, weight]}
          />
          <ReferenceLine y={median} stroke="#3F3F46" strokeDasharray="4 2" label={{ value: "median", fill: "#52525B", fontSize: 9 }} />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#2DD4BF"
            strokeWidth={2}
            fill="url(#priceGrad)"
            dot={(props) => {
              const { cx, cy, payload } = props;
              return payload.sale
                ? <circle key={`dot-${cx}`} cx={cx} cy={cy} r={4} fill="#F97316" stroke="none" />
                : <circle key={`dot-${cx}`} cx={cx} cy={cy} r={3} fill="#2DD4BF" stroke="none" />;
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-center text-xs text-zinc-600 mt-1">
        Orange dots = sale · Median ${median} · Low ${min}
      </p>
    </div>
  );
}
