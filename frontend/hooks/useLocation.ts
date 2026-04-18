import { useEffect, useState } from "react";

interface Location { lat: number | null; lng: number | null; }

export function useLocation(): Location {
  const [loc, setLoc] = useState<Location>({ lat: null, lng: null });

  useEffect(() => {
    const cached = sessionStorage.getItem("njcanna_loc");
    if (cached) { setLoc(JSON.parse(cached)); return; }

    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        sessionStorage.setItem("njcanna_loc", JSON.stringify(next));
        setLoc(next);
      },
      () => {} // silently fail — app works without location
    );
  }, []);

  return loc;
}
