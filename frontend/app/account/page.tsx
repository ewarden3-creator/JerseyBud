"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Crown, LogOut, ChevronRight, Sparkles,
  Calendar, AlertCircle, RotateCcw, Award,
} from "lucide-react";
import { useAuth, isPro, getPricing } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function AccountPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");

  if (!auth.isSignedIn) {
    return <SignInView onSubmit={(e) => auth.signIn(e)} />;
  }

  const userIsPro = isPro(auth);
  const pricing = getPricing(auth.isFounderPricing);

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="font-display font-black text-2xl text-white mb-1">Account</h1>
      </div>

      {/* Profile card */}
      <div className="mx-4 mb-4 bg-surface-card border border-surface-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-surface-elevated flex items-center justify-center flex-shrink-0">
          <User size={22} className="text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{auth.email}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Anonymous device synced</p>
        </div>
        {auth.isFounder && (
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-pill bg-brand/20 text-brand border border-brand/40">
            <Crown size={9} /> Founder
          </span>
        )}
      </div>

      {/* Subscription status card */}
      <div className="mx-4 mb-4">
        {userIsPro ? <ProSubscriptionCard /> : <FreeUpgradeCard />}
      </div>

      {/* Activity / credits */}
      <div className="mx-4 mb-4 bg-surface-card border border-surface-border rounded-2xl divide-y divide-surface-border">
        <Link href="/reviews/me" className="px-4 py-3 flex items-center gap-3 hover:bg-surface-elevated transition-colors">
          <div className="w-9 h-9 rounded-xl bg-surface-elevated flex items-center justify-center">
            <Award size={14} className="text-brand" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Reviews & credits</p>
            <p className="text-xs text-zinc-500">Earn free months by reviewing</p>
          </div>
          <ChevronRight size={14} className="text-zinc-600" />
        </Link>
        <Link href="/favorites" className="px-4 py-3 flex items-center gap-3 hover:bg-surface-elevated transition-colors">
          <div className="w-9 h-9 rounded-xl bg-surface-elevated flex items-center justify-center">
            <span className="text-pink-400">♥</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Favorites</p>
            <p className="text-xs text-zinc-500">Saved products, strains, dispensaries</p>
          </div>
          <ChevronRight size={14} className="text-zinc-600" />
        </Link>
        <Link href="/alerts" className="px-4 py-3 flex items-center gap-3 hover:bg-surface-elevated transition-colors">
          <div className="w-9 h-9 rounded-xl bg-surface-elevated flex items-center justify-center">
            <span className="text-brand">🔔</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Active alerts</p>
            <p className="text-xs text-zinc-500">Price drops + back-in-stock</p>
          </div>
          <ChevronRight size={14} className="text-zinc-600" />
        </Link>
      </div>

      {/* Sign out */}
      <div className="mx-4 mt-8">
        <button
          onClick={() => auth.signOut()}
          className="w-full flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-red-400 py-3 transition-colors"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}

function ProSubscriptionCard() {
  const auth = useAuth();
  const pricing = getPricing(auth.isFounderPricing);
  const trialDays = auth.trialEnd
    ? Math.max(0, Math.ceil((new Date(auth.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const isTrialing = auth.status === "trialing";

  return (
    <div className="bg-gradient-to-br from-brand/15 via-surface-card to-surface-card border border-brand/40 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crown size={16} className="text-brand" />
          <span className="text-sm font-bold text-white">Jersey Bud Pro</span>
          {auth.isFounderPricing && (
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-pill bg-brand/20 text-brand border border-brand/40">
              Founder rate
            </span>
          )}
        </div>
        {isTrialing && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
            Trial · {trialDays}d left
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-black text-white">
          ${auth.billingInterval === "annual" ? pricing.annual : pricing.monthly}
        </span>
        <span className="text-zinc-500 text-sm">/{auth.billingInterval === "annual" ? "yr" : "mo"}</span>
      </div>

      {auth.cancelAtPeriodEnd ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 flex items-center gap-2 mb-3">
          <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300 flex-1">Set to cancel at period end</p>
          <button
            onClick={() => useAuth.getState().reactivate()}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <RotateCcw size={11} /> Resume
          </button>
        </div>
      ) : null}

      <div className="flex gap-2">
        <button className="flex-1 text-xs font-semibold py-2.5 rounded-xl bg-surface-elevated border border-surface-border text-zinc-300 hover:text-white transition-colors">
          Manage billing
        </button>
        {!auth.cancelAtPeriodEnd && (
          <button
            onClick={() => useAuth.getState().cancel()}
            className="text-xs font-semibold py-2.5 px-4 rounded-xl text-zinc-500 hover:text-red-400 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function FreeUpgradeCard() {
  return (
    <Link
      href="/upgrade"
      className="block bg-gradient-to-br from-brand/15 via-surface-card to-surface-card border border-brand/40 rounded-2xl p-5 hover:border-brand/70 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-brand" />
        <span className="text-[10px] font-black tracking-widest uppercase text-brand">
          Free Plan
        </span>
      </div>
      <p className="text-sm text-white mb-3">
        Unlock predictive pricing, voice chat, personalized recs, and every advanced filter.
      </p>
      <div className="flex items-center justify-between bg-brand text-black px-4 py-2.5 rounded-xl font-bold text-sm">
        <span className="flex items-center gap-1.5">
          <Sparkles size={13} /> Try Pro free
        </span>
        <ChevronRight size={14} />
      </div>
    </Link>
  );
}

// ---------- Sign-in view ----------

function SignInView({ onSubmit }: { onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signup");

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 pb-24">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 bg-brand/15 border border-brand/40 px-3 py-1 rounded-pill mb-4">
            <Sparkles size={11} className="text-brand" />
            <span className="text-[10px] font-black tracking-widest uppercase text-brand">
              Jersey Bud
            </span>
          </div>
          <h1 className="font-display font-black text-3xl text-white leading-tight mb-2">
            {mode === "signup" ? "Make Bud yours" : "Welcome back"}
          </h1>
          <p className="text-sm text-zinc-400">
            {mode === "signup"
              ? "Sync favorites + alerts across devices. Start training Bud to know your taste."
              : "Sign in to access your saved data and Pro features."}
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (email) onSubmit(email); }} className="space-y-3">
          <div className="bg-surface-card border border-surface-border rounded-2xl px-4 py-3 flex items-center gap-3 focus-within:border-brand/60 transition-colors">
            <Mail size={14} className="text-zinc-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoFocus
              required
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-zinc-600"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brand text-black font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-brand-dark transition-colors"
          >
            {mode === "signup" ? "Continue" : "Sign in"}
          </button>

          <div className="text-center text-xs text-zinc-500 pt-2">
            {mode === "signup" ? (
              <>Already have an account? <button type="button" onClick={() => setMode("signin")} className="text-brand font-semibold">Sign in</button></>
            ) : (
              <>New here? <button type="button" onClick={() => setMode("signup")} className="text-brand font-semibold">Create account</button></>
            )}
          </div>
        </form>

        {/* Founder mention */}
        <div className="mt-8 px-4 py-3 rounded-2xl bg-surface-card border border-brand/30 text-center">
          <div className="inline-flex items-center gap-1.5 mb-1">
            <Crown size={11} className="text-brand" />
            <span className="text-[10px] font-black tracking-widest uppercase text-brand">
              Founder Pricing
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            First 1,000 sign-ups lock in Pro at $3.99/mo forever.
          </p>
        </div>
      </div>
    </div>
  );
}
