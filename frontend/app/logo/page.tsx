"use client";

import {
  ExitSignMark, ShieldMark, HighwayBanner,
  JerseyBudLockup, JerseyBudLockupCompact,
} from "@/components/brand/JerseyBudLogo";

export default function LogoPreviewPage() {
  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="px-4 pt-6 pb-6">
        <h1 className="font-display font-black text-3xl text-white">Jersey Bud — Exit Sign</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Three refinements of the Exit Sign direction. Pick the strongest mark + lockup.
        </p>
      </div>

      <div className="px-4 space-y-6">
        {/* Variant A — Square sign with EXIT tab */}
        <Section
          number="A"
          name="Square Sign"
          description="EXIT tab top-left, BUD typeset large, NJ pill bottom-right. Most compact — works as favicon, app icon."
        >
          <div className="flex items-end gap-6 flex-wrap">
            <ExitSignMark size={140} />
            <ExitSignMark size={96} />
            <ExitSignMark size={64} />
            <ExitSignMark size={40} />
          </div>
        </Section>

        {/* Variant B — Shield */}
        <Section
          number="B"
          name="Shield Mark"
          description="GSP route shield silhouette, JERSEY arched on top, BUD center. Most iconic — instantly reads as Jersey."
        >
          <div className="flex items-end gap-6 flex-wrap">
            <ShieldMark size={140} />
            <ShieldMark size={96} />
            <ShieldMark size={64} />
            <ShieldMark size={40} />
          </div>
        </Section>

        {/* Variant C — Horizontal banner */}
        <Section
          number="C"
          name="Highway Banner"
          description="Horizontal lockup with EXIT tab + full 'Jersey Bud' wordmark. Best for marketing banners, hero sections."
        >
          <div className="flex flex-col gap-4">
            <HighwayBanner size={100} />
            <HighwayBanner size={70} />
          </div>
        </Section>

        {/* Wordmark lockups */}
        <Section name="Wordmark Lockups" description="The square sign + type combos for headers and marketing.">
          <div className="space-y-5">
            <div className="bg-surface-elevated rounded-2xl p-6">
              <p className="text-[10px] uppercase font-bold text-zinc-500 mb-3">Full lockup</p>
              <JerseyBudLockup markSize={56} />
            </div>
            <div className="bg-surface-elevated rounded-2xl p-6">
              <p className="text-[10px] uppercase font-bold text-zinc-500 mb-3">Compact (used in app header)</p>
              <JerseyBudLockupCompact markSize={32} />
            </div>
          </div>
        </Section>

        {/* In-context — phone screen mock */}
        <Section name="In Context" description="How the compact lockup looks in the actual app header.">
          <div className="bg-surface rounded-2xl border border-surface-border overflow-hidden">
            <div className="bg-surface/85 backdrop-blur border-b border-surface-border px-4 py-3 flex items-center gap-3">
              <JerseyBudLockupCompact markSize={32} />
              <div className="flex-1" />
              <span className="text-zinc-500 text-xs">♥</span>
              <span className="text-zinc-500 text-xs">⚙</span>
            </div>
            <div className="px-4 py-8 text-center text-zinc-600 text-xs">
              … rest of page content …
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  number, name, description, children,
}: { number?: string; name: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-card border border-surface-border rounded-3xl overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border">
        <div className="flex items-baseline gap-2 mb-1">
          {number && (
            <span className="text-[10px] uppercase font-black tracking-wider text-brand">
              Variant {number}
            </span>
          )}
          <span className="text-[10px] uppercase font-black tracking-wider text-zinc-500">
            {number ? "·" : ""} {name}
          </span>
        </div>
        <p className="text-xs text-zinc-400">{description}</p>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}
