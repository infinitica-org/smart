import type { LucideIcon } from 'lucide-react';
import {
  bentoCardClass,
  dashboardMetricValueClass,
  dashboardSkeletonClass,
} from '../../lib/tpo-dashboard-ui';

type DashboardMetricCardProps = {
  label: string;
  value: string | number;
  hint: string;
  footnote: string;
  icon: LucideIcon;
  iconWrapClass: string;
  loading: boolean;
};

export function DashboardMetricCard({
  label,
  value,
  hint,
  footnote,
  icon: Icon,
  iconWrapClass,
  loading,
}: DashboardMetricCardProps) {
  return (
    <article className={bentoCardClass}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <p className="text-[12px] font-medium text-[var(--ds-text-muted)]">{label}</p>
          {loading ? (
            <div className={`${dashboardSkeletonClass} h-8 w-16`} />
          ) : (
            <p className={dashboardMetricValueClass}>{value}</p>
          )}
          <p className="text-[12px] text-[var(--ds-text-subtle)]">{hint}</p>
        </div>
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${iconWrapClass}`}
        >
          <Icon className="size-[18px]" strokeWidth={1.5} />
        </span>
      </div>
      <div className="mt-4 border-t border-[var(--ds-border-subtle)] pt-3">
        <p className="text-[11px] font-medium text-[var(--ds-text-muted)]">{footnote}</p>
        <div
          aria-hidden
          className="mt-2 h-6 w-full rounded-md bg-gradient-to-r from-[var(--ds-surface-muted)] to-transparent opacity-80"
        />
      </div>
    </article>
  );
}
