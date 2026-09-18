import type { DashboardMetrics } from '../../lib/tpo-dashboard-metrics';
import {
  bentoCardClass,
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
  dashboardSkeletonClass,
} from '../../lib/tpo-dashboard-ui';

type OnboardingTrendCardProps = {
  inviteBreakdown: DashboardMetrics['inviteBreakdown'];
  totalProvisioned: number;
  loading: boolean;
};

const SEGMENTS = [
  {
    key: 'accepted' as const,
    label: 'Accepted',
    barClass: 'bg-[var(--tpo-dash-chart-bar,#bfd4f8)]',
  },
  {
    key: 'pending' as const,
    label: 'Pending',
    barClass: 'bg-[var(--tpo-dash-chart-bar-muted,#d4e3f7)]',
  },
  { key: 'other' as const, label: 'Other', barClass: 'bg-[var(--tpo-dash-chart-track,#e9eef5)]' },
];

export function OnboardingTrendCard({
  inviteBreakdown,
  totalProvisioned,
  loading,
}: OnboardingTrendCardProps) {
  const max = Math.max(totalProvisioned, 1);

  return (
    <section className={`${bentoCardClass} lg:col-span-8`}>
      <h2 className={dashboardSectionTitleClass}>Onboarding Trend</h2>
      <p className={dashboardSectionSubtitleClass}>
        Current invite status across your cohort (historical monthly data is not available yet)
      </p>

      {loading ? (
        <div className={`${dashboardSkeletonClass} mt-6 h-40 w-full rounded-2xl`} />
      ) : totalProvisioned === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-5 py-8 text-center">
          <p className="text-[13px] font-medium text-[var(--ds-text-secondary)]">
            No candidates onboarded yet
          </p>
          <p className="mt-1 text-[12px] text-[var(--ds-text-muted)]">
            Onboard candidates to see invite status here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5 rounded-2xl border border-[var(--tpo-dash-chart-track,#e9eef5)] bg-[var(--ds-surface-muted)]/50 p-4">
          {SEGMENTS.map((segment) => {
            const value = inviteBreakdown[segment.key];
            const width = `${Math.round((value / max) * 100)}%`;
            return (
              <div key={segment.key}>
                <div className="mb-2 flex items-center justify-between text-[13px]">
                  <span className="font-medium text-[var(--ds-text-secondary)]">
                    {segment.label}
                  </span>
                  <span className="font-semibold tabular-nums text-[var(--ds-text)]">{value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--tpo-dash-chart-track,#e9eef5)]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${segment.barClass}`}
                    style={{ width: value > 0 ? width : '0%' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
