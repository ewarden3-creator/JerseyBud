"use client";

import { useEffect, useState } from "react";

const KEY = "jb-preferred-shops";
const LEGACY_KEY = "jb-preferred-shop";  // single-shop key from earlier version

// Persisted list of shop slugs the user has chosen.
// Empty array = "All NJ" mode (no scoping).
// Cannabis users typically rotate between 2-4 shops, so multi-select is the 80% case.
export function useShopPreference() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSlugs(parsed);
      } catch { /* ignore */ }
    } else {
      // Migrate legacy single-shop preference if present
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        setSlugs([legacy]);
        localStorage.setItem(KEY, JSON.stringify([legacy]));
        localStorage.removeItem(LEGACY_KEY);
      }
    }
    setHydrated(true);
  }, []);

  function set(next: string[]) {
    setSlugs(next);
    if (next.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(next));
  }

  function toggle(slug: string) {
    const next = slugs.includes(slug) ? slugs.filter((s) => s !== slug) : [...slugs, slug];
    set(next);
  }

  function clear() { set([]); }

  return { slugs, set, toggle, clear, hydrated };
}
