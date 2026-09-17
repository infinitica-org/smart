import { describe, expect, it } from 'vitest';
import type { InstitutionStudentDto, SkillClaimDto } from '@smart/contracts';
import { computeDashboardMetrics, greetingForHour } from './tpo-dashboard-metrics';

const student = (overrides: Partial<InstitutionStudentDto>): InstitutionStudentDto => ({
  userId: '00000000-0000-4000-8000-000000000001',
  email: 'a@school.edu',
  fullName: 'Ada Lovelace',
  batchId: null,
  batchName: null,
  inviteStatus: 'PENDING',
  lastSentAt: null,
  acceptedAt: null,
  heldAt: null,
  linkedinUrl: null,
  githubUrl: null,
  ...overrides,
});

const claim = (overrides: Partial<SkillClaimDto>): SkillClaimDto =>
  ({
    claimId: '00000000-0000-4000-8000-000000000099',
    studentId: '00000000-0000-4000-8000-000000000001',
    skillCode: 'PYTHON',
    proficiency: 'INTERMEDIATE',
    status: 'VERIFIED',
    strikes: 0,
    lockedUntil: null,
    lastAttemptId: null,
    ...overrides,
  }) as SkillClaimDto;

describe('computeDashboardMetrics', () => {
  it('computes onboarding rate and verified counts', () => {
    const metrics = computeDashboardMetrics(
      [
        student({ inviteStatus: 'ACCEPTED' }),
        student({ userId: '00000000-0000-4000-8000-000000000002', inviteStatus: 'PENDING' }),
      ],
      [claim({ status: 'VERIFIED' }), claim({ status: 'DECLARED' })],
    );

    expect(metrics.totalProvisioned).toBe(2);
    expect(metrics.invitesAccepted).toBe(1);
    expect(metrics.onboardingRate).toBe(50);
    expect(metrics.verifiedClaimsCount).toBe(1);
    expect(metrics.inviteBreakdown).toEqual({ accepted: 1, pending: 1, other: 0 });
  });

  it('groups verified claims by skill category', () => {
    const metrics = computeDashboardMetrics(
      [],
      [claim({ skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT', status: 'VERIFIED' })],
    );
    expect(metrics.categoryCounts.PROGRAMMING_LANGUAGES).toBe(1);
  });
});

describe('greetingForHour', () => {
  it('returns time-of-day greetings', () => {
    expect(greetingForHour(9)).toBe('Good morning,');
    expect(greetingForHour(14)).toBe('Good afternoon,');
    expect(greetingForHour(20)).toBe('Good evening,');
  });
});
