import Link from 'next/link';
import { Calendar, Sparkles } from 'lucide-react';
import { primaryButtonSmClass } from '../../lib/tpo-ui';
import { bentoCardClass } from '../../lib/tpo-dashboard-ui';

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
    <section className={`${bentoCardClass} relative overflow-hidden lg:col-span-8`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-[#eef2ff] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-24 top-8 h-28 w-28 rounded-2xl bg-gradient-to-br from-[#e0e7ff]/80 to-[#f5f3ff]/60 rotate-12"
      />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl space-y-3">
          <p className="text-[13px] font-medium text-[var(--ds-text-muted)]">{greeting}</p>
          {loading ? (
            <div className="h-9 w-48 animate-pulse rounded-lg bg-[var(--ds-surface-muted)]" />
          ) : (
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-text)] md:text-[32px]">
              {displayName}
            </h1>
          )}
          <p className="text-[14px] leading-relaxed text-[var(--ds-text-muted)]">
            Here&apos;s what&apos;s happening with your placement drive today.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--ds-text-secondary)]">
              <Calendar className="size-3.5 text-[var(--ds-text-muted)]" strokeWidth={1.5} />
              {formattedDate}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ds-border-subtle)] bg-[#f5f3ff] px-3 py-1.5 text-[12px] font-medium text-[#5b21b6]">
              <Sparkles className="size-3.5" strokeWidth={1.5} />
              Cohort telemetry is read-only
            </div>
          </div>
          <Link href="/provisioning" className={`${primaryButtonSmClass} mt-2`}>
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
