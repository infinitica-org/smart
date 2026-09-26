/**
 * UNI-05 — career events store UTC instants plus an IANA timezone. These helpers convert between the
 * wall-clock time a person types in a chosen timezone and the UTC instant we send and store, and format
 * an instant in the event's own timezone (not the viewer's).
 */

const FALLBACK_ZONES = [
  'Asia/Kolkata',
  'UTC',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
];

export const DEFAULT_EVENT_TIMEZONE = 'Asia/Kolkata';

export function listTimeZones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  try {
    const zones = intl.supportedValuesOf?.('timeZone');
    if (zones && zones.length > 0) return zones.includes('UTC') ? zones : [...zones, 'UTC'];
  } catch {
    // fall through to the short list
  }
  return FALLBACK_ZONES;
}

/** The browser's timezone when it is a valid IANA zone, else the default. */
export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_EVENT_TIMEZONE;
  } catch {
    return DEFAULT_EVENT_TIMEZONE;
  }
}

/** Offset of `timeZone` from UTC at instant `at`, in milliseconds (east of UTC is positive). */
function zoneOffsetMs(at: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(at));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - Math.floor(at / 1000) * 1000;
}

/**
 * "2026-10-05T14:30" typed in `timeZone` to the UTC ISO instant. Returns null for input that is not a
 * complete local date-time or a timezone the browser does not know.
 */
export function zonedLocalToUtcIso(local: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return null;
  const [year = 0, month = 1, day = 1, hour = 0, minute = 0] = match.slice(1).map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  if (Number.isNaN(wall)) return null;
  try {
    // Two passes settle the offset even when the wall time is close to a DST change.
    const first = wall - zoneOffsetMs(wall, timeZone);
    const instant = wall - zoneOffsetMs(first, timeZone);
    return new Date(instant).toISOString();
  } catch {
    return null;
  }
}

/** A UTC ISO instant as the "YYYY-MM-DDTHH:mm" wall time in `timeZone`, for a datetime-local input. */
export function utcToZonedLocal(iso: string, timeZone: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '';
  const shifted = new Date(at + zoneOffsetMs(at, timeZone));
  return shifted.toISOString().slice(0, 16);
}

/** "Mon, 5 Oct 2026, 2:30 pm IST" — always in the event's timezone. */
export function formatEventTime(iso: string, timeZone: string, locale = 'en-IN'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/** Start with the full date, end as time only when it is the same day in that timezone. */
export function formatEventRange(
  startsAt: string,
  endsAt: string,
  timeZone: string,
  locale = 'en-IN',
): string {
  const start = formatEventTime(startsAt, timeZone, locale);
  const sameDay =
    utcToZonedLocal(startsAt, timeZone).slice(0, 10) ===
    utcToZonedLocal(endsAt, timeZone).slice(0, 10);
  if (!sameDay) return `${start} – ${formatEventTime(endsAt, timeZone, locale)}`;
  const endTime = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(endsAt));
  return `${start} – ${endTime}`;
}
