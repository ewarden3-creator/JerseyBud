// Out-the-door cost calculator: takes shopping list items + all NJ inventory,
// returns the top 3 dispensaries that can fulfill the list cheapest.
// NJ rec tax is ~15% combined (state + local + 2% transfer). Hardcoded for now.

const NJ_REC_TAX = 0.15;

interface OTDCEntry {
  dispensary_slug: string;
  dispensary_name: string;
  dispensary_city: string;
  distance_miles: number | null;
  is_open_now: boolean | null;
  items_available: number;
  items_total: number;
  subtotal: number;
  tax: number;
  otd_total: number;
  /** Per-item breakdown: { product_id: price-at-this-shop } */
  fulfillment: Record<number, { price: number; productId: number; available: boolean }>;
}

/**
 * For each item in the list, find equivalent products (same strain_name) at all
 * NJ dispensaries. Aggregate per-dispo to compute OTDC for the whole list.
 */
export function computeOTDC(
  listItems: ShoppingItem[],
  allProducts: ProductOut[],
  topN: number = 3
): OTDCEntry[] {
  if (listItems.length === 0) return [];

  // For each list item, build a map of strain_name → preferred weight
  const itemSpecs = listItems.map((i) => ({
    strainName: i.product.strain_name?.toLowerCase() ?? "",
    weight: i.weight,
    quantity: i.quantity,
    listedProductId: i.product.id,
  }));

  // Group all products by dispensary
  const byShop: Map<string, ProductOut[]> = new Map();
  for (const p of allProducts) {
    const key = p.dispensary.slug;
    if (!byShop.has(key)) byShop.set(key, []);
    byShop.get(key)!.push(p);
  }

  const entries: OTDCEntry[] = [];

  for (const [slug, products] of byShop) {
    const dispo = products[0].dispensary;
    let subtotal = 0;
    let availableCount = 0;
    const fulfillment: Record<number, { price: number; productId: number; available: boolean }> = {};

    for (const spec of itemSpecs) {
      // Find a matching product (same strain) at this shop
      const match = products.find((p) =>
        p.strain_name?.toLowerCase() === spec.strainName
      );
      if (match) {
        const pricing = match.pricing?.find((e) => e.weight === spec.weight) ?? match.pricing?.[0];
        if (pricing) {
          subtotal += pricing.price * spec.quantity;
          availableCount += 1;
          fulfillment[spec.listedProductId] = {
            price: pricing.price * spec.quantity,
            productId: match.id,
            available: true,
          };
          continue;
        }
      }
      // Not available at this shop
      fulfillment[spec.listedProductId] = {
        price: 0,
        productId: 0,
        available: false,
      };
    }

    if (availableCount === 0) continue;

    const tax = subtotal * NJ_REC_TAX;
    entries.push({
      dispensary_slug: slug,
      dispensary_name: dispo.name,
      dispensary_city: dispo.city,
      distance_miles: dispo.distance_miles,
      is_open_now: dispo.is_open_now,
      items_available: availableCount,
      items_total: itemSpecs.length,
      subtotal: +subtotal.toFixed(2),
      tax: +tax.toFixed(2),
      otd_total: +(subtotal + tax).toFixed(2),
      fulfillment,
    });
  }

  // Rank: prefer shops that fulfill all items, then sort by OTD total ascending
  entries.sort((a, b) => {
    const aFull = a.items_available === a.items_total ? 0 : 1;
    const bFull = b.items_available === b.items_total ? 0 : 1;
    if (aFull !== bFull) return aFull - bFull;
    return a.otd_total - b.otd_total;
  });

  return entries.slice(0, topN);
}

/**
 * Airline-style price prediction copy. Replaces the directive
 * "Buy Now / Wait" with informational "Likely to / Unlikely to" language.
 */
export function airlineStylePrediction(p: ShoppingItem["prediction"]): {
  label: string;
  detail: string;
  tone: "low" | "wait" | "stable";
} | null {
  if (!p) return null;

  if (p.recommendation === "buy_now") {
    return {
      label: "At a recent low",
      detail: "Unlikely to be cheaper in the next week.",
      tone: "low",
    };
  }
  if (p.recommendation === "wait") {
    const days = p.expected_sale_in_days;
    return {
      label: "Likely to drop",
      detail: days
        ? `Based on past cycles, expect a ~15% sale within ${days} days.`
        : "Past sale cycles suggest a discount is coming soon.",
      tone: "wait",
    };
  }
  return {
    label: "Price is stable",
    detail: "No meaningful change predicted in the next 7 days.",
    tone: "stable",
  };
}
