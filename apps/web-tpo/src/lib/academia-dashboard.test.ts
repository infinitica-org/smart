import { describe, expect, it } from 'vitest';
import type {
  ApplicationDto,
  BatchDto,
  InstitutionStudentDto,
  SkillClaimDto,
} from '@smart/contracts';
import {
  countApplicationsByStage,
  countInviteSnapshot,
  countSkillClaimsByStatus,
  emptyStageCounts,
  sortBatchesByName,
} from './academia-dashboard';

const openingId = '11111111-1111-4111-8111-111111111111';
const createdAt = '2026-09-02T06:00:00.000Z';

function application(stage: ApplicationDto['stage'], id: string): ApplicationDto {
  return {
    applicationId: id,
    openingId,
    studentId: '44444444-4444-4444-8444-444444444444',
    stage,
    matchScore: 0.8,
    createdAt,
    updatedAt: createdAt,
  };
}

function claim(status: SkillClaimDto['status'], id: string): SkillClaimDto {
  return {
    claimId: id,
    studentId: '44444444-4444-4444-8444-444444444444',
    skillCode: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
    proficiency: 'INTERMEDIATE',
    status,
    strikes: 0,
    lockedUntil: null,
    lastAttemptId: null,
  };
}

function student(
  inviteStatus: InstitutionStudentDto['inviteStatus'],
  heldAt: string | null = null,
): InstitutionStudentDto {
  return {
    userId: '55555555-5555-4555-8555-555555555555',
    email: 'aarav@example.com',
    fullName: 'Aarav Sharma',
    batchId: null,
    batchName: null,
    inviteStatus,
    lastSentAt: null,
    acceptedAt: inviteStatus === 'ACCEPTED' ? createdAt : null,
    heldAt,
  };
}

describe('AC-T07 academia dashboard mapping', () => {
  it('counts live ATS stages and does not invent SENT_TO_COMPANY', () => {
    const counts = countApplicationsByStage([
      application('SHORTLISTED', '33333333-3333-4333-8333-333333333331'),
      application('SHORTLISTED', '33333333-3333-4333-8333-333333333332'),
      application('INTERVIEW', '33333333-3333-4333-8333-333333333333'),
      application('OFFER', '33333333-3333-4333-8333-333333333334'),
    ]);

    expect(counts).toEqual({
      ...emptyStageCounts(),
      SHORTLISTED: 2,
      INTERVIEW: 1,
      OFFER: 1,
    });
    expect(counts).not.toHaveProperty('SENT_TO_COMPANY');
    expect(counts).not.toHaveProperty('AI_VERIFIED');
    expect(counts).not.toHaveProperty('HIRED');
  });

  it('returns zeros for an empty application list', () => {
    expect(countApplicationsByStage([])).toEqual(emptyStageCounts());
  });

  it('maps skill-claim statuses from the contract enum only', () => {
    const counts = countSkillClaimsByStatus([
      claim('VERIFIED', '66666666-6666-4666-8666-666666666661'),
      claim('VERIFIED', '66666666-6666-4666-8666-666666666662'),
      claim('DECLARED', '66666666-6666-4666-8666-666666666663'),
      claim('LOCKED', '66666666-6666-4666-8666-666666666664'),
      claim('BEGINNER_REATTEMPT', '66666666-6666-4666-8666-666666666665'),
    ]);

    expect(counts).toEqual({
      DECLARED: 1,
      VERIFIED: 2,
      BEGINNER_REATTEMPT: 1,
      LOCKED: 1,
    });
    expect(counts).not.toHaveProperty('IN_VERIFICATION');
    expect(counts).not.toHaveProperty('EXPIRING');
  });

  it('snapshots invite status without inventing a profile-completion percent', () => {
    const snapshot = countInviteSnapshot([
      student('ACCEPTED'),
      student('PENDING'),
      student('PENDING', createdAt),
      student(null),
      student('EXPIRED'),
    ]);

    expect(snapshot).toEqual({
      total: 5,
      accepted: 1,
      pending: 2,
      expired: 1,
      revoked: 0,
      none: 1,
      held: 1,
    });
    expect(snapshot).not.toHaveProperty('completionPercent');
  });

  it('sorts batches by name for a stable roster list', () => {
    const batches: BatchDto[] = [
      {
        batchId: '77777777-7777-4777-8777-777777777772',
        institutionId: '22222222-2222-4222-8222-222222222222',
        name: 'MBA 2026',
        code: 'MBA26',
        memberCount: 40,
        pendingInviteCount: 8,
        createdAt,
      },
      {
        batchId: '77777777-7777-4777-8777-777777777771',
        institutionId: '22222222-2222-4222-8222-222222222222',
        name: 'CSE 2026',
        code: 'CSE26',
        memberCount: 12,
        pendingInviteCount: 0,
        createdAt,
      },
    ];

    expect(sortBatchesByName(batches).map((batch) => batch.name)).toEqual(['CSE 2026', 'MBA 2026']);
  });
});
