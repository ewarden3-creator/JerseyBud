"use client";

// "Jersey Bud" — Exit Sign brand mark, refined.
// Riffs on NJ Department of Transportation exit signage:
// dark forest green + amber/yellow accent, white sans-serif type,
// rounded rectangle with optional EXIT tab.

const NJ_GREEN_DARK   = "#0A2E20";
const NJ_GREEN_MID    = "#143F2C";
const NJ_AMBER        = "#FFC83D";
const SIGN_WHITE      = "#F5F5F0";

interface MarkProps {
  size?: number;
  className?: string;
}

// ============================================================
// Variant A — Square highway sign with EXIT tab inset
// Compact, works as a favicon, app icon, or single-letter mark
// ============================================================
export function ExitSignMark({ size = 80, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-label="Jersey Bud"
    >
      <defs>
        <linearGradient id="jb-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={NJ_GREEN_MID} />
          <stop offset="100%" stopColor={NJ_GREEN_DARK} />
        </linearGradient>
      </defs>

      {/* Rounded square sign body */}
      <rect x="4" y="4" width="92" height="92" rx="18" fill="url(#jb-bg)" />

      {/* Inner border — emulates the white reflective stripe on highway signs */}
      <rect
        x="9" y="9" width="82" height="82" rx="14"
        fill="none" stroke={SIGN_WHITE} strokeWidth="1.5" strokeOpacity="0.9"
      />

      {/* EXIT tab — small amber pill at top-left */}
      <rect x="14" y="14" width="32" height="14" rx="3" fill={NJ_AMBER} />
      <text
        x="30" y="24" textAnchor="middle"
        fill={NJ_GREEN_DARK} fontSize="9" fontWeight="900"
        fontFamily="system-ui" letterSpacing="1.5"
      >
        EXIT
      </text>

      {/* Main "BUD" type */}
      <text
        x="50" y="68" textAnchor="middle"
        fill={SIGN_WHITE} fontSize="32" fontWeight="900"
        fontFamily="'Helvetica Neue', system-ui" letterSpacing="-0.5"
      >
        BUD
      </text>

      {/* Tiny route shield accent (optional) — small "NJ" pill bottom-right */}
      <rect x="64" y="80" width="22" height="10" rx="2" fill={SIGN_WHITE} />
      <text
        x="75" y="88" textAnchor="middle"
        fill={NJ_GREEN_DARK} fontSize="7" fontWeight="900"
        fontFamily="system-ui" letterSpacing="0.5"
      >
        NJ
      </text>
    </svg>
  );
}

// ============================================================
// Variant B — Shield-shaped GSP route marker
// More iconic; references the actual Garden State Parkway shield
// ============================================================
export function ShieldMark({ size = 80, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
    >
      <defs>
        <linearGradient id="jb-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={NJ_GREEN_MID} />
          <stop offset="100%" stopColor={NJ_GREEN_DARK} />
        </linearGradient>
      </defs>
      {/* GSP shield shape — rounded-top rectangle */}
      <path
        d="M14 28 Q14 6 50 6 Q86 6 86 28 L86 80 Q86 94 72 94 L28 94 Q14 94 14 80 Z"
        fill="url(#jb-shield)"
        stroke={NJ_AMBER}
        strokeWidth="2.5"
      />
      <text
        x="50" y="36" textAnchor="middle"
        fill={NJ_AMBER} fontSize="9" fontWeight="900"
        fontFamily="system-ui" letterSpacing="2.5"
      >
        JERSEY
      </text>
      <text
        x="50" y="74" textAnchor="middle"
        fill={SIGN_WHITE} fontSize="36" fontWeight="900"
        fontFamily="'Helvetica Neue', system-ui" letterSpacing="-1"
      >
        BUD
      </text>
    </svg>
  );
}

// ============================================================
// Variant C — Horizontal highway sign with full "JERSEY BUD"
// For wider lockups: header bars, marketing banners
// ============================================================
export function HighwayBanner({ size = 80, className }: MarkProps) {
  const w = size * 2.2;
  return (
    <svg
      width={w}
      height={size}
      viewBox={`0 0 220 100`}
      className={className}
    >
      <defs>
        <linearGradient id="jb-banner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={NJ_GREEN_MID} />
          <stop offset="100%" stopColor={NJ_GREEN_DARK} />
        </linearGradient>
      </defs>
      <rect x="2" y="10" width="216" height="80" rx="10" fill="url(#jb-banner)" />
      <rect
        x="6" y="14" width="208" height="72" rx="6"
        fill="none" stroke={SIGN_WHITE} strokeWidth="1.5" strokeOpacity="0.85"
      />
      {/* Exit tab on the left */}
      <rect x="14" y="22" width="38" height="20" rx="3" fill={NJ_AMBER} />
      <text
        x="33" y="36" textAnchor="middle"
        fill={NJ_GREEN_DARK} fontSize="11" fontWeight="900"
        fontFamily="system-ui" letterSpacing="1.5"
      >
        EXIT
      </text>
      {/* Wordmark */}
      <text
        x="60" y="65" textAnchor="start"
        fill={SIGN_WHITE} fontSize="38" fontWeight="900"
        fontFamily="'Helvetica Neue', system-ui" letterSpacing="-1"
      >
        Jersey Bud
      </text>
    </svg>
  );
}

// ============================================================
// Wordmark lockups — mark + type for headers and marketing
// ============================================================

export function JerseyBudLockup({ markSize = 56 }: { markSize?: number }) {
  return (
    <div className="inline-flex items-center gap-3">
      <ExitSignMark size={markSize} />
      <div className="flex flex-col leading-none">
        <span className="text-[9px] font-black tracking-[0.22em] text-[#FFC83D] uppercase">
          The Garden State
        </span>
        <span className="font-display font-black text-[28px] text-white tracking-tight mt-0.5">
          Jersey Bud
        </span>
      </div>
    </div>
  );
}

export function JerseyBudLockupCompact({ markSize = 32 }: { markSize?: number }) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <ExitSignMark size={markSize} />
      <span className="font-display font-black text-xl text-white tracking-tight leading-none">
        Jersey Bud
      </span>
    </div>
  );
}
