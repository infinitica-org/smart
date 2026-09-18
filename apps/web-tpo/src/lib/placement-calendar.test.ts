import { describe, expect, it } from 'vitest';
import type { JobOpeningDto } from '@smart/contracts';
import { allDriveEvents, buildCalendarMonth, upcomingDriveEvents } from './placement-calendar';

const opening = (overrides: Partial<JobOpeningDto>): JobOpeningDto =>
  ({
    openingId: '11111111-1111-4111-8111-111111111111',
    institutionId: '22222222-2222-4222-8222-222222222222',
    companyName: 'Infinitica Labs',
    roleTitle: 'Backend Engineer',
    domain: 'SOFTWARE_IT',
    requiredSkills: [],
    minYearsExperience: 0,
    maxYearsExperience: 3,
    location: 'Coimbatore',
    employmentType: 'FULL_TIME',
    status: 'OPEN',
    createdAt: '2026-09-02T06:00:00.000Z',
    ...overrides,
  }) as JobOpeningDto;

describe('allDriveEvents', () => {
  it('ignores openings with no drive date', () => {
    expect(allDriveEvents([opening({})])).toEqual([]);
  });

  it('sorts drive events chronologically', () => {
    const events = allDriveEvents([
      opening({ openingId: 'a', driveDate: '2026-10-15' }),
      opening({ openingId: 'b', driveDate: '2026-09-20' }),
    ]);
    expect(events.map((e) => e.openingId)).toEqual(['b', 'a']);
  });
});

describe('upcomingDriveEvents', () => {
  it('excludes drives before today and applies a limit', () => {
    const openings = [
      opening({ openingId: 'past', driveDate: '2026-09-01' }),
      opening({ openingId: 'today', driveDate: '2026-09-17' }),
      opening({ openingId: 'soon', driveDate: '2026-09-20' }),
      opening({ openingId: 'later', driveDate: '2026-10-01' }),
    ];
    const upcoming = upcomingDriveEvents(openings, '2026-09-17', 2);
    expect(upcoming.map((e) => e.openingId)).toEqual(['today', 'soon']);
  });
});

describe('buildCalendarMonth', () => {
  it('always returns a 6-week (42 day) grid', () => {
    const grid = buildCalendarMonth([], 2026, 8); // September 2026
    expect(grid).toHaveLength(42);
  });

  it('marks the current-month days and attaches matching drive events', () => {
    const openings = [opening({ driveDate: '2026-09-17' })];
    const grid = buildCalendarMonth(openings, 2026, 8, '2026-09-17');

    const day17 = grid.find((d) => d.date === '2026-09-17');
    expect(day17?.inCurrentMonth).toBe(true);
    expect(day17?.isToday).toBe(true);
    expect(day17?.events).toHaveLength(1);
    expect(day17?.events[0]?.companyName).toBe('Infinitica Labs');
  });

  it('pads leading/trailing days from adjacent months', () => {
    const grid = buildCalendarMonth([], 2026, 8);
    expect(grid[0]?.inCurrentMonth).toBe(false);
    expect(grid[grid.length - 1]?.inCurrentMonth).toBe(false);
  });
});
