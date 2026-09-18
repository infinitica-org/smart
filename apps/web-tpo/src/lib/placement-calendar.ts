import type { JobOpeningDto } from '@smart/contracts';

export type DriveEvent = {
  openingId: string;
  companyName: string;
  roleTitle: string;
  driveDate: string;
};

function toDriveEvent(opening: JobOpeningDto): DriveEvent | null {
  if (!opening.driveDate) return null;
  return {
    openingId: opening.openingId,
    companyName: opening.companyName,
    roleTitle: opening.roleTitle,
    driveDate: opening.driveDate,
  };
}

/** Every opening with a drive date on file, earliest first. */
export function allDriveEvents(openings: JobOpeningDto[]): DriveEvent[] {
  return openings
    .map(toDriveEvent)
    .filter((event): event is DriveEvent => event !== null)
    .sort((a, b) => a.driveDate.localeCompare(b.driveDate));
}

/** Drive events on or after `today` (an ISO date, e.g. `new Date().toISOString().slice(0, 10)`). */
export function upcomingDriveEvents(
  openings: JobOpeningDto[],
  today: string,
  limit?: number,
): DriveEvent[] {
  const upcoming = allDriveEvents(openings).filter((event) => event.driveDate >= today);
  return limit ? upcoming.slice(0, limit) : upcoming;
}

export type CalendarDay = {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  events: DriveEvent[];
};

function isoDate(year: number, monthIndex: number, day: number): string {
  const d = new Date(Date.UTC(year, monthIndex, day));
  return d.toISOString().slice(0, 10);
}

/**
 * A 6-week grid (42 days) for the given month, Sunday-first, with leading/
 * trailing days from the adjacent months so every week is complete — the
 * standard month-calendar layout.
 */
export function buildCalendarMonth(
  openings: JobOpeningDto[],
  year: number,
  monthIndex: number,
  today: string = new Date().toISOString().slice(0, 10),
): CalendarDay[] {
  const eventsByDate = new Map<string, DriveEvent[]>();
  for (const event of allDriveEvents(openings)) {
    const bucket = eventsByDate.get(event.driveDate) ?? [];
    bucket.push(event);
    eventsByDate.set(event.driveDate, bucket);
  }

  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const firstWeekday = firstOfMonth.getUTCDay(); // 0 = Sunday
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();

  const days: CalendarDay[] = [];

  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const dayOfMonth = daysInPrevMonth - i;
    const date = isoDate(year, monthIndex - 1, dayOfMonth);
    days.push({ date, dayOfMonth, inCurrentMonth: false, isToday: date === today, events: [] });
  }

  for (let dayOfMonth = 1; dayOfMonth <= daysInMonth; dayOfMonth += 1) {
    const date = isoDate(year, monthIndex, dayOfMonth);
    days.push({
      date,
      dayOfMonth,
      inCurrentMonth: true,
      isToday: date === today,
      events: eventsByDate.get(date) ?? [],
    });
  }

  let nextDay = 1;
  while (days.length % 7 !== 0 || days.length < 42) {
    const date = isoDate(year, monthIndex + 1, nextDay);
    days.push({
      date,
      dayOfMonth: nextDay,
      inCurrentMonth: false,
      isToday: date === today,
      events: [],
    });
    nextDay += 1;
  }

  return days;
}
