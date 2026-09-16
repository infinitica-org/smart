import { describe, expect, it } from 'vitest';
import {
  canEnableTakeAssessment,
  claimToBadgeStatus,
  canStartSdeV4Verify,
  categoryNameForCode,
  formatCooldown,
  formatSkillVerifyKioskTitle,
  progressForClaim,
  repositoryStatusForClaim,
  skillsForCategory,
  skillVerifyBlockMessage,
  takeAssessmentBlockMessage,
  viewForFocus,
} from './skill-declarations';
import type { SkillClaimDto } from '@smart/contracts';

function claim(overrides: Partial<SkillClaimDto> = {}): SkillClaimDto {
  return {
    claimId: '44444444-4444-4444-8444-444444444444',
    studentId: '11111111-1111-4111-8111-111111111111',
    skillCode: 'SQL_QUERY_OPTIMIZATION',
    proficiency: 'BEGINNER',
    status: 'DECLARED',
    strikes: 0,
    lockedUntil: null,
    lastAttemptId: null,
    ...overrides,
  };
}

describe('skill-declarations helpers', () => {
  it('formats kiosk titles with assessment stage labels', () => {
    expect(formatSkillVerifyKioskTitle('SQL_QUERY_OPTIMIZATION', 'DIAGNOSTIC')).toContain(
      'Short diagnostic',
    );
    expect(formatSkillVerifyKioskTitle('SQL_QUERY_OPTIMIZATION')).not.toContain('Beginner');
  });

  it('allows editing proficiency before first verification', () => {
    const view = viewForFocus(claim(), 'SQL_QUERY_OPTIMIZATION', 'Query tuning');
    expect(view.canEditProficiency).toBe(true);
    expect(view.canEditProficiency).toBe(view.canStart);
  });

  it('blocks proficiency edits once verified', () => {
    const view = viewForFocus(
      claim({ status: 'VERIFIED', proficiency: 'PROFESSIONAL' }),
      'SQL_QUERY_OPTIMIZATION',
      undefined,
    );
    expect(view.canEditProficiency).toBe(false);
  });

  it('filters skills by category', () => {
    const programming = skillsForCategory('PROGRAMMING_LANGUAGES');
    expect(programming.length).toBeGreaterThan(0);
    expect(programming.every((s) => s.categoryId === 'PROGRAMMING_LANGUAGES')).toBe(true);
  });

  it('resolves category name from skill code', () => {
    expect(categoryNameForCode('PYTHON_APPLICATION_BACKEND_DEVELOPMENT')).toBe(
      'Programming Languages',
    );
  });

  it('allows SDE v4 start for mapped DECLARED claims off cooldown', () => {
    expect(canStartSdeV4Verify(claim())).toBe(true);
    expect(canStartSdeV4Verify(claim({ retryAvailableAt: '2099-01-01T00:00:00.000Z' }))).toBe(
      false,
    );
    expect(canStartSdeV4Verify(claim({ status: 'VERIFIED' }))).toBe(false);
    expect(
      canStartSdeV4Verify(claim({ skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT' })),
    ).toBe(true);
  });

  it('coerces optional focus-progress timestamps to null', () => {
    const rows = progressForClaim(
      claim({
        skillCode: 'RESTFUL_GRAPHQL_API_DESIGN',
        focusProgress: [
          {
            focus: 'REST',
            status: 'DECLARED',
            strikes: 0,
            lockedUntil: null,
            lastAttemptId: null,
          },
        ],
      }),
    );
    expect(rows[0]?.lastGenuineFailureAt).toBeNull();
    expect(rows[0]?.retryAvailableAt).toBeNull();
  });

  it('explains verified, locked, and cooldown blocks', () => {
    expect(skillVerifyBlockMessage(claim({ status: 'VERIFIED' }))).toMatch(/already verified/i);
    expect(
      skillVerifyBlockMessage(
        claim({
          status: 'BEGINNER_REATTEMPT',
          retryAvailableAt: '2099-01-01T00:00:00.000Z',
        }),
      ),
    ).toMatch(/already sat/i);
  });

  it('maps claim statuses onto VerificationBadge language', () => {
    expect(claimToBadgeStatus(claim({ status: 'DECLARED' }))).toBe('DECLARED');
    expect(
      claimToBadgeStatus(
        claim({ status: 'DECLARED', lastAttemptId: '55555555-5555-4555-8555-555555555555' }),
      ),
    ).toBe('NOT_VERIFIED');
    expect(claimToBadgeStatus(claim({ status: 'VERIFIED' }))).toBe('VERIFIED');
    expect(
      claimToBadgeStatus(
        claim({ status: 'VERIFIED', verificationDecision: 'PROVISIONAL', claimConfidence: 0.55 }),
      ),
    ).toBe('PROVISIONAL');
  });

  it('formats lockedUntil for cooldown display', () => {
    expect(formatCooldown(null)).toBeNull();
    expect(formatCooldown('2026-09-30T00:00:00.000Z')).toMatch(/2026/);
  });

  it('maps repository status labels for catalog skills', () => {
    expect(repositoryStatusForClaim(undefined).displayLabel).toBe('Not declared');
    expect(repositoryStatusForClaim(claim({ status: 'DECLARED' })).displayLabel).toBe('Declared');
    expect(repositoryStatusForClaim(claim({ status: 'VERIFIED' })).displayLabel).toBe('Verified');
  });

  it('gates Take Assessment on profile completion only', () => {
    expect(canEnableTakeAssessment({ profilePercent: 49 })).toBe(false);
    expect(canEnableTakeAssessment({ profilePercent: 50 })).toBe(true);
    expect(canEnableTakeAssessment({ profilePercent: 100 })).toBe(true);
  });

  it('allows practice for verified skills by clearing the verified block message', () => {
    expect(takeAssessmentBlockMessage(claim({ status: 'VERIFIED' }))).toBeNull();
    expect(takeAssessmentBlockMessage(claim({ status: 'LOCKED' }))).toMatch(/locked/i);
  });
});
