"use client";

import { useEffect, useState } from "react";

const KEY = "jb-preferred-shop";

// Persisted "I usually shop here" preference. Defaults to null = browse all NJ.
export function useShopPreference() {
  const [slug, setSlug] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    setSlug(stored || null);
    setHydrated(true);
  }, []);

  function set(next: string | null) {
    setSlug(next);
    if (next) localStorage.setItem(KEY, next);
    else localStorage.removeItem(KEY);
  }

  return { slug, set, hydrated };
}
