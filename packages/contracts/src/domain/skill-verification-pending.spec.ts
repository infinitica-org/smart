import { describe, expect, it } from 'vitest';
import {
  readSkillVerificationPending,
  skillClaimVerificationInProgress,
  withSkillVerificationPending,
  withoutSkillVerificationPending,
} from './skill-verification-pending.js';

describe('skill-verification-pending metadata', () => {
  it('round-trips pending session markers on claim metadata', () => {
    const sessionId = '33333333-3333-4333-8333-333333333333';
    const withPending = withSkillVerificationPending({}, sessionId, '2026-01-01T00:00:00.000Z');
    expect(readSkillVerificationPending(withPending)).toEqual({
      sessionId,
      since: '2026-01-01T00:00:00.000Z',
    });
    expect(withoutSkillVerificationPending(withPending)).toEqual({});
  });

  it('detects in-progress verification only when session ids match', () => {
    const sessionId = '33333333-3333-4333-8333-333333333333';
    const metadata = withSkillVerificationPending({}, sessionId);
    expect(
      skillClaimVerificationInProgress({ lastAttemptId: sessionId, sourceMetadata: metadata }),
    ).toBe(true);
    expect(
      skillClaimVerificationInProgress({
        lastAttemptId: '44444444-4444-4444-8444-444444444444',
        sourceMetadata: metadata,
      }),
    ).toBe(false);
  });
});
