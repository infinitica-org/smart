import { describe, expect, it } from 'vitest';
import { claimToBadgeStatus, formatCooldown, skillsForStream } from './skill-declarations';
import type { SkillClaimDto } from '@smart/contracts';

function claim(overrides: Partial<SkillClaimDto> = {}): SkillClaimDto {
  return {
    claimId: '44444444-4444-4444-8444-444444444444',
    studentId: '11111111-1111-4111-8111-111111111111',
    skillCode: 'GIT_VERSION_CONTROL',
    proficiency: 'BEGINNER',
    status: 'DECLARED',
    strikes: 0,
    lockedUntil: null,
    lastAttemptId: null,
    ...overrides,
  };
}

describe('skill-declarations helpers', () => {
  it('filters SOFTWARE_IT skills by stream', () => {
    const universal = skillsForStream('UNIVERSAL');
    expect(universal.length).toBeGreaterThan(0);
    expect(universal.every((s) => s.stream === 'UNIVERSAL')).toBe(true);
  });

  it('maps claim statuses onto VerificationBadge language', () => {
    expect(claimToBadgeStatus(claim({ status: 'DECLARED' }))).toBe('DECLARED');
    expect(
      claimToBadgeStatus(
        claim({ status: 'DECLARED', lastAttemptId: '55555555-5555-4555-8555-555555555555' }),
      ),
    ).toBe('IN_VERIFICATION');
    expect(claimToBadgeStatus(claim({ status: 'BEGINNER_REATTEMPT' }))).toBe('IN_VERIFICATION');
    expect(claimToBadgeStatus(claim({ status: 'VERIFIED' }))).toBe('VERIFIED');
    expect(claimToBadgeStatus(claim({ status: 'LOCKED' }))).toBe('LOCKED');
  });

  it('formats lockedUntil for cooldown display', () => {
    expect(formatCooldown(null)).toBeNull();
    expect(formatCooldown('2026-09-30T00:00:00.000Z')).toMatch(/2026/);
  });
});
