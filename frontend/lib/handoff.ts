// URL builders for native maps + Dutchie/iHeartJane reservation hand-offs.
//
// Directions: prefers Apple Maps on iOS (system handler), Google Maps elsewhere.
// Hand-offs: deep-link to the product page on the dispensary's storefront so
// the user can reserve in one click. Falls back to dispensary menu + search
// if the source platform doesn't expose a clean product URL.

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function directionsUrl(lat: number, lng: number, name?: string): string {
  if (isIOS()) {
    // Apple Maps URL scheme — opens the Maps app directly on iOS
    const q = name ? `&q=${encodeURIComponent(name)}` : "";
    return `https://maps.apple.com/?daddr=${lat},${lng}${q}&dirflg=d`;
  }
  // Universal Google Maps directions URL — works on Android, web, and desktop
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function dispensaryDirectionsFor(d: DispensaryOut): string | null {
  if (d.lat == null || d.lng == null) return null;
  return directionsUrl(d.lat, d.lng, d.name);
}

/**
 * Returns the deepest possible URL into the dispensary's storefront for this
 * product. iHeartJane exposes per-product URLs cleanly; Dutchie product slugs
 * aren't predictable from product ID, so we fall back to a search hand-off.
 */
export function productHandoffUrl(product: ProductOut): string | null {
  const dispo = product.dispensary;
  const search = encodeURIComponent(product.strain_name ?? product.name);

  if (dispo.source === "iheartjane") {
    // iHJ store URL: https://www.iheartjane.com/stores/<store-id>
    // Product URL:   https://www.iheartjane.com/stores/<store-id>/products/<product-id>
    const storeId = dispo.slug.replace(/^ihj-/, "");
    return `https://www.iheartjane.com/stores/${storeId}/products/${product.source_id}`;
  }

  if (dispo.source === "dutchie") {
    // Dutchie product slugs aren't predictable, so deep-link the menu with
    // a search query. The user lands on the storefront with their term active.
    const dutchieSlug = dispo.slug.replace(/^dutchie-/, "");
    return `https://dutchie.com/dispensary/${dutchieSlug}?search=${search}`;
  }

  // Fallback: just the dispensary's website
  return dispo.website;
}

export function handoffLabel(product: ProductOut): string {
  // Dutchie deep links to a search; iHJ deep links to the actual product page.
  return product.dispensary.source === "iheartjane" ? "Reserve" : "Find on Menu";
}
