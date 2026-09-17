import { CalendarDays } from 'lucide-react';
import {
  bentoCardClass,
  dashboardHomeEmptySurfaceClass,
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

      <div
        className={`mt-8 flex flex-col items-center justify-center px-6 py-12 text-center ${dashboardHomeEmptySurfaceClass}`}
      >
        <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--tpo-dash-empty-icon-bg,#f1f5f9)] text-[var(--tpo-dash-empty-icon,#64748b)] shadow-[var(--ds-card-shadow)]">
          <CalendarDays className="size-5" strokeWidth={1.5} />
        </span>
        <p className="text-[14px] font-semibold text-[var(--ds-text)]">No upcoming activities</p>
        <p className="mt-1.5 max-w-[240px] text-[13px] leading-relaxed text-[var(--ds-text-muted)]">
          New drives and events will appear here
        </p>
      </div>
    </section>
  );
}
