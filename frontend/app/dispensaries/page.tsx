"use client";

import { useState } from "react";
import useSWR from "swr";
import { MapPin, Clock, Truck, Accessibility, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { cn } from "@/lib/utils";
import Link from "next/link";

function HoursBadge({ d }: { d: DispensaryOut }) {
  if (d.is_open_now === null) return null;
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const dayIdx = new Date().getDay(); // 0=Sun
  const todayKey = days[dayIdx === 0 ? 6 : dayIdx - 1];
  const todayHours = d.hours?.[todayKey];

  return (
    <span className={cn(
      "text-xs font-semibold",
      d.is_open_now ? "text-emerald-400" : "text-red-400"
    )}>
      {d.is_open_now ? "OPEN" : "CLOSED"}
      {todayHours && d.is_open_now && (
        <span className="text-zinc-500 font-normal"> · Closes {todayHours.split("-")[1]?.trim()}</span>
      )}
    </span>
  );
}

function DispensaryRow({ d }: { d: DispensaryOut }) {
  return (
    <Link href={`/dispensaries/${d.slug}`}>
      <div className="bg-surface-card border border-surface-border rounded-2xl p-4 hover:border-brand/40 transition-colors">
        <div className="flex gap-3">
          {/* Logo */}
          <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0 overflow-hidden">
            {d.logo_url ? (
              <img src={d.logo_url} alt={d.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">🏪</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-white text-sm leading-tight">{d.name}</h3>
              <HoursBadge d={d} />
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{d.city}, NJ</p>

            {/* Distance + amenity chips */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {d.distance_miles !== null && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <MapPin size={10} /> {d.distance_miles.toFixed(1)} mi
                </span>
              )}
              {d.delivery && (
                <span className="flex items-center gap-1 text-xs text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded-pill">
                  <Truck size={9} /> Delivery
                </span>
              )}
              {d.wheelchair_accessible && (
                <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-pill">
                  <Accessibility size={9} /> Accessible
                </span>
              )}
              {d.medical && (
                <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-pill">Medical</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function DispensariesPage() {
  const { lat, lng } = useLocation();
  const [search, setSearch] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [delivery, setDelivery] = useState(false);

  const { data: dispensaries } = useSWR(
    ["dispensaries", lat, lng, openNow, delivery],
    () => api.dispensaries({
      ...(lat ? { lat: String(lat), lng: String(lng) } : {}),
      ...(openNow ? { open_now: "true" } : {}),
      ...(delivery ? { delivery: "true" } : {}),
    })
  );

  const filtered = dispensaries?.filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.city.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <h1 className="font-display font-bold text-2xl text-white mb-4">NJ Dispensaries</h1>

        {/* Search */}
        <div className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-xl px-3 py-2 mb-3">
          <Search size={14} className="text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or city…"
            className="flex-1 bg-transparent text-white text-sm placeholder:text-zinc-600 outline-none"
          />
        </div>

        {/* Quick filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setOpenNow(!openNow)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-2 rounded-pill border font-semibold transition-colors",
              openNow ? "border-emerald-500 text-emerald-400 bg-emerald-500/10" : "border-surface-border text-zinc-500"
            )}
          >
            <Clock size={11} /> Open Now
          </button>
          <button
            onClick={() => setDelivery(!delivery)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-2 rounded-pill border font-semibold transition-colors",
              delivery ? "border-teal-500 text-teal-400 bg-teal-500/10" : "border-surface-border text-zinc-500"
            )}
          >
            <Truck size={11} /> Delivery
          </button>
        </div>
      </div>

      <div className="px-4 space-y-2">
        {filtered.map((d) => <DispensaryRow key={d.id} d={d} />)}
        {filtered.length === 0 && (
          <p className="text-center text-zinc-500 py-12 text-sm">No dispensaries found.</p>
        )}
      </div>
    </div>
  );
}
