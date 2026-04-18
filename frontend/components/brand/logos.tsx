"use client";

// Four logo directions for "Jersey Bud". Each exposes:
//   - <DirectionN.Mark />         — icon-only square
//   - <DirectionN.Wordmark />     — full lockup with type
// All rendered SVG so we can iterate on geometry inline.

// ---------- Shared bits ----------

function CannabisAccent({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M11.5 22v-4.65c-.5.78-1.5 1.74-3.47 2.46c0 0 .5-1.71 1.91-2.86c-1.3.28-3.26.24-5.94-.95c0 0 2.47-1.41 5.28-1.03C7.69 14 5.7 12.08 4.17 8.11c0 0 4.5 1.23 6.74 5.03C8.88 8.24 12 2 12 2c2.43 5.47 1.91 9.1 1.12 11.1c2.25-3.77 6.71-4.99 6.71-4.99c-1.53 3.97-3.52 5.89-5.11 6.86C17.53 14.59 20 16 20 16c-2.68 1.19-4.64 1.23-5.94.95c1.41 1.15 1.91 2.86 1.91 2.86c-1.97-.72-2.97-1.68-3.47-2.46V22z" />
    </svg>
  );
}


// ============================================================
// DIRECTION 1 — Display wordmark with botanical leaf accent
// Vibe: premium, considered, Cookies-brand energy refined.
// "Bud" caps the lockup; tiny leaf grows from the B's counter.
// ============================================================

function D1Mark({ size = 80 }: { size?: number }) {
  return (
    <div
      className="rounded-2xl flex items-center justify-center font-display font-black"
      style={{
        width: size, height: size,
        background: "linear-gradient(135deg, #FAF7F2 0%, #F0E9DD 100%)",
        color: "#1B3A2F",
        fontSize: size * 0.5,
      }}
    >
      <span className="relative">
        jb
        <span className="absolute -top-1 -right-3 text-[#2DD4BF]" style={{ fontSize: size * 0.16 }}>
          <CannabisAccent size={size * 0.18} />
        </span>
      </span>
    </div>
  );
}

function D1Wordmark() {
  return (
    <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-[#FAF7F2]">
      <span className="font-display font-black text-3xl text-[#1B3A2F] leading-none tracking-tight">
        jersey
      </span>
      <span className="font-display font-black text-3xl text-[#1B3A2F] leading-none tracking-tight relative">
        bud
        <CannabisAccent size={14} color="#2DD4BF" />
      </span>
    </div>
  );
}

export const Direction1 = {
  name: "Display Wordmark",
  vibe: "Premium, warm, considered. Cream + deep forest. Cannabis hint, not shouted.",
  Mark: D1Mark,
  Wordmark: D1Wordmark,
};


// ============================================================
// DIRECTION 2 — Garden State Parkway "Exit" sign
// Vibe: hyper-local, instantly NJ, fun + ownable.
// Riffs on the iconic green/yellow GSP exit shield.
// ============================================================

function D2Mark({ size = 80 }: { size?: number }) {
  // GSP shield shape — rounded triangle on top + rect bottom
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <linearGradient id="d2grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F3D2A" />
            <stop offset="100%" stopColor="#0A2E20" />
          </linearGradient>
        </defs>
        {/* shield outline */}
        <path
          d="M50 5 L90 30 L90 75 Q90 95 50 95 Q10 95 10 75 L10 30 Z"
          fill="url(#d2grad)"
          stroke="#FFD23F"
          strokeWidth="3"
        />
        <text
          x="50" y="38" textAnchor="middle"
          fill="#FFD23F" fontSize="11" fontWeight="900"
          fontFamily="system-ui" letterSpacing="2"
        >
          EXIT
        </text>
        <text
          x="50" y="68" textAnchor="middle"
          fill="white" fontSize="32" fontWeight="900"
          fontFamily="system-ui" letterSpacing="-1"
        >
          BUD
        </text>
      </svg>
    </div>
  );
}

function D2Wordmark() {
  return (
    <div className="flex items-center gap-3 px-6 py-4 rounded-2xl" style={{ background: "#0A2E20" }}>
      <D2Mark size={56} />
      <div className="flex flex-col">
        <span className="text-[10px] font-black tracking-[0.2em] text-[#FFD23F] uppercase">
          The Garden State
        </span>
        <span className="font-display font-black text-2xl text-white leading-tight">
          jersey bud
        </span>
      </div>
    </div>
  );
}

export const Direction2 = {
  name: "Exit Sign",
  vibe: "Hyper-local Jersey. GSP green + amber. Instantly recognizable to natives.",
  Mark: D2Mark,
  Wordmark: D2Wordmark,
};


// ============================================================
// DIRECTION 3 — Vintage circular badge / monogram
// Vibe: premium craft. Like a coffee bag, brewery, or boutique.
// Black + gold + small accent. Pairs with apparel/merch well.
// ============================================================

function D3Mark({ size = 80 }: { size?: number }) {
  const r = size / 2 - 2;
  const cx = size / 2;
  const arcId = `d3arc-${size}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <path id={arcId} d={`M ${cx} ${size - 8} A ${r - 6} ${r - 6} 0 1 1 ${cx - 0.01} ${size - 8}`} />
      </defs>
      {/* outer ring */}
      <circle cx={cx} cy={cx} r={r} fill="#0F0F0F" stroke="#D4A537" strokeWidth="1.5" />
      <circle cx={cx} cy={cx} r={r - 6} fill="none" stroke="#D4A537" strokeWidth="0.5" opacity="0.6" />

      {/* monogram J + B with overlap */}
      <text
        x={cx - 8} y={cx + 8} textAnchor="middle"
        fill="#D4A537" fontSize={size * 0.46} fontWeight="900"
        fontFamily="Georgia, serif" fontStyle="italic"
      >
        J
      </text>
      <text
        x={cx + 8} y={cx + 10} textAnchor="middle"
        fill="#FAF7F2" fontSize={size * 0.5} fontWeight="900"
        fontFamily="Georgia, serif" fontStyle="italic"
      >
        B
      </text>

      {/* tiny leaf at top */}
      <g transform={`translate(${cx - 5}, 6)`}>
        <CannabisAccent size={10} color="#2DD4BF" />
      </g>

      {/* curved bottom text "EST · NEW JERSEY" */}
      <text fill="#D4A537" fontSize="6" fontWeight="700" letterSpacing="2" fontFamily="system-ui">
        <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
          NEW JERSEY · EST 2026
        </textPath>
      </text>
    </svg>
  );
}

function D3Wordmark() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 rounded-2xl" style={{ background: "#0F0F0F" }}>
      <D3Mark size={64} />
      <div className="flex flex-col">
        <span className="text-[10px] font-bold tracking-[0.25em] text-[#D4A537] uppercase">
          Independent
        </span>
        <span className="font-bold text-3xl text-[#FAF7F2] leading-tight" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>
          Jersey Bud
        </span>
        <span className="text-[10px] font-bold tracking-[0.25em] text-[#D4A537] uppercase">
          Real-time NJ
        </span>
      </div>
    </div>
  );
}

export const Direction3 = {
  name: "Vintage Badge",
  vibe: "Boutique craft. Black + gold. Looks great on a hat, bag, or beer can.",
  Mark: D3Mark,
  Wordmark: D3Wordmark,
};


// ============================================================
// DIRECTION 4 — NJ state silhouette as the mark
// Vibe: clean, confident, instantly geographic. Modern brand.
// State outline holds a small bud detail in negative space.
// ============================================================

function D4Mark({ size = 80 }: { size?: number }) {
  // Simplified NJ state silhouette path (approximate, stylized)
  const NJ_PATH = "M40 5 L52 8 L58 18 L62 32 L70 48 L72 62 L66 78 L58 95 L48 92 L42 80 L36 65 L32 50 L28 38 L26 24 L30 12 Z";

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="d4bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#0F3D2A" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="20" fill="url(#d4bg)" />
      {/* NJ silhouette */}
      <path d={NJ_PATH} fill="#FAF7F2" />
      {/* Cannabis leaf knocked out as negative space, centered in NJ */}
      <g transform="translate(38, 36) scale(1.1)">
        <path
          d="M11.5 22v-4.65c-.5.78-1.5 1.74-3.47 2.46c0 0 .5-1.71 1.91-2.86c-1.3.28-3.26.24-5.94-.95c0 0 2.47-1.41 5.28-1.03C7.69 14 5.7 12.08 4.17 8.11c0 0 4.5 1.23 6.74 5.03C8.88 8.24 12 2 12 2c2.43 5.47 1.91 9.1 1.12 11.1c2.25-3.77 6.71-4.99 6.71-4.99c-1.53 3.97-3.52 5.89-5.11 6.86C17.53 14.59 20 16 20 16c-2.68 1.19-4.64 1.23-5.94.95c1.41 1.15 1.91 2.86 1.91 2.86c-1.97-.72-2.97-1.68-3.47-2.46V22z"
          fill="#0F3D2A"
        />
      </g>
    </svg>
  );
}

function D4Wordmark() {
  return (
    <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-[#0F0F0F]">
      <D4Mark size={56} />
      <div className="flex flex-col leading-none">
        <span className="font-display font-black text-3xl text-white tracking-tight">
          Jersey Bud
        </span>
        <span className="text-[10px] font-bold tracking-[0.18em] text-[#2DD4BF] uppercase mt-1">
          Live NJ menus + AI
        </span>
      </div>
    </div>
  );
}

export const Direction4 = {
  name: "State Mark",
  vibe: "Geographic confidence. NJ silhouette + bud knockout. Modern startup energy.",
  Mark: D4Mark,
  Wordmark: D4Wordmark,
};
