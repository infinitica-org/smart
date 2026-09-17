import { BarChart2, Code2, Cpu } from 'lucide-react';
import { DOMAIN_CATEGORY_KEYS } from '../../lib/tpo-dashboard-metrics';
import {
  bentoCardClass,
  bentoCardMutedClass,
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
  dashboardSkeletonClass,
} from '../../lib/tpo-dashboard-ui';

const DOMAIN_ICONS = [Code2, Cpu, BarChart2] as const;

type DomainReadinessCardProps = {
  categoryCounts: Record<string, number>;
  loading: boolean;
};

export function DomainReadinessCard({ categoryCounts, loading }: DomainReadinessCardProps) {
  return (
    <section className={`${bentoCardClass} lg:col-span-8`}>
      <h2 className={dashboardSectionTitleClass}>Domain Readiness</h2>
      <p className={dashboardSectionSubtitleClass}>Verified credentials by skill category</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {DOMAIN_CATEGORY_KEYS.map((domain, index) => {
          const Icon = DOMAIN_ICONS[index] ?? Code2;
          const count = categoryCounts[domain.id] ?? 0;
          return (
            <div key={domain.id} className={bentoCardMutedClass}>
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ds-surface)] text-[var(--ds-text-secondary)]">
                  <Icon className="size-[18px]" strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-semibold text-[var(--ds-text)]">
                    {domain.title}
                  </h3>
                  <p className="text-[11px] text-[var(--ds-text-muted)]">{domain.subtitle}</p>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between border-t border-[var(--ds-border-subtle)] pt-3">
                <span className="text-[11px] font-medium text-[var(--ds-text-muted)]">
                  Verified credentials
                </span>
                {loading ? (
                  <div className={`${dashboardSkeletonClass} h-6 w-8`} />
                ) : (
                  <span className="text-xl font-semibold text-[var(--ds-text)]">{count}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
