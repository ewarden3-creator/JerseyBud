"use client";

// Cross-NJ price heatmap for a specific strain at a specific weight.
// Each pin is a price chip — color-graded green (cheapest) → amber → red (priciest).
// User can see at a glance which dispensaries have the best price.

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

const NJ_CENTER: [number, number] = [40.0583, -74.4057];
const NJ_ZOOM = 8;

interface Props {
  comparisons: PriceCompareEntry[];
  selectedWeight: string;
  onPick?: (entry: PriceCompareEntry) => void;
  userLat?: number | null;
  userLng?: number | null;
}

// Linear color gradient: green → amber → red
function priceColor(price: number, min: number, max: number): string {
  if (max === min) return "#10B981";
  const t = (price - min) / (max - min);
  if (t < 0.5) {
    // Green to amber
    const k = t * 2;
    const r = Math.round(0x10 + (0xF5 - 0x10) * k);
    const g = Math.round(0xB9 + (0x9E - 0xB9) * k);
    const b = Math.round(0x81 + (0x0B - 0x81) * k);
    return `rgb(${r},${g},${b})`;
  }
  const k = (t - 0.5) * 2;
  const r = Math.round(0xF5 + (0xEF - 0xF5) * k);
  const g = Math.round(0x9E + (0x44 - 0x9E) * k);
  const b = Math.round(0x0B + (0x44 - 0x0B) * k);
  return `rgb(${r},${g},${b})`;
}

function priceChipIcon(price: number, color: string, isCheapest: boolean) {
  const ring = isCheapest ? `box-shadow: 0 0 0 3px rgba(16,185,129,0.5);` : "";
  return L.divIcon({
    className: "njc-heatpin",
    html: `
      <div style="
        background: ${color};
        color: #0a0a0a;
        font-weight: 900;
        font-size: 13px;
        padding: 4px 10px;
        border-radius: 999px;
        border: 2px solid #0a0a0a;
        white-space: nowrap;
        font-family: system-ui;
        ${ring}
      ">
        $${price.toFixed(0)}
      </div>
    `,
    iconSize: [60, 28],
    iconAnchor: [30, 14],
  });
}

function userIcon() {
  return L.divIcon({
    html: `
      <svg width="22" height="22" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#3B82F6" fill-opacity="0.25"/>
        <circle cx="12" cy="12" r="5" fill="#3B82F6" stroke="white" stroke-width="2"/>
      </svg>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export function StrainHeatmap({ comparisons, selectedWeight, onPick, userLat, userLng }: Props) {
  // Pull the price for the selected weight from each entry
  const points = useMemo(() => {
    return comparisons
      .map((c) => {
        const entry = c.pricing.find((p) => p.weight === selectedWeight);
        if (!entry || c.dispensary_lat == null || c.dispensary_lng == null) return null;
        return { c, price: entry.price, lat: c.dispensary_lat, lng: c.dispensary_lng };
      })
      .filter(Boolean) as { c: PriceCompareEntry; price: number; lat: number; lng: number }[];
  }, [comparisons, selectedWeight]);

  if (points.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-2xl py-12 text-center">
        <p className="text-zinc-500 text-sm">No {selectedWeight} pricing data to map.</p>
      </div>
    );
  }

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  // Compute bounds to fit all pins
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const bounds = L.latLngBounds(
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)]
  ).pad(0.2);

  return (
    <div className="rounded-2xl overflow-hidden border border-surface-border bg-surface-card">
      <div className="h-[400px]">
        <MapContainer
          bounds={bounds}
          style={{ height: "100%", width: "100%", background: "#0a0a0a" }}
          scrollWheelZoom
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">Carto</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />
          {userLat && userLng && (
            <Marker position={[userLat, userLng]} icon={userIcon()} />
          )}
          {points.map((p) => (
            <Marker
              key={p.c.product_id}
              position={[p.lat, p.lng]}
              icon={priceChipIcon(p.price, priceColor(p.price, min, max), p.price === min)}
              eventHandlers={onPick ? { click: () => onPick(p.c) } : {}}
            />
          ))}
        </MapContainer>
      </div>

      {/* Heatmap legend */}
      <div className="px-4 py-3 border-t border-surface-border flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
          Price for {selectedWeight}
        </span>
        <div className="flex-1 h-2 rounded-full overflow-hidden bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500" />
        <span className="text-[11px] text-emerald-400 font-bold">${min.toFixed(0)}</span>
        <span className="text-[11px] text-zinc-500">→</span>
        <span className="text-[11px] text-red-400 font-bold">${max.toFixed(0)}</span>
      </div>
    </div>
  );
}
