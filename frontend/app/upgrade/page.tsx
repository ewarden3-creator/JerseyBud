"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, X, ArrowLeft, Sparkles, Bell, Heart, Zap, Brain, Mic,
  Filter, BarChart2, Crown, Loader2,
} from "lucide-react";
import { useAuth, getPricing, isPro } from "@/lib/auth";
import { cn } from "@/lib/utils";

type FeatureRow = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  free: boolean | string;
  pro: boolean;
  desc: string;
};

const FEATURE_MATRIX: FeatureRow[] = [
  { icon: Filter,   label: "Advanced filters",            free: false, pro: true,  desc: "Filter by terpene, cannabinoid, value/g" },
  { icon: Bell,     label: "Unlimited price alerts",      free: "3 max", pro: true, desc: "Free is capped at 3 active alerts" },
  { icon: Heart,    label: "Unlimited favorites",         free: "5 max", pro: true, desc: "Free is capped at 5" },
  { icon: Zap,      label: "Predictive pricing on list",  free: false, pro: true,  desc: "Buy now or wait — flight-tracker for weed" },
  { icon: Brain,    label: "Personalized Ask Bud",        free: "3/day",  pro: true, desc: "Bud learns you, pulls in cohort intel" },
  { icon: Mic,      label: "Voice chat with Ask Bud",     free: false, pro: true,  desc: "Talk to Bud, hands free" },
  { icon: BarChart2,label: "Price history + lab archives",free: false, pro: true,  desc: "Charts back 90 days; all batch lab data" },
  { icon: Crown,    label: "Cohort recommendations",      free: false, pro: true,  desc: "What kush/haze/dessert lovers like you are loving" },
];

export default function UpgradePage() {
  const router = useRouter();
  const auth = useAuth();
  const [interval, setInterval] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const pricing = getPricing(auth.isFounder);

  async function checkout() {
    setLoading(true);
    // Mock: pretend Stripe Checkout returned successful
    await new Promise((r) => setTimeout(r, 1200));
    auth.upgrade(interval);
    setDone(true);
    setTimeout(() => router.push("/account"), 1400);
  }

  if (isPro(auth) && !done) {
    return (
      <div className="min-h-screen bg-surface px-4 pt-12 pb-24 text-center">
        <Crown size={48} className="text-amber-400 mx-auto mb-3" />
        <h1 className="font-display font-black text-2xl text-white">You're already Pro</h1>
        <p className="text-zinc-400 mt-2">Manage your subscription on the account page.</p>
        <button
          onClick={() => router.push("/account")}
          className="mt-6 inline-flex items-center gap-2 bg-brand text-black font-bold px-6 py-3 rounded-xl"
        >
          Go to account
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-32">
      <button
        onClick={() => router.back()}
        className="px-4 pt-4 text-zinc-500 hover:text-white flex items-center gap-1"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Hero */}
      <div className="px-4 pt-4 pb-6 text-center">
        <div className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/40 px-3 py-1 rounded-pill mb-4">
          <Sparkles size={11} className="text-amber-400" />
          <span className="text-[10px] font-black tracking-widest uppercase text-amber-400">
            Jersey Bud Pro
          </span>
        </div>
        <h1 className="font-display font-black text-3xl text-white leading-tight mb-2">
          The bud that knows your buds.
        </h1>
        <p className="text-sm text-zinc-400 max-w-xs mx-auto">
          Personalized recommendations, predictive pricing, voice chat, and every advanced filter — unlocked.
        </p>
      </div>

      {/* Founder badge if applicable */}
      {auth.isFounder && (
        <div className="mx-4 mb-4 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Crown size={14} className="text-amber-400" />
            <span className="text-xs font-black tracking-widest uppercase text-amber-400">
              Founder Pricing
            </span>
          </div>
          <p className="text-sm text-white">
            You're one of the first 1,000. Lock in <span className="font-bold text-amber-400">$3.99/mo</span> forever — even when we raise prices.
          </p>
        </div>
      )}

      {/* Interval toggle */}
      <div className="px-4 mb-4">
        <div className="flex bg-surface-card border border-surface-border rounded-2xl p-1 relative">
          <button
            onClick={() => setInterval("monthly")}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-bold transition-colors relative z-10",
              interval === "monthly" ? "text-black" : "text-zinc-400"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("annual")}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-bold transition-colors relative z-10 flex items-center justify-center gap-2",
              interval === "annual" ? "text-black" : "text-zinc-400"
            )}
          >
            Annual
            <span className={cn(
              "text-[10px] font-black uppercase px-1.5 py-0.5 rounded-pill",
              interval === "annual" ? "bg-black/20 text-black" : "bg-amber-500/20 text-amber-400"
            )}>
              −{pricing.savingsPct}%
            </span>
          </button>
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-y-1 w-[calc(50%-4px)] bg-amber-400 rounded-xl"
            style={{ left: interval === "monthly" ? 4 : "calc(50% + 0px)" }}
          />
        </div>
      </div>

      {/* Price card */}
      <div className="mx-4 mb-6 p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-surface-card to-surface-card border border-amber-500/30">
        <div className="flex items-baseline justify-center gap-1 mb-1">
          <span className="text-5xl font-black text-white">
            ${interval === "monthly" ? pricing.monthly : pricing.monthlyEquivalent}
          </span>
          <span className="text-zinc-500">/mo</span>
        </div>
        {interval === "annual" && (
          <p className="text-center text-xs text-zinc-500 mb-1">
            Billed ${pricing.annual} annually
          </p>
        )}
        <p className="text-center text-xs text-amber-400 font-semibold">
          7-day free trial · cancel anytime
        </p>
      </div>

      {/* Feature matrix */}
      <div className="px-4 mb-8">
        <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3 text-center">
          What you unlock
        </p>
        <div className="bg-surface-card border border-surface-border rounded-2xl divide-y divide-surface-border">
          {FEATURE_MATRIX.map((f) => {
            const Icon = f.icon;
            const freeAllowed = f.free === true;
            return (
              <div key={f.label} className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-tight">{f.label}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{f.desc}</p>
                </div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0 w-12 text-center">
                  {freeAllowed ? (
                    <Check size={12} className="text-zinc-500" />
                  ) : f.free === false ? (
                    <X size={12} className="text-zinc-700" />
                  ) : (
                    <span className="text-[10px] text-zinc-600">{f.free}</span>
                  )}
                  <span className="text-[9px] text-zinc-700 uppercase tracking-wider">Free</span>
                </div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0 w-12 text-center">
                  <Check size={14} className="text-amber-400" />
                  <span className="text-[9px] text-amber-400 uppercase tracking-wider font-bold">Pro</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Earn-it-back nudge */}
      <div className="mx-4 mb-6 p-4 bg-surface-card border border-surface-border rounded-2xl">
        <p className="text-xs text-zinc-400 leading-relaxed">
          <span className="font-bold text-white">Earn it back.</span>{" "}
          Write 4 quality reviews and we'll credit you a free month. Most active users break even.
        </p>
      </div>

      {/* CTA — sticky on mobile */}
      <div className="px-4">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-emerald-500 text-white font-bold py-4 rounded-2xl text-center flex items-center justify-center gap-2"
            >
              <Check size={18} /> Welcome to Pro!
            </motion.div>
          ) : (
            <motion.button
              key="cta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={checkout}
              disabled={loading}
              className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/50 text-black font-black py-4 rounded-2xl text-base flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Starting trial…</>
              ) : (
                <><Sparkles size={16} /> Start 7-day free trial</>
              )}
            </motion.button>
          )}
        </AnimatePresence>
        <p className="text-center text-[10px] text-zinc-600 mt-3">
          No charge today. We'll remind you 2 days before the trial ends.
        </p>
      </div>
    </div>
  );
}
