"use client";

import useSWR from "swr";
import { Bell, Trash2, TrendingDown, Package, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useDeviceId } from "@/hooks/useDeviceId";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { icon: any; label: string; color: string }> = {
  price_threshold: { icon: TrendingDown, label: "Price Drop",   color: "text-emerald-400" },
  back_in_stock:   { icon: Package,      label: "Back in Stock", color: "text-blue-400" },
  new_drop:        { icon: Sparkles,     label: "New Drop",      color: "text-amber-400" },
};

export default function AlertsPage() {
  const deviceId = useDeviceId();
  const { data: alerts, mutate } = useSWR(
    deviceId ? ["alerts", deviceId] : null,
    () => api.alerts(deviceId)
  );

  async function remove(id: number) {
    await api.deleteAlert(id, deviceId);
    mutate();
  }

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="px-4 pt-12 pb-4">
        <h1 className="font-display font-bold text-2xl text-white mb-1">Active Alerts</h1>
        <p className="text-sm text-zinc-500">We'll ping you when prices drop or stock changes.</p>
      </div>

      <div className="px-4 space-y-2">
        {alerts?.map((a) => {
          const meta = TYPE_META[a.alert_type] ?? TYPE_META.price_threshold;
          const Icon = meta.icon;
          return (
            <div key={a.id} className="bg-surface-card border border-surface-border rounded-2xl p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0", meta.color)}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-bold uppercase", meta.color)}>{meta.label}</span>
                  {a.last_triggered_at && (
                    <span className="text-xs text-zinc-600">
                      · Last fired {new Date(a.last_triggered_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-white truncate mt-0.5">
                  {a.strain_name ?? `Product #${a.product_id}`}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {a.threshold_price && `≤ $${a.threshold_price}`}
                  {a.target_weight && ` for ${a.target_weight}`}
                </p>
              </div>
              <button
                onClick={() => remove(a.id)}
                className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}

        {alerts && alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bell size={36} className="text-zinc-700 mb-3" />
            <p className="text-white font-semibold mb-1">No alerts yet</p>
            <p className="text-zinc-500 text-sm max-w-xs">
              Tap the bell on any product to get notified when prices drop or it comes back in stock.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
