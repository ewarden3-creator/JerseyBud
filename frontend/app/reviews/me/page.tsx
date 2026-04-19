"use client";

import Link from "next/link";
import { Star, Award, ChevronRight, ArrowLeft, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth, isPro } from "@/lib/auth";
import { cn } from "@/lib/utils";

// Mock reviews — replace with API call when backend is wired
const MOCK_REVIEWS = [
  { id: 1, strain: "GG4", brand: "Verano", rating: 5, body: "Heavy myrcene profile lives up to the hype. Couch-lock with a focused head — perfect for movie night with a heavy meal. Better than my expectations from the price.", credit_eligible: true, created_at: "2026-04-12T18:30:00Z" },
  { id: 2, strain: "Wedding Cake", brand: "Curaleaf", rating: 4, body: "Sweet and cake-y like the name says. Hit hard but not couchy. Would buy again.", credit_eligible: false, created_at: "2026-04-08T20:15:00Z" },
  { id: 3, strain: "Northern Lights", brand: "Aeriz", rating: 5, body: "Classic indica done right. The slow creep, the calm body high, the easy fade into sleep. Aeriz nailed this one — the terps are loud out of the jar and even louder in the bowl.", credit_eligible: true, created_at: "2026-04-03T22:45:00Z" },
];

const REVIEWS_PER_FREE_MONTH = 4;

export default function MyReviewsPage() {
  const router = useRouter();
  const auth = useAuth();
  const eligibleCount = MOCK_REVIEWS.filter((r) => r.credit_eligible).length;
  const progress = eligibleCount % REVIEWS_PER_FREE_MONTH;
  const reviewsToNextFreeMonth = REVIEWS_PER_FREE_MONTH - progress;
  const earnedFreeMonths = Math.floor(eligibleCount / REVIEWS_PER_FREE_MONTH);

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="px-4 pt-6 pb-4">
        <button onClick={() => router.back()} className="text-zinc-500 hover:text-white flex items-center gap-1 mb-3">
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="font-display font-black text-2xl text-white">Your Reviews</h1>
      </div>

      {/* Credit progress card */}
      <div className="mx-4 mb-4 rounded-2xl bg-gradient-to-br from-brand/15 via-surface-card to-surface-card border border-brand/40 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Award size={16} className="text-brand" />
          <span className="text-xs font-black tracking-widest uppercase text-brand">
            Free Month Tracker
          </span>
          {earnedFreeMonths > 0 && (
            <span className="ml-auto text-xs font-bold text-brand">
              {earnedFreeMonths} earned
            </span>
          )}
        </div>

        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-3xl font-black text-white">{progress}<span className="text-xl text-zinc-500">/{REVIEWS_PER_FREE_MONTH}</span></p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {reviewsToNextFreeMonth === REVIEWS_PER_FREE_MONTH
                ? "Start writing to earn your first free month"
                : `${reviewsToNextFreeMonth} more quality review${reviewsToNextFreeMonth > 1 ? "s" : ""} for a free month`}
            </p>
          </div>
          {!isPro(auth) && (
            <Link href="/upgrade" className="text-xs font-bold text-brand flex items-center gap-1">
              Why? <ChevronRight size={11} />
            </Link>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand to-brand rounded-full transition-all"
            style={{ width: `${(progress / REVIEWS_PER_FREE_MONTH) * 100}%` }}
          />
        </div>

        <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">
          Quality reviews (80+ chars with rating) count toward credit. Credits auto-apply to your next bill.
        </p>
      </div>

      {/* Stats strip */}
      <div className="mx-4 mb-4 grid grid-cols-3 gap-2">
        <Stat label="Total" value={MOCK_REVIEWS.length} />
        <Stat label="Avg rating" value={(MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / MOCK_REVIEWS.length).toFixed(1)} accent="text-brand" />
        <Stat label="Credits earned" value={`$${(eligibleCount * 1.75).toFixed(0)}`} accent="text-emerald-400" />
      </div>

      {/* Reviews list */}
      <div className="px-4 space-y-2">
        {MOCK_REVIEWS.map((r) => (
          <Link key={r.id} href={`/strains/${encodeURIComponent(r.strain)}`}>
            <div className="bg-surface-card border border-surface-border rounded-2xl p-4 hover:border-zinc-500 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{r.strain}</p>
                  <p className="text-xs text-zinc-500">{r.brand} · {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={11}
                      className={n <= r.rating ? "text-brand" : "text-zinc-700"}
                      fill={n <= r.rating ? "currentColor" : "none"}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">{r.body}</p>
              {r.credit_eligible && (
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-brand">
                  <Award size={10} /> Credit eligible
                </div>
              )}
            </div>
          </Link>
        ))}

        {MOCK_REVIEWS.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Star size={36} className="text-zinc-700 mb-3" />
            <p className="text-white font-semibold mb-1">No reviews yet</p>
            <p className="text-zinc-500 text-sm max-w-xs">
              Tap the star icon on any product card to rate it. Hit 4 quality reviews and get a free month of Pro.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-0.5">{label}</p>
      <p className={cn("text-lg font-black", accent ?? "text-white")}>{value}</p>
    </div>
  );
}
