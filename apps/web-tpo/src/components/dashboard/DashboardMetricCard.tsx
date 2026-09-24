import type { LucideIcon } from 'lucide-react';
import {
  bentoCardClass,
  dashboardMetricAccentStyles,
  dashboardMetricHintClass,
  dashboardMetricLabelClass,
  dashboardMetricValueClass,
  dashboardSkeletonClass,
  type DashboardAccentKey,
} from '../../lib/tpo-dashboard-ui';

type DashboardMetricCardProps = {
  label: string;
  value: string | number;
  hint: string;
  footnote: string;
  icon: LucideIcon;
  accent: DashboardAccentKey;
  loading: boolean;
};

export function DashboardMetricCard({
  label,
  value,
  hint,
  footnote,
  icon: Icon,
  accent,
  loading,
}: DashboardMetricCardProps) {
  const accentStyle = dashboardMetricAccentStyles[accent];

  return (
    <article className={`${bentoCardClass} ${accentStyle.cardSurface}`}>
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-2.5">
          <p className={dashboardMetricLabelClass}>{label}</p>
          {loading ? (
            <div className={`${dashboardSkeletonClass} h-9 w-16`} />
          ) : (
            <p className={dashboardMetricValueClass}>{value}</p>
          )}
          <p className={dashboardMetricHintClass}>{hint}</p>
        </div>
        <span
          className={`relative flex size-10 shrink-0 items-center justify-center rounded-lg ${accentStyle.iconWrap}`}
        >
          <Icon className="size-[18px]" strokeWidth={1.5} />
        </span>
      </div>
      <div className="relative mt-4 border-t border-[var(--ds-border-subtle)] pt-3">
        <p className="text-[12px] font-medium text-[var(--ds-text-muted)]">{footnote}</p>
      </div>
    </article>
  );
}
