import { describe, expect, it } from 'vitest';
import type { JobOpeningDto } from '@smart/contracts';
import { aggregateCampusCompanies } from './company-repository';

function opening(overrides: Partial<JobOpeningDto>): JobOpeningDto {
  return {
    openingId: '11111111-1111-4111-8111-111111111111',
    institutionId: '22222222-2222-4222-8222-222222222222',
    companyName: 'Acme',
    roleTitle: 'Engineer',
    domain: 'SOFTWARE_IT',
    requiredSkills: [
      { skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION', minProficiency: 'BEGINNER' },
    ],
    minYearsExperience: 0,
    maxYearsExperience: 2,
    location: 'Bengaluru',
    employmentType: 'FULL_TIME',
    headcount: 1,
    status: 'DRAFT',
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('aggregateCampusCompanies', () => {
  it('returns an empty list when there are no openings', () => {
    expect(aggregateCampusCompanies([])).toEqual([]);
  });

  it('groups openings by company name and counts active roles', () => {
    const rows = aggregateCampusCompanies([
      opening({
        openingId: 'a',
        companyName: 'Infinitica Labs',
        status: 'OPEN',
        createdAt: '2026-09-10T00:00:00.000Z',
        companyLogoUrl: 'https://cdn.example/logo.png',
      }),
      opening({
        openingId: 'b',
        companyName: 'Infinitica Labs',
        status: 'DRAFT',
        createdAt: '2026-09-05T00:00:00.000Z',
        location: 'Coimbatore',
      }),
      opening({
        openingId: 'c',
        companyName: 'Other Corp',
        status: 'OPEN',
        createdAt: '2026-09-08T00:00:00.000Z',
      }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.companyName).toBe('Infinitica Labs');
    expect(rows[0]?.openingCount).toBe(2);
    expect(rows[0]?.activeOpenings).toBe(1);
    expect(rows[0]?.companyLogoUrl).toBe('https://cdn.example/logo.png');
    expect(rows[0]?.locations.sort()).toEqual(['Bengaluru', 'Coimbatore'].sort());
  });
});
