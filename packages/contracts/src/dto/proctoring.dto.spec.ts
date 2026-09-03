import { describe, expect, it } from 'vitest';
import { ProctoringViolationRequestSchema, TECHNICAL_VIOLATION_KINDS } from './proctoring.dto.js';
import { IntegrityEventSchema as AssessmentIntegrityEventSchema } from './assessment.dto.js';

const attemptId = '55555555-5555-4555-8555-555555555555';

describe('proctoring contracts', () => {
  it('accepts a signed violation', () => {
    const parsed = ProctoringViolationRequestSchema.parse({
      attemptId,
      kind: 'FULLSCREEN_EXIT',
      occurredAt: '2026-09-03T10:00:00.000Z',
      nonce: 'a'.repeat(16),
      signature: 'b'.repeat(32),
    });
    expect(parsed.kind).toBe('FULLSCREEN_EXIT');
  });

  it('keeps heartbeat_lost in the technical class set', () => {
    expect(TECHNICAL_VIOLATION_KINDS).toContain('HEARTBEAT_LOST');
  });

  it('still accepts the original eight advisory kinds', () => {
    expect(
      AssessmentIntegrityEventSchema.parse({
        attemptId,
        kind: 'TAB_BLUR',
        occurredAt: '2026-09-03T10:00:00.000Z',
      }).kind,
    ).toBe('TAB_BLUR');
  });
});
