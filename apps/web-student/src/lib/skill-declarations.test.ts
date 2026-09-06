import { describe, expect, it } from 'vitest';
import {
  claimToBadgeStatus,
  canStartSdeV4Verify,
  formatCooldown,
  mandatorySkillsForStream,
  progressForClaim,
  skillsForStream,
  skillVerifyBlockMessage,
} from './skill-declarations';
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

  it('makes Universal Core plus role-stream skills mandatory', () => {
    const pack = mandatorySkillsForStream('SOFTWARE_DEVELOPMENT');
    expect(pack.some((skill) => skill.code === 'GIT_VERSION_CONTROL')).toBe(true);
    expect(pack.some((skill) => skill.code === 'TESTING_DEBUGGING')).toBe(true);
    expect(
      pack.every(
        (skill) => skill.stream === 'UNIVERSAL' || skill.stream === 'SOFTWARE_DEVELOPMENT',
      ),
    ).toBe(true);
  });

  it('allows SDE v4 start only for mapped DECLARED or BEGINNER_REATTEMPT claims off cooldown', () => {
    expect(canStartSdeV4Verify(claim())).toBe(true);
    expect(canStartSdeV4Verify(claim({ retryAvailableAt: '2099-01-01T00:00:00.000Z' }))).toBe(
      false,
    );
    expect(
      canStartSdeV4Verify(
        claim({
          skillFocus: 'Branching',
          focusProgress: [
            {
              focus: 'Branching',
              status: 'DECLARED',
              strikes: 0,
              lockedUntil: null,
              lastAttemptId: '33333333-3333-4333-8333-333333333333',
              lastGenuineFailureAt: '2026-09-05T00:00:00.000Z',
              retryAvailableAt: '2099-01-01T00:00:00.000Z',
            },
          ],
        }),
        Date.now(),
        'Branching',
      ),
    ).toBe(false);
    expect(canStartSdeV4Verify(claim({ status: 'VERIFIED' }))).toBe(false);
    expect(canStartSdeV4Verify(claim({ skillCode: 'LANGUAGE_PROFICIENCY' }))).toBe(true);
    expect(
      canStartSdeV4Verify(
        claim({
          status: 'BEGINNER_REATTEMPT',
          retryAvailableAt: '2099-01-01T00:00:00.000Z',
        }),
      ),
    ).toBe(false);
    expect(
      canStartSdeV4Verify(
        claim({
          skillCode: 'COMPUTER_NETWORKS_BASICS',
          status: 'DECLARED',
          skillFocus: 'TCP/UDP',
          focusProgress: [
            {
              focus: 'HTTP & REST',
              status: 'BEGINNER_REATTEMPT',
              strikes: 1,
              lockedUntil: null,
              lastAttemptId: null,
              lastGenuineFailureAt: '2026-09-05T00:00:00.000Z',
              retryAvailableAt: '2099-01-01T00:00:00.000Z',
            },
          ],
        }),
        Date.now(),
        'TCP/UDP',
      ),
    ).toBe(true);
    expect(
      canStartSdeV4Verify(
        claim({
          skillCode: 'COMPUTER_NETWORKS_BASICS',
          status: 'DECLARED',
          skillFocus: 'HTTP & REST',
          focusProgress: [
            {
              focus: 'HTTP & REST',
              status: 'BEGINNER_REATTEMPT',
              strikes: 1,
              lockedUntil: null,
              lastAttemptId: null,
              retryAvailableAt: '2099-01-01T00:00:00.000Z',
            },
          ],
        }),
        Date.now(),
        'HTTP & REST',
      ),
    ).toBe(false);
  });

  it('coerces optional focus-progress timestamps to null', () => {
    const rows = progressForClaim(
      claim({
        skillCode: 'COMPUTER_NETWORKS_BASICS',
        focusProgress: [
          {
            focus: 'HTTP & REST',
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
    expect(
      skillVerifyBlockMessage(
        claim({
          status: 'LOCKED',
          lockedUntil: '2099-09-07T09:30:00.000Z',
          retryAvailableAt: '2099-09-07T09:30:00.000Z',
        }),
      ),
    ).toMatch(/locked until/i);
  });

  it('maps claim statuses onto VerificationBadge language', () => {
    expect(claimToBadgeStatus(claim({ status: 'DECLARED' }))).toBe('DECLARED');
    expect(
      claimToBadgeStatus(
        claim({ status: 'DECLARED', lastAttemptId: '55555555-5555-4555-8555-555555555555' }),
      ),
    ).toBe('NOT_VERIFIED');
    expect(claimToBadgeStatus(claim({ status: 'BEGINNER_REATTEMPT' }))).toBe('NOT_VERIFIED');
    expect(claimToBadgeStatus(claim({ status: 'VERIFIED' }))).toBe('VERIFIED');
    expect(claimToBadgeStatus(claim({ status: 'LOCKED' }))).toBe('LOCKED');
  });

  it('formats lockedUntil for cooldown display', () => {
    expect(formatCooldown(null)).toBeNull();
    expect(formatCooldown('2026-09-30T00:00:00.000Z')).toMatch(/2026/);
  });
});
