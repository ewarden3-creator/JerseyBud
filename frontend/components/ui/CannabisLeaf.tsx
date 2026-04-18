"use client";

// Cannabis fan leaf — using Material Design Icons' "cannabis" path.
// MDI is Apache 2.0 licensed; the path is a properly drawn 7-leaflet
// fan with stem.

interface Props {
  size?: number;
  className?: string;
  color?: string;
  /** When true, draws a subtle inner stem-vein highlight for texture */
  detailed?: boolean;
}

export function CannabisLeaf({ size = 48, className, color, detailed }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color ?? "currentColor"}
      className={className}
      aria-label="Cannabis leaf"
    >
      <path d="M11.5 22v-4.65c-.5.78-1.5 1.74-3.47 2.46c0 0 .5-1.71 1.91-2.86c-1.3.28-3.26.24-5.94-.95c0 0 2.47-1.41 5.28-1.03C7.69 14 5.7 12.08 4.17 8.11c0 0 4.5 1.23 6.74 5.03C8.88 8.24 12 2 12 2c2.43 5.47 1.91 9.1 1.12 11.1c2.25-3.77 6.71-4.99 6.71-4.99c-1.53 3.97-3.52 5.89-5.11 6.86C17.53 14.59 20 16 20 16c-2.68 1.19-4.64 1.23-5.94.95c1.41 1.15 1.91 2.86 1.91 2.86c-1.97-.72-2.97-1.68-3.47-2.46V22z" />
      {detailed && (
        // Subtle vein line down the center of each leaflet for botanical detail
        <g stroke="currentColor" strokeWidth="0.15" opacity="0.4" fill="none">
          <line x1="12" y1="2"   x2="12" y2="14" />     {/* center vein */}
          <line x1="12" y1="14"  x2="6"  y2="11" />     {/* upper-left  */}
          <line x1="12" y1="14"  x2="18" y2="11" />     {/* upper-right */}
          <line x1="12" y1="15"  x2="5"  y2="16" />     {/* mid-left    */}
          <line x1="12" y1="15"  x2="19" y2="16" />     {/* mid-right   */}
          <line x1="12" y1="16"  x2="7"  y2="19.5" />   {/* lower-left  */}
          <line x1="12" y1="16"  x2="17" y2="19.5" />   {/* lower-right */}
        </g>
      )}
    </svg>
  );
}

// SVG-grain noise overlay — encoded as a data URL so it composites
// over any background. Adds subtle film-grain texture to flat gradients.
const NOISE_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
    <filter id='n'>
      <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
      <feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.4 0'/>
    </filter>
    <rect width='100%' height='100%' filter='url(#n)' opacity='0.5'/>
  </svg>`
)}")`;

const TYPE_GRADIENTS: Record<string, [string, string]> = {
  sativa: ["#F97316", "#7C2D12"],
  indica: ["#7C3AED", "#2E1065"],
  hybrid: ["#14B8A6", "#134E4A"],
  cbd:    ["#3B82F6", "#1E3A8A"],
};

const TYPE_LEAF_COLOR: Record<string, string> = {
  sativa: "#FED7AA",
  indica: "#DDD6FE",
  hybrid: "#A7F3D0",
  cbd:    "#BFDBFE",
};

interface PlaceholderProps {
  productType?: string | null;
  strainName?: string | null;
  className?: string;
}

export function ProductPlaceholder({ productType, className }: PlaceholderProps) {
  const grad = TYPE_GRADIENTS[productType ?? ""] ?? ["#3F3F46", "#18181B"];
  const leafColor = TYPE_LEAF_COLOR[productType ?? ""] ?? "#71717A";

  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{
        background: `radial-gradient(circle at 25% 20%, ${grad[0]}, ${grad[1]} 75%)`,
      }}
    >
      {/* Noise grain overlay */}
      <div
        className="absolute inset-0 mix-blend-soft-light pointer-events-none"
        style={{ backgroundImage: NOISE_URL, opacity: 0.5 }}
      />

      {/* Faint inner vignette to add depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: "inset 0 0 80px 0 rgba(0,0,0,0.45)" }}
      />

      {/* Leaf — slightly offset shadow + main */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Soft drop shadow leaf */}
        <CannabisLeaf
          size={104}
          color="#000"
          className="absolute opacity-25 blur-md translate-x-[2px] translate-y-[3px]"
        />
        {/* Main leaf with vein detail */}
        <CannabisLeaf
          size={100}
          color={leafColor}
          detailed
          className="relative opacity-60"
        />
      </div>
    </div>
  );
}
