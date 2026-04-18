"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L, { DivIcon } from "leaflet";
// leaflet CSS is loaded globally in app/globals.css to avoid SSR race

// NJ default viewport center
const NJ_CENTER: [number, number] = [40.0583, -74.4057];
const NJ_ZOOM = 8;

interface Props {
  dispensaries: DispensaryOut[];
  selectedId: number | null;
  onSelect: (d: DispensaryOut) => void;
  userLat?: number | null;
  userLng?: number | null;
}

// Re-center the map programmatically when the user moves or selects something
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.6 });
  }, [center, zoom, map]);
  return null;
}

function makePinIcon(opts: {
  isOpen: boolean | null;
  hasDeal: boolean;
  isSelected: boolean;
}): DivIcon {
  const color = opts.isSelected
    ? "#FFFFFF"
    : opts.hasDeal
      ? "#F97316"
      : opts.isOpen
        ? "#2DD4BF"
        : "#71717A";
  const size = opts.isSelected ? 32 : 24;
  const ring = opts.isSelected ? `<circle cx="16" cy="16" r="14" fill="none" stroke="#2DD4BF" stroke-width="3"/>` : "";
  const dealMark = opts.hasDeal ? `<text x="16" y="20" text-anchor="middle" font-size="11" font-weight="900" fill="#000">$</text>` : "";

  return L.divIcon({
    className: "njc-pin",
    html: `
      <svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6))">
        ${ring}
        <circle cx="16" cy="16" r="10" fill="${color}" stroke="#0a0a0a" stroke-width="2"/>
        ${dealMark}
      </svg>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function userLocationIcon(): DivIcon {
  return L.divIcon({
    className: "njc-user-pin",
    html: `
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#3B82F6" fill-opacity="0.25"/>
        <circle cx="12" cy="12" r="5" fill="#3B82F6" stroke="white" stroke-width="2"/>
      </svg>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function DispensaryMap({ dispensaries, selectedId, onSelect, userLat, userLng }: Props) {
  // Initial center: user location if available, else NJ midpoint
  const center: [number, number] = userLat && userLng ? [userLat, userLng] : NJ_CENTER;
  const zoom = userLat && userLng ? 11 : NJ_ZOOM;

  // When a dispensary is selected, fly to it
  const selected = dispensaries.find((d) => d.id === selectedId);
  const flyTarget: [number, number] | null = selected?.lat && selected?.lng ? [selected.lat, selected.lng] : null;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%", background: "#0a0a0a" }}
      scrollWheelZoom={true}
      zoomControl={false}
    >
      {/* Dark mode tiles via Carto */}
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">Carto</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      {flyTarget && <MapController center={flyTarget} zoom={14} />}

      {/* User location pin */}
      {userLat && userLng && (
        <Marker position={[userLat, userLng]} icon={userLocationIcon()} />
      )}

      {/* Dispensary pins */}
      {dispensaries
        .filter((d) => d.lat != null && d.lng != null)
        .map((d) => (
          <Marker
            key={d.id}
            position={[d.lat!, d.lng!]}
            icon={makePinIcon({
              isOpen: d.is_open_now,
              hasDeal: false,  // wire up once /map endpoint augments dispensaries with deal counts
              isSelected: d.id === selectedId,
            })}
            eventHandlers={{ click: () => onSelect(d) }}
          />
        ))}
    </MapContainer>
  );
}
