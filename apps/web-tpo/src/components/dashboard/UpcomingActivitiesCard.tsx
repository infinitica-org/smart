import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import {
  bentoCardClass,
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
} from '../../lib/tpo-dashboard-ui';

export function UpcomingActivitiesCard() {
  return (
    <section className={`${bentoCardClass} lg:col-span-4`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className={dashboardSectionTitleClass}>Upcoming Activities</h2>
          <p className={dashboardSectionSubtitleClass}>Your scheduled placement activities</p>
        </div>
        <span className="text-[11px] font-medium text-[var(--ds-text-subtle)]">View calendar</span>
      </div>

      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-6 py-10 text-center">
        <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-[var(--ds-surface)] text-[var(--ds-text-muted)]">
          <CalendarDays className="size-5" strokeWidth={1.5} />
        </span>
        <p className="text-[14px] font-semibold text-[var(--ds-text)]">No upcoming activities</p>
        <p className="mt-1 max-w-[240px] text-[13px] leading-relaxed text-[var(--ds-text-muted)]">
          New drives and events will appear here when scheduling is available.
        </p>
        <Link
          href="/reports"
          className="mt-4 text-[12px] font-semibold text-[var(--ds-link)] hover:underline"
        >
          Browse reports
        </Link>
      </div>
    </section>
  );
}
