"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Mock auth state for development. When Clerk is wired, this gets replaced
// with `useUser()` / `useAuth()` from `@clerk/nextjs` — same shape, real backing.

export type Tier = "free" | "pro";
export type BillingInterval = "monthly" | "annual" | null;
export type SubStatus = "active" | "trialing" | "inactive" | "canceled" | "past_due";

interface AuthState {
  isSignedIn: boolean;
  email: string | null;
  isFounder: boolean;
  tier: Tier;
  status: SubStatus;
  billingInterval: BillingInterval;
  isFounderPricing: boolean;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;

  signIn: (email: string) => void;
  signOut: () => void;
  upgrade: (interval: "monthly" | "annual") => void;
  cancel: () => void;
  reactivate: () => void;
}

const FOUNDER_THRESHOLD_REACHED = false; // < 1000 users — flip when we hit it

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      isSignedIn: false,
      email: null,
      isFounder: false,
      tier: "free",
      status: "inactive",
      billingInterval: null,
      isFounderPricing: false,
      trialEnd: null,
      cancelAtPeriodEnd: false,

      signIn: (email) => set({
        isSignedIn: true,
        email,
        // First N users get founder lock-in
        isFounder: !FOUNDER_THRESHOLD_REACHED,
      }),

      signOut: () => set({
        isSignedIn: false,
        email: null,
        tier: "free",
        status: "inactive",
        billingInterval: null,
        trialEnd: null,
      }),

      upgrade: (interval) => set((s) => ({
        tier: "pro",
        status: "trialing",
        billingInterval: interval,
        isFounderPricing: s.isFounder,
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })),

      cancel: () => set({ cancelAtPeriodEnd: true }),
      reactivate: () => set({ cancelAtPeriodEnd: false }),
    }),
    { name: "jb-auth" }
  )
);

export function isPro(s: { tier: Tier; status: SubStatus }): boolean {
  return s.tier === "pro" && (s.status === "active" || s.status === "trialing");
}

// Pricing source of truth — tied to founder status
export interface PricingTier {
  monthly: number;
  annual: number;
  monthlyEquivalent: number;
  savingsPct: number;
}

export function getPricing(isFounder: boolean): PricingTier {
  if (isFounder) {
    return { monthly: 3.99, annual: 34.99, monthlyEquivalent: 2.92, savingsPct: 27 };
  }
  return { monthly: 6.99, annual: 49.99, monthlyEquivalent: 4.17, savingsPct: 40 };
}
