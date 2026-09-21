'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { openingsApi } from '../../lib/api';
import { upcomingDriveEvents, type DriveEvent } from '../../lib/placement-calendar';
import {
  bentoCardClass,
  dashboardHomeEmptySurfaceClass,
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
  dashboardSkeletonClass,
} from '../../lib/tpo-dashboard-ui';

function formatDriveDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function UpcomingActivitiesCard() {
  const [events, setEvents] = useState<DriveEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    openingsApi
      .list()
      .then((res) => {
        if (!active) return;
        const today = new Date().toISOString().slice(0, 10);
        setEvents(upcomingDriveEvents(res.openings, today, 4));
      })
      .catch(() => {
        if (active) setEvents([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className={`${bentoCardClass} lg:col-span-4`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className={dashboardSectionTitleClass}>Upcoming Activities</h2>
          <p className={dashboardSectionSubtitleClass}>Your scheduled placement activities</p>
        </div>
        <Link
          href="/calendar"
          className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--ds-text-subtle)] transition-colors hover:text-[var(--ds-text)]"
        >
          View calendar <ChevronRight className="size-3.5" strokeWidth={1.5} />
        </Link>
      </div>

      {loading ? (
        <div className={`${dashboardSkeletonClass} mt-8 h-36 w-full rounded-2xl`} />
      ) : events.length === 0 ? (
        <div
          className={`mt-8 flex flex-col items-center justify-center px-6 py-12 text-center ${dashboardHomeEmptySurfaceClass}`}
        >
          <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--tpo-dash-empty-icon-bg,#f1f5f9)] text-[var(--tpo-dash-empty-icon,#64748b)] shadow-[var(--ds-card-shadow)]">
            <CalendarDays className="size-5" strokeWidth={1.5} />
          </span>
          <p className="text-[14px] font-semibold text-[var(--ds-text)]">No upcoming activities</p>
          <p className="mt-1.5 max-w-[240px] text-[13px] leading-relaxed text-[var(--ds-text-muted)]">
            Drives with a date on file will appear here as they're scheduled.
          </p>
          <Link
            href="/openings/create"
            className="mt-3 text-[12px] font-semibold text-[var(--ds-link)] hover:underline"
          >
            Schedule a drive
          </Link>
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-1">
          {events.map((event) => (
            <li key={event.openingId}>
              <Link
                href="/openings"
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[var(--ds-surface-hover)]"
              >
                <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--tpo-accent-tint)] text-[var(--ds-text)]">
                  <CalendarDays className="size-4" strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[var(--ds-text)]">
                    {event.companyName} · {event.roleTitle}
                  </span>
                  <span className="block text-[12px] text-[var(--ds-text-muted)]">
                    {formatDriveDate(event.driveDate)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
