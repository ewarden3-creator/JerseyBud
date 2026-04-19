// Single source of truth for terpene colors. Used by the donut, the pills,
// the legend — everywhere a terpene appears, it gets the same color.
// Palette is brand-cohesive: saturated but not chaotic, 6 distinct hues.

export const TERPENE_COLOR: Record<string, string> = {
  // Common 6 — most strains have these
  myrcene:        "#F97316",   // orange · earthy, sedating
  caryophyllene:  "#A78BFA",   // lavender · peppery, spicy
  limonene:       "#FBBF24",   // gold · citrus, uplifting
  pinene:         "#34D399",   // mint · pine, focused
  linalool:       "#F472B6",   // pink · floral, calming
  humulene:       "#FB923C",   // copper · hoppy, earthy
  // Less common
  terpinolene:    "#06B6D4",   // cyan · fresh, herbal
  ocimene:        "#84CC16",   // lime · sweet, woody
  bisabolol:      "#FB7185",   // rose · chamomile, soothing
  valencene:      "#FACC15",   // yellow · sweet, tropical
  nerolidol:      "#22D3EE",   // sky · woody, floral
  geraniol:       "#FB7185",   // rose · floral, sweet
  camphene:       "#94A3B8",   // gray · woodsy
};

const FALLBACK = "#71717A";

/**
 * Look up a terpene's color by raw name. Handles variants:
 * "myrcene", "Beta Myrcene", "beta_myrcene" all → myrcene's color.
 */
export function terpColor(name: string): string {
  const key = name.toLowerCase()
    .replace(/^(alpha|beta)[\s_]*/i, "")
    .replace(/_/g, " ")
    .trim();
  return TERPENE_COLOR[key] ?? TERPENE_COLOR[key.replace(/\s/g, "_")] ?? FALLBACK;
}

/**
 * Friendly display name — "beta_myrcene" → "Myrcene"
 */
export function friendlyTerp(name: string): string {
  return name
    .replace(/^(alpha|beta)[\s_]*/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
