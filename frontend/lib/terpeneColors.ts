// Tightened terpene palette — built around the brand teal family with
// 2 warm accents + 1 floral. Looks intentional, not scattershot.
//
// Family breakdown:
//   Cool (brand-aligned greens & teals): caryophyllene, pinene, humulene,
//     terpinolene, ocimene, nerolidol — these dominate most strain blooms
//   Warm accents (sparingly): myrcene (amber), limonene (gold), bisabolol (coral)
//   Floral: linalool (lavender) — one purple accent for floral terps
//
// Result: most blooms read as "brand-greens with one or two warm pops" instead
// of a confused rainbow. Distinct enough to read, tight enough to feel branded.

export const TERPENE_COLOR: Record<string, string> = {
  // Warm accents — stand out, used for the most-common dominant terpenes
  myrcene:        "#F59E0B",   // warm amber · earthy/sedating
  limonene:       "#FBBF24",   // golden · citrus/uplifting
  bisabolol:      "#FB7185",   // coral · chamomile/soothing

  // Brand-cool family — greens & teals (the bulk of the palette)
  caryophyllene:  "#0D9488",   // deep teal · peppery
  pinene:         "#10B981",   // emerald · pine/focused
  humulene:       "#65A30D",   // olive · hoppy/earthy
  terpinolene:    "#2DD4BF",   // brand teal · fresh/herbal
  ocimene:        "#5EEAD4",   // mint · sweet/woody
  nerolidol:      "#0EA5E9",   // sky · woody/floral
  valencene:      "#22C55E",   // grass green · sweet/tropical

  // Floral — one purple accent
  linalool:       "#A78BFA",   // lavender · floral/calming
  geraniol:       "#C084FC",   // lighter purple · floral/sweet

  // Neutral fallbacks
  camphene:       "#94A3B8",   // slate · woodsy
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
