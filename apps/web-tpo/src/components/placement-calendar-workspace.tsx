'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import type { JobOpeningDto } from '@smart/contracts';
import { TpoBentoPageHeader } from './tpo-bento/TpoBentoPageHeader';
import { openingsApi } from '../lib/api';
import {
  buildCalendarMonth,
  upcomingDriveEvents,
  type DriveEvent,
} from '../lib/placement-calendar';
import {
  bentoCardClass,
  bentoCardMutedClass,
  bentoChipClass,
  bentoPageStackClass,
  dashboardErrorNoticeClass,
  dashboardHomeEmptySurfaceClass,
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
  dashboardSkeletonClass,
} from '../lib/tpo-dashboard-ui';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function monthLabel(year: number, monthIndex: number): string {
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDriveDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function PlacementCalendarWorkspace() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({
    year: now.getUTCFullYear(),
    monthIndex: now.getUTCMonth(),
  });
  const [openings, setOpenings] = useState<JobOpeningDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    openingsApi
      .list()
      .then((res) => {
        if (!active) return;
        setOpenings(res.openings);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(isSmartApiError(err) ? err.message : 'Failed to load placement drives.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const grid = useMemo(
    () => buildCalendarMonth(openings, cursor.year, cursor.monthIndex, today),
    [openings, cursor, today],
  );
  const upcoming = useMemo(() => upcomingDriveEvents(openings, today), [openings, today]);

  function goToPreviousMonth() {
    setCursor((prev) =>
      prev.monthIndex === 0
        ? { year: prev.year - 1, monthIndex: 11 }
        : { year: prev.year, monthIndex: prev.monthIndex - 1 },
    );
  }

  function goToNextMonth() {
    setCursor((prev) =>
      prev.monthIndex === 11
        ? { year: prev.year + 1, monthIndex: 0 }
        : { year: prev.year, monthIndex: prev.monthIndex + 1 },
    );
  }

  function goToToday() {
    setCursor({ year: now.getUTCFullYear(), monthIndex: now.getUTCMonth() });
  }

  return (
    <div className={bentoPageStackClass}>
      <TpoBentoPageHeader
        title="Placement Calendar"
        description="Track upcoming interview and hiring drives scheduled across your openings."
        icon={CalendarDays}
        accent="lavender"
        badge={<span className={bentoChipClass}>Placement</span>}
      />

      {error ? <div className={dashboardErrorNoticeClass}>{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <section className={`${bentoCardClass} lg:col-span-8`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={dashboardSectionTitleClass}>
              {monthLabel(cursor.year, cursor.monthIndex)}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goToToday}
                className="rounded-lg border border-[var(--ds-border)] px-2.5 py-1 text-[12px] font-medium text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-surface-hover)]"
              >
                Today
              </button>
              <button
                type="button"
                aria-label="Previous month"
                onClick={goToPreviousMonth}
                className="flex size-7 items-center justify-center rounded-lg border border-[var(--ds-border)] text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-surface-hover)]"
              >
                <ChevronLeft className="size-4" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={goToNextMonth}
                className="flex size-7 items-center justify-center rounded-lg border border-[var(--ds-border)] text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-surface-hover)]"
              >
                <ChevronRight className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className={`${dashboardSkeletonClass} mt-5 h-96 w-full rounded-2xl`} />
          ) : (
            <div className="mt-5 grid grid-cols-7 gap-1.5">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="px-1 pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]"
                >
                  {label}
                </div>
              ))}
              {grid.map((day) => (
                <div
                  key={day.date}
                  className={`min-h-[76px] rounded-xl border p-1.5 text-left ${
                    day.isToday
                      ? 'border-[var(--tpo-dash-primary)] bg-[var(--tpo-dash-accent-blue-soft)]'
                      : 'border-[var(--ds-border-subtle)]'
                  } ${day.inCurrentMonth ? '' : 'opacity-40'}`}
                >
                  <span
                    className={`text-[12px] ${day.isToday ? 'font-bold text-[var(--tpo-dash-primary)]' : 'font-medium text-[var(--ds-text-secondary)]'}`}
                  >
                    {day.dayOfMonth}
                  </span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {day.events.slice(0, 2).map((event) => (
                      <span
                        key={event.openingId}
                        title={`${event.companyName} · ${event.roleTitle}`}
                        className="truncate rounded bg-[var(--tpo-dash-accent-lavender-soft)] px-1 py-0.5 text-[10px] font-medium text-[var(--tpo-dash-accent-lavender)]"
                      >
                        {event.companyName}
                      </span>
                    ))}
                    {day.events.length > 2 ? (
                      <span className="text-[10px] text-[var(--ds-text-subtle)]">
                        +{day.events.length - 2} more
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${bentoCardClass} lg:col-span-4`}>
          <h2 className={dashboardSectionTitleClass}>Upcoming Drives</h2>
          <p className={dashboardSectionSubtitleClass}>All scheduled drives from today onward</p>

          {loading ? (
            <div className={`${dashboardSkeletonClass} mt-5 h-64 w-full rounded-2xl`} />
          ) : upcoming.length === 0 ? (
            <div
              className={`mt-5 flex flex-col items-center justify-center px-6 py-10 text-center ${dashboardHomeEmptySurfaceClass}`}
            >
              <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-[var(--tpo-dash-empty-icon-bg,#f1f5f9)] text-[var(--tpo-dash-empty-icon,#64748b)]">
                <CalendarDays className="size-5" strokeWidth={1.5} />
              </span>
              <p className="text-[13px] font-semibold text-[var(--ds-text)]">No upcoming drives</p>
              <p className="mt-1 max-w-[220px] text-[12px] leading-relaxed text-[var(--ds-text-muted)]">
                Drives with a date on file will appear here as they're scheduled.
              </p>
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {upcoming.map((event: DriveEvent) => (
                <li key={event.openingId} className={`${bentoCardMutedClass} !p-3`}>
                  <p className="truncate text-[13px] font-semibold text-[var(--ds-text)]">
                    {event.companyName}
                  </p>
                  <p className="truncate text-[12px] text-[var(--ds-text-secondary)]">
                    {event.roleTitle}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-[var(--tpo-dash-primary)]">
                    {formatDriveDate(event.driveDate)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
