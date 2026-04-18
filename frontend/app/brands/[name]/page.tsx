"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Flame, Clock, MapPin, Bell } from "lucide-react";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";

export default function BrandPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const brandName = decodeURIComponent(name);
  const router = useRouter();

  const { data: brand } = useSWR(["brand", brandName], () => api.brand(brandName));
  const { data: products } = useSWR(["brand-products", brandName], () => api.brandProducts(brandName));

  if (!brand) return <div className="p-8 text-zinc-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="px-4 pt-12 pb-6">
        <button onClick={() => router.back()} className="text-zinc-500 hover:text-white mb-4 flex items-center gap-1 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center flex-shrink-0 overflow-hidden">
            {brand.image_url ? (
              <img src={brand.image_url} alt={brand.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-display font-bold text-2xl text-zinc-400">
                {brand.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display font-bold text-2xl text-white leading-tight">{brand.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
              <span>{brand.strain_count} strains</span>
              <span>· {brand.dispensary_count} dispensaries</span>
            </div>
          </div>
        </div>

        {/* Drop status banner */}
        <div className="mt-4 bg-surface-card border border-surface-border rounded-2xl p-4">
          {brand.is_just_dropped ? (
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-orange-400" />
              <p className="text-sm">
                <span className="text-orange-400 font-bold">Just dropped</span>
                <span className="text-zinc-400">
                  {brand.days_since_last_drop === 0 ? " today" : ` ${brand.days_since_last_drop} days ago`}
                </span>
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-zinc-500" />
              <p className="text-sm text-zinc-400">
                Last drop <span className="text-white font-semibold">{brand.days_since_last_drop} days ago</span>
              </p>
            </div>
          )}

          <button className="w-full mt-3 flex items-center justify-center gap-2 bg-brand text-black font-bold py-3 rounded-xl hover:bg-brand-dark transition-colors">
            <Bell size={14} /> Notify me on next drop
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {products?.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
