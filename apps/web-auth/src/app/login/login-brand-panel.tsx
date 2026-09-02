'use client';

import { AnimatedGridPattern, AnimatedShinyText, BorderBeam, SmartLogo } from '@smart/ui';

const PILLARS = [
  {
    title: 'Verified competency trail',
    body: 'Gold, Silver, and Bronze tiers backed by real assessments—not self-reported skills.',
  },
  {
    title: 'One front door',
    body: 'Students, placement staff, and administrators sign in once; SMART routes you to the right portal.',
  },
  {
    title: 'Institution-grade trust',
    body: 'TPO-mediated placement with explainable matching and audit-ready decisions.',
  },
] as const;

export function LoginBrandPanel() {
  return (
    <section
      className="relative hidden min-h-dvh flex-col justify-between overflow-hidden border-r border-[var(--surface-border)] bg-[var(--surface-muted)] px-12 py-12 lg:flex xl:px-16"
      aria-label="About SMART"
    >
      <AnimatedGridPattern
        className="fill-brand-500/10 stroke-brand-500/10"
        numSquares={36}
        maxOpacity={0.22}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-brand-950/90 via-[var(--surface-muted)]/80 to-brand-900/40"
        aria-hidden
      />

      <div className="relative z-10">
        <SmartLogo kind="wordmark" tone="on-dark" className="h-8" title="SMART" />
      </div>

      <div className="relative z-10 max-w-md space-y-8">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Role-specific readiness
          </p>
          <h1 className="font-heading text-[2.35rem] font-extrabold leading-[1.08] tracking-tight text-[var(--text-primary)]">
            Prove skills.
            <span className="block text-brand-400">Place talent with confidence.</span>
          </h1>
          <AnimatedShinyText className="text-[15px] leading-relaxed">
            SMART connects verified student competency to institution-led placement—transparent,
            explainable, and built for the whole campus loop.
          </AnimatedShinyText>
        </div>
      </div>

      <p className="relative z-10 text-xs text-[var(--text-muted)]">
        © {new Date().getFullYear()} SMART · Infinitica
      </p>
    </section>
  );
}
