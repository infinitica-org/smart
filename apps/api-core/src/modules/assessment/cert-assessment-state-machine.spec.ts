import { describe, expect, it } from 'vitest';
import { SKILL_MAX_ATTEMPTS } from '@smart/contracts';
import {
  applyCertAssessmentTransition,
  certRetryAvailableAt,
} from './cert-assessment-state-machine.js';

const base = {
  strikes: 0,
  lockedUntil: null,
  lastGenuineFailureAt: null,
  verified: false,
  rejected: false,
};

describe('cert-assessment-state-machine (CV-T02)', () => {
  it('blocks start without source_verified', () => {
    const result = applyCertAssessmentTransition({
      snapshot: base,
      event: { type: 'START' },
      now: new Date('2026-09-09T12:00:00.000Z'),
      sourceVerified: false,
    });
    expect(result.accepted).toBe(false);
    expect(result.blockReason).toBe('SOURCE_NOT_VERIFIED');
  });

  it('allows start when source is verified and no prior fail', () => {
    const result = applyCertAssessmentTransition({
      snapshot: base,
      event: { type: 'START' },
      now: new Date('2026-09-09T12:00:00.000Z'),
      sourceVerified: true,
    });
    expect(result.accepted).toBe(true);
    expect(result.attemptAllowed).toBe(true);
  });

  it('requires 48h cooldown after first genuine fail', () => {
    const failAt = new Date('2026-09-09T12:00:00.000Z');
    const afterFail = applyCertAssessmentTransition({
      snapshot: base,
      event: { type: 'GENUINE_FAIL' },
      now: failAt,
      sourceVerified: true,
    });
    expect(afterFail.next.strikes).toBe(1);

    const tooSoon = applyCertAssessmentTransition({
      snapshot: afterFail.next,
      event: { type: 'START' },
      now: new Date('2026-09-10T11:00:00.000Z'),
      sourceVerified: true,
    });
    expect(tooSoon.blockReason).toBe('INTER_ATTEMPT_COOLDOWN');

    const ready = applyCertAssessmentTransition({
      snapshot: afterFail.next,
      event: { type: 'START' },
      now: new Date('2026-09-11T13:00:00.000Z'),
      sourceVerified: true,
    });
    expect(ready.accepted).toBe(true);
  });

  it('locks after max attempts', () => {
    let snapshot = base;
    const now = new Date('2026-09-09T12:00:00.000Z');
    for (let i = 0; i < SKILL_MAX_ATTEMPTS; i += 1) {
      const result = applyCertAssessmentTransition({
        snapshot,
        event: { type: 'GENUINE_FAIL' },
        now,
        sourceVerified: true,
      });
      snapshot = result.next;
    }
    expect(snapshot.rejected).toBe(true);
    expect(snapshot.lockedUntil).not.toBeNull();
  });

  it('marks verified only on genuine pass with source verified', () => {
    const result = applyCertAssessmentTransition({
      snapshot: base,
      event: { type: 'GENUINE_PASS' },
      now: new Date('2026-09-09T12:00:00.000Z'),
      sourceVerified: true,
    });
    expect(result.becomesVerified).toBe(true);
    expect(result.next.verified).toBe(true);
  });

  it('computes retryAvailableAt from last genuine failure', () => {
    const failedAt = new Date('2026-09-09T12:00:00.000Z');
    const retryAt = certRetryAvailableAt({
      ...base,
      strikes: 1,
      lastGenuineFailureAt: failedAt,
    });
    expect(retryAt?.getTime()).toBeGreaterThan(failedAt.getTime());
  });
});
