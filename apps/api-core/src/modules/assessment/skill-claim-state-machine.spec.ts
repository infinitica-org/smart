import {
  SKILL_CLAIM_STATUSES,
  SKILL_INTER_ATTEMPT_COOLDOWN_HOURS,
  SKILL_MAX_ATTEMPTS,
  SKILL_REATTEMPTS,
  SKILL_REFRESH_DAYS,
} from '@smart/contracts';
import { describe, expect, it } from 'vitest';
import {
  RETRY_ITEM_SCOPE,
  addInterAttemptCooldown,
  addSkillRefreshPeriod,
  applySkillClaimTransition,
  type SkillClaimSnapshot,
  type SkillClaimTransitionInput,
} from './skill-claim-state-machine.js';

const NOW = new Date('2026-09-02T10:00:00.000Z');

function declared(overrides: Partial<SkillClaimSnapshot> = {}): SkillClaimSnapshot {
  return {
    status: 'DECLARED',
    proficiency: 'INTERMEDIATE',
    strikes: 0,
    lockedUntil: null,
    verifiedUntil: null,
    ...overrides,
  };
}

function apply(
  claim: SkillClaimSnapshot,
  event: SkillClaimTransitionInput['event'],
  extras: Partial<Pick<SkillClaimTransitionInput, 'now' | 'lastGenuineFailureAt'>> = {},
) {
  return applySkillClaimTransition({
    claim,
    event,
    now: extras.now ?? NOW,
    lastGenuineFailureAt: extras.lastGenuineFailureAt ?? null,
  });
}

describe('skill-claim state machine (SE-T01)', () => {
  it('locks Allen/ADR 0013 constants (never 3 / 60 / 90 / 180)', () => {
    expect(SKILL_MAX_ATTEMPTS).toBe(2);
    expect(SKILL_REATTEMPTS).toBe(1);
    expect(SKILL_INTER_ATTEMPT_COOLDOWN_HOURS).toBe(48);
    expect(SKILL_REFRESH_DAYS).toBe(35);
    expect(SKILL_CLAIM_STATUSES).toEqual(['DECLARED', 'VERIFIED', 'BEGINNER_REATTEMPT', 'LOCKED']);
    expect(SKILL_MAX_ATTEMPTS).not.toBe(3);
    expect(SKILL_REFRESH_DAYS).not.toBe(60);
    expect(SKILL_REFRESH_DAYS).not.toBe(90);
    expect(SKILL_REFRESH_DAYS).not.toBe(180);
  });

  it('computes refresh and inter-attempt windows from contract constants only', () => {
    const refresh = addSkillRefreshPeriod(NOW);
    const cooldown = addInterAttemptCooldown(NOW);
    expect(refresh.getTime() - NOW.getTime()).toBe(SKILL_REFRESH_DAYS * 24 * 60 * 60 * 1000);
    expect(cooldown.getTime() - NOW.getTime()).toBe(
      SKILL_INTER_ATTEMPT_COOLDOWN_HOURS * 60 * 60 * 1000,
    );
    expect(refresh.toISOString()).toBe('2026-10-07T10:00:00.000Z');
    expect(cooldown.toISOString()).toBe('2026-09-04T10:00:00.000Z');
  });

  it.each([
    {
      name: '1. DECLARED + genuine pass → VERIFIED, verifiedUntil = now + 35d, proficiency preserved',
      run: () => apply(declared(), { type: 'GENUINE_PASS' }),
      check: (result: ReturnType<typeof apply>) => {
        expect(result.accepted).toBe(true);
        expect(result.next.status).toBe('VERIFIED');
        expect(result.next.proficiency).toBe('INTERMEDIATE');
        expect(result.next.strikes).toBe(0);
        expect(result.next.lockedUntil).toBeNull();
        expect(result.next.verifiedUntil?.toISOString()).toBe('2026-10-07T10:00:00.000Z');
      },
    },
    {
      name: '2. DECLARED + genuine fail → BEGINNER_REATTEMPT, strikes = 1',
      run: () => apply(declared(), { type: 'GENUINE_FAIL' }),
      check: (result: ReturnType<typeof apply>) => {
        expect(result.accepted).toBe(true);
        expect(result.next.status).toBe('BEGINNER_REATTEMPT');
        expect(result.next.strikes).toBe(1);
        expect(result.next.strikes).toBeLessThanOrEqual(SKILL_MAX_ATTEMPTS);
        expect(result.next.proficiency).toBe('INTERMEDIATE');
        expect(result.retryItemScope).toBe(RETRY_ITEM_SCOPE);
      },
    },
    {
      name: '3. DECLARED + technical failure → DECLARED, strikes = 0',
      run: () => apply(declared(), { type: 'TECHNICAL_FAILURE' }),
      check: (result: ReturnType<typeof apply>) => {
        expect(result.accepted).toBe(true);
        expect(result.next.status).toBe('DECLARED');
        expect(result.next.strikes).toBe(0);
      },
    },
  ] as const)('$name', ({ run, check }) => {
    check(run());
  });

  it('START on DECLARED stays DECLARED and allows an attempt (UI in-verification is not persisted)', () => {
    const result = apply(declared(), { type: 'START' });
    expect(result.accepted).toBe(true);
    expect(result.attemptAllowed).toBe(true);
    expect(result.next.status).toBe('DECLARED');
  });

  it('4. BEGINNER_REATTEMPT start before 48h is rejected', () => {
    const failAt = NOW;
    const tooSoon = new Date(failAt.getTime() + 48 * 60 * 60 * 1000 - 1);
    const result = apply(
      declared({ status: 'BEGINNER_REATTEMPT', strikes: 1 }),
      { type: 'START' },
      { now: tooSoon, lastGenuineFailureAt: failAt },
    );
    expect(result.accepted).toBe(false);
    expect(result.blockReason).toBe('INTER_ATTEMPT_COOLDOWN');
    expect(result.attemptAllowed).toBe(false);
    expect(result.next.status).toBe('BEGINNER_REATTEMPT');
  });

  it('5. BEGINNER_REATTEMPT start at/after 48h is allowed; status unchanged', () => {
    const failAt = NOW;
    const openAt = addInterAttemptCooldown(failAt);
    const result = apply(
      declared({ status: 'BEGINNER_REATTEMPT', strikes: 1 }),
      { type: 'START' },
      { now: openAt, lastGenuineFailureAt: failAt },
    );
    expect(result.accepted).toBe(true);
    expect(result.attemptAllowed).toBe(true);
    expect(result.next.status).toBe('BEGINNER_REATTEMPT');
    expect(result.retryItemScope).toBe(RETRY_ITEM_SCOPE);
  });

  it('6. BEGINNER_REATTEMPT + technical failure stays BEGINNER_REATTEMPT, strike unchanged', () => {
    const result = apply(declared({ status: 'BEGINNER_REATTEMPT', strikes: 1 }), {
      type: 'TECHNICAL_FAILURE',
    });
    expect(result.accepted).toBe(true);
    expect(result.next.status).toBe('BEGINNER_REATTEMPT');
    expect(result.next.strikes).toBe(1);
  });

  it('7. BEGINNER_REATTEMPT + genuine pass → VERIFIED at BEGINNER (Verified-Beginner)', () => {
    const result = apply(declared({ status: 'BEGINNER_REATTEMPT', strikes: 1 }), {
      type: 'GENUINE_PASS',
    });
    expect(result.next.status).toBe('VERIFIED');
    expect(result.next.proficiency).toBe('BEGINNER');
    expect(result.next.lockedUntil).toBeNull();
    expect(result.next.verifiedUntil?.toISOString()).toBe('2026-10-07T10:00:00.000Z');
  });

  it('8. BEGINNER_REATTEMPT + genuine fail → LOCKED, strikes = 2, lockedUntil = now + 35d', () => {
    const result = apply(declared({ status: 'BEGINNER_REATTEMPT', strikes: 1 }), {
      type: 'GENUINE_FAIL',
    });
    expect(result.next.status).toBe('LOCKED');
    expect(result.next.strikes).toBe(2);
    expect(result.next.strikes).toBe(SKILL_MAX_ATTEMPTS);
    expect(result.next.lockedUntil?.toISOString()).toBe('2026-10-07T10:00:00.000Z');
  });

  it('9. LOCKED start before cooldown is rejected', () => {
    const lockedUntil = addSkillRefreshPeriod(NOW);
    const result = apply(
      declared({ status: 'LOCKED', strikes: 2, lockedUntil }),
      { type: 'START' },
      { now: new Date(lockedUntil.getTime() - 1) },
    );
    expect(result.accepted).toBe(false);
    expect(result.blockReason).toBe('LOCKED');
    expect(result.next.status).toBe('LOCKED');
  });

  it('10. LOCKED after cooldown does not auto-reset; redeclare is CN-T04', () => {
    const lockedUntil = addSkillRefreshPeriod(NOW);
    const result = apply(
      declared({ status: 'LOCKED', strikes: 2, lockedUntil }),
      { type: 'START' },
      { now: lockedUntil },
    );
    expect(result.accepted).toBe(false);
    expect(result.blockReason).toBe('LOCK_EXPIRED_REDECLARE_REQUIRED');
    expect(result.next.status).toBe('LOCKED');
    expect(result.next.strikes).toBe(2);
  });

  it('11. a third genuine fail cannot raise strikes above SKILL_MAX_ATTEMPTS', () => {
    const locked = apply(declared({ status: 'BEGINNER_REATTEMPT', strikes: 1 }), {
      type: 'GENUINE_FAIL',
    }).next;
    const third = apply(locked, { type: 'GENUINE_FAIL' });
    expect(third.accepted).toBe(false);
    expect(third.blockReason).toBe('MAX_ATTEMPTS_REACHED');
    expect(third.next.strikes).toBe(SKILL_MAX_ATTEMPTS);
    expect(third.next.strikes).toBeLessThan(3);
  });

  it('12. technical failure never consumes a strike on DECLARED or reattempt', () => {
    const first = apply(declared({ strikes: 0 }), { type: 'TECHNICAL_FAILURE' });
    const second = apply(declared({ status: 'BEGINNER_REATTEMPT', strikes: 1 }), {
      type: 'TECHNICAL_FAILURE',
    });
    expect(first.next.strikes).toBe(0);
    expect(second.next.strikes).toBe(1);
  });

  it('START while LOCKED after two fails is never a third attempt', () => {
    const fail1 = apply(declared(), { type: 'GENUINE_FAIL' });
    const fail2 = apply(fail1.next, { type: 'GENUINE_FAIL' });
    const start3 = apply(fail2.next, { type: 'START' }, { now: NOW });
    expect(fail2.next.status).toBe('LOCKED');
    expect(start3.attemptAllowed).toBe(false);
    expect(start3.accepted).toBe(false);
  });
});
