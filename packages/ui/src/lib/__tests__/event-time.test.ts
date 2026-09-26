import { describe, expect, it } from 'vitest';
import {
  formatEventRange,
  formatEventTime,
  utcToZonedLocal,
  zonedLocalToUtcIso,
} from '../event-time';

describe('event time helpers', () => {
  it('converts wall time in a timezone to the UTC instant (IST is UTC+5:30)', () => {
    expect(zonedLocalToUtcIso('2026-10-05T14:30', 'Asia/Kolkata')).toBe('2026-10-05T09:00:00.000Z');
    expect(zonedLocalToUtcIso('2026-10-05T14:30', 'UTC')).toBe('2026-10-05T14:30:00.000Z');
  });

  it('honours daylight saving in the chosen zone', () => {
    // New York is UTC-4 in October (EDT) and UTC-5 in December (EST).
    expect(zonedLocalToUtcIso('2026-10-05T09:00', 'America/New_York')).toBe(
      '2026-10-05T13:00:00.000Z',
    );
    expect(zonedLocalToUtcIso('2026-12-05T09:00', 'America/New_York')).toBe(
      '2026-12-05T14:00:00.000Z',
    );
  });

  it('round-trips through a datetime-local value', () => {
    const iso = zonedLocalToUtcIso('2026-10-05T14:30', 'Asia/Kolkata') ?? '';
    expect(utcToZonedLocal(iso, 'Asia/Kolkata')).toBe('2026-10-05T14:30');
  });

  it('rejects incomplete input and unknown zones', () => {
    expect(zonedLocalToUtcIso('2026-10-05', 'UTC')).toBeNull();
    expect(zonedLocalToUtcIso('2026-10-05T14:30', 'Mars/Base')).toBeNull();
  });

  it('formats in the event timezone, not the viewer timezone', () => {
    expect(formatEventTime('2026-10-05T09:00:00.000Z', 'Asia/Kolkata')).toMatch(/2:30/);
    expect(
      formatEventRange('2026-10-05T09:00:00.000Z', '2026-10-05T11:00:00.000Z', 'Asia/Kolkata'),
    ).toMatch(/2:30.*4:30/);
  });
});
