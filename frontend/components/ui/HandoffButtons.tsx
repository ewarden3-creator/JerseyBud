"use client";

import { Navigation, ShoppingBag, ExternalLink } from "lucide-react";
import { directionsUrl, dispensaryDirectionsFor, productHandoffUrl, handoffLabel } from "@/lib/handoff";
import { cn } from "@/lib/utils";

// ---------- Directions ----------

interface DirectionsProps {
  lat: number;
  lng: number;
  name?: string;
  variant?: "primary" | "ghost" | "icon";
  className?: string;
}

export function DirectionsButton({ lat, lng, name, variant = "ghost", className }: DirectionsProps) {
  const url = directionsUrl(lat, lng, name);

  if (variant === "icon") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title={`Directions to ${name ?? "dispensary"}`}
        className={cn(
          "inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface-elevated hover:bg-brand/20 hover:text-brand text-zinc-400 transition-colors",
          className
        )}
      >
        <Navigation size={14} />
      </a>
    );
  }

  const base = "inline-flex items-center gap-1.5 text-sm font-semibold rounded-xl transition-colors";
  const sizes = "px-3 py-2";
  const styles = variant === "primary"
    ? "bg-brand text-black hover:bg-brand-dark"
    : "bg-surface-elevated text-zinc-300 hover:text-brand hover:bg-brand/10 border border-surface-border";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(base, sizes, styles, className)}
    >
      <Navigation size={13} />
      Directions
    </a>
  );
}

// Simpler dispensary-aware variant — pulls lat/lng off the dispensary
export function DispensaryDirectionsButton({
  dispensary,
  variant,
  className,
}: { dispensary: DispensaryOut; variant?: "primary" | "ghost" | "icon"; className?: string }) {
  if (dispensary.lat == null || dispensary.lng == null) return null;
  return (
    <DirectionsButton
      lat={dispensary.lat}
      lng={dispensary.lng}
      name={dispensary.name}
      variant={variant}
      className={className}
    />
  );
}

// ---------- Reserve / Find on Menu hand-off ----------

interface HandoffProps {
  product: ProductOut;
  variant?: "primary" | "ghost";
  className?: string;
}

export function HandoffButton({ product, variant = "primary", className }: HandoffProps) {
  const url = productHandoffUrl(product);
  if (!url) return null;
  const label = handoffLabel(product);

  const base = "inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-xl transition-colors";
  const sizes = "px-3 py-2";
  const styles = variant === "primary"
    ? "bg-brand text-black hover:bg-brand-dark"
    : "bg-surface-elevated text-brand border border-brand/40 hover:bg-brand/10";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(base, sizes, styles, className)}
    >
      <ShoppingBag size={13} />
      {label}
      <ExternalLink size={10} className="opacity-60" />
    </a>
  );
}

// Combined Reserve + Directions row — ideal for AI rec result cards
export function ProductActionRow({ product }: { product: ProductOut }) {
  const dispo = product.dispensary;
  return (
    <div className="flex gap-2">
      <HandoffButton product={product} variant="primary" className="flex-1" />
      {dispo.lat != null && dispo.lng != null && (
        <DispensaryDirectionsButton dispensary={dispo} variant="ghost" />
      )}
    </div>
  );
}
