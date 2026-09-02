import { describe, expect, it } from 'vitest';
import type { ApplicationDto, JobOpeningDto } from '@smart/contracts';
import {
  ACTIVE_OPENING_STATUS,
  NEW_MATCH_STAGE,
  activeOpenings,
  countApplicationsByStage,
  countNewMatches,
  emptyStageCounts,
  pipelineStages,
  recentMatches,
} from './company-dashboard';

const openingId = '11111111-1111-4111-8111-111111111111';
const otherOpeningId = '11111111-1111-4111-8111-111111111112';
const createdAt = '2026-09-02T06:00:00.000Z';

function opening(overrides: Partial<JobOpeningDto> = {}): JobOpeningDto {
  return {
    openingId,
    institutionId: '22222222-2222-4222-8222-222222222222',
    companyName: 'Infinitica Labs',
    roleTitle: 'Backend Engineer',
    domain: 'SOFTWARE_IT',
    requiredSkills: [],
    minYearsExperience: 1,
    maxYearsExperience: 3,
    location: 'Coimbatore',
    employmentType: 'FULL_TIME',
    headcount: 2,
    status: 'OPEN',
    createdAt,
    ...overrides,
  };
}

function application(overrides: Partial<ApplicationDto> = {}): ApplicationDto {
  return {
    applicationId: '33333333-3333-4333-8333-333333333331',
    openingId,
    studentId: '44444444-4444-4444-8444-444444444444',
    studentName: 'Aarav Sharma',
    stage: 'APPLIED',
    matchScore: 0.8,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

describe('CO-T04 company dashboard mapping', () => {
  it('counts only JobOpeningStatus.OPEN as active openings', () => {
    const listed = activeOpenings([
      opening({ openingId: '11111111-1111-4111-8111-111111111111', status: 'OPEN' }),
      opening({ openingId: '11111111-1111-4111-8111-111111111112', status: 'DRAFT' }),
      opening({ openingId: '11111111-1111-4111-8111-111111111113', status: 'CLOSED' }),
      opening({
        openingId: '11111111-1111-4111-8111-111111111114',
        status: 'OPEN',
        roleTitle: 'Analyst',
      }),
    ]);

    expect(ACTIVE_OPENING_STATUS).toBe('OPEN');
    expect(listed.map((row) => row.openingId)).toEqual([
      '11111111-1111-4111-8111-111111111111',
      '11111111-1111-4111-8111-111111111114',
    ]);
    expect(listed).toHaveLength(2);
  });

  it('treats an empty opening list as zero active openings', () => {
    expect(activeOpenings([])).toEqual([]);
  });

  it('counts new matches as APPLIED only — not SHORTLISTED or INTERVIEW', () => {
    expect(NEW_MATCH_STAGE).toBe('APPLIED');
    expect(
      countNewMatches([
        application({ applicationId: '33333333-3333-4333-8333-333333333331', stage: 'APPLIED' }),
        application({ applicationId: '33333333-3333-4333-8333-333333333332', stage: 'APPLIED' }),
        application({
          applicationId: '33333333-3333-4333-8333-333333333333',
          stage: 'SHORTLISTED',
        }),
        application({ applicationId: '33333333-3333-4333-8333-333333333334', stage: 'INTERVIEW' }),
      ]),
    ).toBe(2);
  });

  it('returns zero new matches when the ATS is empty', () => {
    expect(countNewMatches([])).toBe(0);
  });

  it('counts pipeline stages from the canonical AtsStage enum only', () => {
    const counts = countApplicationsByStage([
      application({ applicationId: '33333333-3333-4333-8333-333333333331', stage: 'APPLIED' }),
      application({
        applicationId: '33333333-3333-4333-8333-333333333332',
        stage: 'SHORTLISTED',
      }),
      application({
        applicationId: '33333333-3333-4333-8333-333333333333',
        stage: 'SHORTLISTED',
      }),
      application({ applicationId: '33333333-3333-4333-8333-333333333334', stage: 'INTERVIEW' }),
      application({ applicationId: '33333333-3333-4333-8333-333333333335', stage: 'OFFER' }),
    ]);

    expect(counts).toEqual({
      ...emptyStageCounts(),
      APPLIED: 1,
      SHORTLISTED: 2,
      INTERVIEW: 1,
      OFFER: 1,
    });
    expect(pipelineStages()).toEqual([
      'APPLIED',
      'SHORTLISTED',
      'INTERVIEW',
      'OFFER',
      'REJECTED',
      'WITHDRAWN',
    ]);
    expect(counts).not.toHaveProperty('AI_VERIFIED');
    expect(counts).not.toHaveProperty('HIRED');
    expect(counts).not.toHaveProperty('SENT_TO_COMPANY');
  });

  it('lists recent matches by createdAt and joins live opening metadata', () => {
    const older = application({
      applicationId: '33333333-3333-4333-8333-333333333331',
      studentName: 'Older Match',
      createdAt: '2026-09-01T06:00:00.000Z',
    });
    const newer = application({
      applicationId: '33333333-3333-4333-8333-333333333332',
      studentName: 'Newer Match',
      openingId: otherOpeningId,
      createdAt: '2026-09-02T12:00:00.000Z',
      matchScore: 0.91,
    });
    const orphaned = application({
      applicationId: '33333333-3333-4333-8333-333333333333',
      openingId: '11111111-1111-4111-8111-111111111199',
      studentName: 'Orphaned',
      createdAt: '2026-09-03T12:00:00.000Z',
    });

    const listed = recentMatches(
      [older, newer, orphaned],
      [
        opening(),
        opening({
          openingId: otherOpeningId,
          companyName: 'Northwind',
          roleTitle: 'Data Analyst',
        }),
      ],
      8,
    );

    expect(listed.map((row) => row.studentName)).toEqual(['Newer Match', 'Older Match']);
    expect(listed[0]).toMatchObject({
      roleTitle: 'Data Analyst',
      companyName: 'Northwind',
      matchScore: 0.91,
    });
    expect(listed.some((row) => row.studentName === 'Orphaned')).toBe(false);
  });

  it('caps the recent-matches list and does not invent a match score', () => {
    const openings = [opening()];
    const applications = Array.from({ length: 10 }, (_, index) =>
      application({
        applicationId: `33333333-3333-4333-8333-33333333333${index.toString(16)}`,
        studentName: `Candidate ${index}`,
        matchScore: null,
        createdAt: `2026-09-02T0${index}:00:00.000Z`,
      }),
    );

    const listed = recentMatches(applications, openings, 3);
    expect(listed).toHaveLength(3);
    expect(listed[0]?.studentName).toBe('Candidate 9');
    expect(listed.every((row) => row.matchScore === null)).toBe(true);
  });
});
