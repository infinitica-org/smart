import { describe, expect, it } from 'vitest';
import type { InstitutionStudentDto, SkillClaimDto } from '@smart/contracts';
import {
  buildUniversityRosterRows,
  computeUniversityDashboardMetrics,
  verificationStateForStudent,
} from './university-dashboard-metrics';

const student = (overrides: Partial<InstitutionStudentDto>): InstitutionStudentDto => ({
  userId: '11111111-1111-4111-8111-111111111111',
  email: 'a@school.edu',
  fullName: 'Alex Student',
  batchId: null,
  batchName: 'Comp. Sci',
  inviteStatus: 'ACCEPTED',
  lastSentAt: null,
  acceptedAt: null,
  heldAt: null,
  linkedinUrl: null,
  githubUrl: null,
  ...overrides,
});

const claim = (overrides: Partial<SkillClaimDto>): SkillClaimDto =>
  ({
    claimId: '22222222-2222-4222-8222-222222222222',
    studentId: '11111111-1111-4111-8111-111111111111',
    skillCode: 'REACT',
    proficiency: 'ADVANCED',
    status: 'VERIFIED',
    strikes: 0,
    lockedUntil: null,
    lastAttemptId: null,
    ...overrides,
  }) as SkillClaimDto;

describe('computeUniversityDashboardMetrics', () => {
  it('counts whitelisted students, fully verified, and summed application counts', () => {
    const students = [
      student({ userId: '11111111-1111-4111-8111-111111111111' }),
      student({
        userId: '33333333-3333-4333-8333-333333333333',
        inviteStatus: 'PENDING',
      }),
    ];
    const claims = [claim({})];
    expect(computeUniversityDashboardMetrics(students, claims, 8)).toEqual({
      whitelisted: 2,
      fullyVerified: 1,
      opportunitiesMatched: 8,
    });
  });
});

describe('verificationStateForStudent', () => {
  it('returns Full when the student has a verified claim', () => {
    const map = new Map([['11111111-1111-4111-8111-111111111111', 1]]);
    expect(verificationStateForStudent(student({}), map)).toBe('Full');
  });

  it('returns Partial for accepted invites without verified claims', () => {
    expect(verificationStateForStudent(student({ inviteStatus: 'ACCEPTED' }), new Map())).toBe(
      'Partial',
    );
  });

  it('returns Pending for non-accepted invites', () => {
    expect(verificationStateForStudent(student({ inviteStatus: 'PENDING' }), new Map())).toBe(
      'Pending',
    );
  });
});

describe('buildUniversityRosterRows', () => {
  it('maps major from batch name and verification badge', () => {
    const rows = buildUniversityRosterRows([student({})], [claim({})]);
    expect(rows[0]).toMatchObject({
      name: 'Alex Student',
      major: 'Comp. Sci',
      verificationState: 'Full',
      hiredLabel: '—',
    });
  });
});
