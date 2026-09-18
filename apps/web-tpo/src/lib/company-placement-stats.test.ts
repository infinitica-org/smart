import { describe, expect, it } from 'vitest';
import type { PlacementRecordDto } from '@smart/contracts';
import { computeCompanyPlacementStats } from './company-placement-stats';

const record = (overrides: Partial<PlacementRecordDto>): PlacementRecordDto => ({
  recordId: '00000000-0000-4000-8000-000000000001',
  studentId: '00000000-0000-4000-8000-000000000010',
  trackCode: 'TECH_FULLSTACK',
  tierAtPlacement: 'GOLD',
  placementCycle: '2025-AUTUMN',
  companyName: 'Infinitica Labs',
  outcome: 'ACCEPTED',
  interviewOffered: true,
  jobOffered: true,
  offeredPackageLpa: 10,
  recordedAt: '2025-10-01T00:00:00.000Z',
  ...overrides,
});

describe('computeCompanyPlacementStats', () => {
  it('returns zeroed stats for no records', () => {
    const stats = computeCompanyPlacementStats([]);
    expect(stats.totalPlaced).toBe(0);
    expect(stats.highestCtc).toBeNull();
    expect(stats.medianCtc).toBeNull();
    expect(stats.lowestCtc).toBeNull();
    expect(stats.yearly).toEqual([]);
  });

  it('only counts ACCEPTED outcomes as placed', () => {
    const stats = computeCompanyPlacementStats([
      record({ outcome: 'ACCEPTED' }),
      record({ outcome: 'DECLINED', offeredPackageLpa: 20 }),
      record({ outcome: 'OFFERED', offeredPackageLpa: 30 }),
    ]);
    expect(stats.totalPlaced).toBe(1);
    expect(stats.highestCtc).toBe(10);
  });

  it('computes highest, median, and lowest CTC across accepted offers', () => {
    const stats = computeCompanyPlacementStats([
      record({ offeredPackageLpa: 6 }),
      record({ offeredPackageLpa: 12 }),
      record({ offeredPackageLpa: 9 }),
    ]);
    expect(stats.highestCtc).toBe(12);
    expect(stats.lowestCtc).toBe(6);
    expect(stats.medianCtc).toBe(9);
  });

  it('averages an even number of values for the median', () => {
    const stats = computeCompanyPlacementStats([
      record({ offeredPackageLpa: 4 }),
      record({ offeredPackageLpa: 8 }),
    ]);
    expect(stats.medianCtc).toBe(6);
  });

  it('groups placements by the year parsed from the placement cycle', () => {
    const stats = computeCompanyPlacementStats([
      record({ placementCycle: '2024-SPRING', offeredPackageLpa: 8 }),
      record({ placementCycle: '2025-AUTUMN', offeredPackageLpa: 12 }),
      record({ placementCycle: '2025-SUMMER', offeredPackageLpa: 14 }),
    ]);
    expect(stats.yearly).toEqual([
      { year: '2025', placed: 2, highestCtc: 14, averageCtc: 13 },
      { year: '2024', placed: 1, highestCtc: 8, averageCtc: 8 },
    ]);
  });

  it('counts a placement with no CTC on file without affecting CTC stats', () => {
    const stats = computeCompanyPlacementStats([
      record({ offeredPackageLpa: null }),
      record({ offeredPackageLpa: 10 }),
    ]);
    expect(stats.totalPlaced).toBe(2);
    expect(stats.highestCtc).toBe(10);
    expect(stats.lowestCtc).toBe(10);
  });
});
