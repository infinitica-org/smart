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
  { key: 'accepted' as const, label: 'Accepted', barClass: 'bg-[#86efac]' },
  { key: 'pending' as const, label: 'Pending', barClass: 'bg-[#c4b5fd]' },
  { key: 'other' as const, label: 'Other', barClass: 'bg-[#cbd5e1]' },
];

export function OnboardingTrendCard({
  inviteBreakdown,
  totalProvisioned,
  loading,
}: OnboardingTrendCardProps) {
  const max = Math.max(totalProvisioned, 1);

  return (
    <section className={`${bentoCardClass} lg:col-span-4`}>
      <h2 className={dashboardSectionTitleClass}>Onboarding Trend</h2>
      <p className={dashboardSectionSubtitleClass}>
        Current invite status across your cohort (historical monthly data is not available yet)
      </p>

      {loading ? (
        <div className={`${dashboardSkeletonClass} mt-6 h-40 w-full`} />
      ) : totalProvisioned === 0 ? (
        <p className="mt-8 text-[13px] text-[var(--ds-text-muted)]">
          No candidates onboarded yet. Onboard candidates to see invite status here.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {SEGMENTS.map((segment) => {
            const value = inviteBreakdown[segment.key];
            const width = `${Math.round((value / max) * 100)}%`;
            return (
              <div key={segment.key}>
                <div className="mb-1.5 flex items-center justify-between text-[12px]">
                  <span className="font-medium text-[var(--ds-text-secondary)]">
                    {segment.label}
                  </span>
                  <span className="font-semibold text-[var(--ds-text)]">{value}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--ds-surface-muted)]">
                  <div
                    className={`h-full rounded-full transition-all ${segment.barClass}`}
                    style={{ width }}
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
