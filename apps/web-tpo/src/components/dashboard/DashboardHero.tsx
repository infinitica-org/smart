import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { bentoCardClass, dashboardPrimaryButtonClass } from '../../lib/tpo-dashboard-ui';

type DashboardHeroProps = {
  greeting: string;
  displayName: string;
  formattedDate: string;
  loading: boolean;
};

export function DashboardHero({
  greeting,
  displayName,
  formattedDate,
  loading,
}: DashboardHeroProps) {
  return (
    <section className={`dashboard-hero-card ${bentoCardClass} lg:col-span-8`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-8 h-48 w-48 rounded-full bg-[var(--tpo-dash-hero-glow-blue,rgb(59_130_246/0.08))] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-16 top-6 h-32 w-32 rounded-3xl bg-gradient-to-br from-[var(--tpo-dash-hero-glow-lavender,rgb(139_124_246/0.1))] to-[var(--tpo-dash-hero-glow-blue,rgb(59_130_246/0.08))] opacity-90 rotate-12"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-24 rounded-full border border-[var(--ds-border-subtle)]/80 opacity-40"
      />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-xl font-semibold tracking-tight text-[var(--tpo-dash-primary)] md:text-2xl">
            {greeting}
          </p>
          {loading ? (
            <div className="h-11 w-56 animate-pulse rounded-lg bg-[var(--ds-surface-muted)]" />
          ) : (
            <h1 className="text-[32px] font-bold leading-tight tracking-tight text-[var(--ds-text)] md:text-[40px]">
              {displayName}
            </h1>
          )}
          <p className="text-base font-medium leading-relaxed text-[var(--ds-text-secondary)] md:text-lg">
            Here&apos;s what&apos;s happening with your placement drive today.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--ds-text-secondary)]">
              <Calendar className="size-3.5 text-[var(--ds-text-muted)]" strokeWidth={1.5} />
              {formattedDate}
            </div>
          </div>
          <Link href="/provisioning" className={`${dashboardPrimaryButtonClass} mt-2`}>
            + Onboard Candidates
          </Link>
        </div>

        <p className="hidden max-w-[220px] text-right text-[12px] italic leading-relaxed text-[var(--ds-text-subtle)] xl:block">
          Empowering students for a brighter tomorrow
          <span className="mt-1 block not-italic text-[11px] font-medium text-[var(--ds-text-muted)]">
            — Placement Team
          </span>
        </p>
      </div>
    </section>
  );
}
