'use client';

import { AnimatedGridPattern, SmartLogo } from '@smart/ui';

/**
 * Generic across every role — this panel used to be TPO-only copy
 * ("Upload Candidates", "Track Readiness"). Now that this screen is the one
 * login for the whole product, the steps describe what happens to ANY
 * account (student, placement staff, admin), not a specific portal's task.
 */
const STEPS = [
  { n: 1, label: 'Sign in with your email', active: true },
  { n: 2, label: 'We recognize your role', active: false },
  { n: 3, label: 'Land on your dashboard', active: false },
] as const;

export function LoginBrandPanel() {
  return (
    <section
      className="relative hidden min-h-dvh flex-col justify-between overflow-hidden px-12 py-12 lg:flex xl:px-16"
      style={{
        background:
          'radial-gradient(120% 120% at 12% 8%, var(--brand-teal-deep) 0%, transparent 55%), var(--background)',
      }}
      aria-label="About SMART"
    >
      <AnimatedGridPattern
        className="fill-[var(--brand-teal)]/10 stroke-[var(--brand-teal)]/10"
        numSquares={36}
        maxOpacity={0.18}
      />

      <div className="relative z-10">
        <SmartLogo kind="wordmark" tone="on-dark" className="h-8" title="SMART" />
      </div>

      <div className="relative z-10 max-w-md space-y-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-teal)]">
            One account, every portal
          </p>
          <h1 className="font-heading text-[2.35rem] font-extrabold leading-[1.08] tracking-tight text-white">
            Sign in once.
            <span className="block text-[var(--brand-teal)]">
              We&apos;ll take you the rest of the way.
            </span>
          </h1>
          <p className="text-[15px] leading-relaxed text-white/60">
            Students, placement teams, and admins all sign in right here — SMART opens the workspace
            built for your role.
          </p>
        </div>

        <ol className="flex flex-col gap-3">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className={
                step.active
                  ? 'flex items-center gap-4 rounded-2xl bg-white px-5 py-4 text-black'
                  : 'flex items-center gap-4 rounded-2xl bg-white/5 px-5 py-4 text-white/50 backdrop-blur-sm'
              }
            >
              <span
                className={
                  step.active
                    ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white'
                    : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold'
                }
              >
                {step.n}
              </span>
              <span className="text-[15px] font-medium">{step.label}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="relative z-10 text-xs text-white/40">
        © {new Date().getFullYear()} SMART · Infinitica
      </p>
    </section>
  );
}
