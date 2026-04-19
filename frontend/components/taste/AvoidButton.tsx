"use client";

import { useState, useEffect } from "react";
import { ThumbsDown, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useDeviceId } from "@/hooks/useDeviceId";
import { cn } from "@/lib/utils";

// Manual "Avoid this brand" / "Avoid this strain" button.
// Lives on brand and strain pages — power-user escape hatch for users who
// want to broadly skip without going through the inferred-prompt flow.

interface Props {
  scope: "brand" | "strain";
  name: string;          // brand or strain name
  className?: string;
}

export function AvoidButton({ scope, name, className }: Props) {
  const deviceId = useDeviceId();
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);

  // Hydrate current state from the user's existing judgments
  useEffect(() => {
    if (!deviceId) return;
    const params: any = { device_id: deviceId };
    if (scope === "brand") params.brand_name = name;
    if (scope === "strain") params.strain_name = name;
    api.checkTaste(params).then((r) => {
      if (r.verdict === "disliked" || r.verdict === "avoid") setActive(true);
    });
  }, [deviceId, scope, name]);

  async function toggle() {
    setPending(true);
    const newVerdict = active ? "neutral" : "avoid";
    setActive(!active);
    try {
      const body: any = { verdict: newVerdict, device_id: deviceId };
      if (scope === "brand") body.brand_name = name;
      else body.strain_name = name;
      await api.judge(body);
    } finally {
      setPending(false);
    }
  }

  const noun = scope === "brand" ? "brand" : "strain";

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-pill border transition-colors",
        active
          ? "bg-red-500/15 border-red-500/40 text-red-400"
          : "border-surface-border text-zinc-500 hover:text-red-400 hover:border-red-500/40",
        className
      )}
    >
      {active ? (
        <><Check size={11} strokeWidth={3} /> {scope === "brand" ? `${name} blocked` : "Strain blocked"}</>
      ) : (
        <><ThumbsDown size={11} /> Avoid this {noun}</>
      )}
    </button>
  );
}
