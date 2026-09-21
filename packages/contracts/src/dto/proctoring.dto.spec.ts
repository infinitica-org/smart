import { describe, expect, it } from 'vitest';
import {
  PROCTORING_CHECKPOINT_DEDUP_MS,
  PROCTORING_INGEST_DEDUP_MS,
  PROCTORING_SNAPSHOT_HEIGHT,
  PROCTORING_SNAPSHOT_INTERVAL_MS,
  PROCTORING_SNAPSHOT_WIDTH,
  PROCTORING_WARNING_LIMIT_DEFAULT,
  ProctoringCheckpointResponseSchema,
  ProctoringViolationRequestSchema,
  TECHNICAL_VIOLATION_KINDS,
} from './proctoring.dto.js';
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

  it('caps integrity warnings at five before lock', () => {
    expect(PROCTORING_WARNING_LIMIT_DEFAULT).toBe(5);
  });

  it('keeps heartbeat_lost in the technical class set', () => {
    expect(TECHNICAL_VIOLATION_KINDS).toContain('HEARTBEAT_LOST');
  });

  it('keeps snapshot cadence aligned with dedup and jpeg size', () => {
    expect(PROCTORING_SNAPSHOT_INTERVAL_MS).toBe(1_000);
    expect(PROCTORING_CHECKPOINT_DEDUP_MS).toBe(PROCTORING_SNAPSHOT_INTERVAL_MS * 2);
    expect(PROCTORING_INGEST_DEDUP_MS).toBe(45_000);
    expect(PROCTORING_SNAPSHOT_WIDTH).toBe(640);
    expect(PROCTORING_SNAPSHOT_HEIGHT).toBe(360);
  });

  it('parses sync checkpoint responses', () => {
    const parsed = ProctoringCheckpointResponseSchema.parse({
      attemptId,
      analyzed: true,
      detected: ['FOREIGN_OBJECT_DETECTED'],
      newViolations: ['FOREIGN_OBJECT_DETECTED'],
      warningCount: 1,
      warningLimit: 5,
      locked: false,
    });
    expect(parsed.newViolations).toEqual(['FOREIGN_OBJECT_DETECTED']);
  });

  it('includes foreign_object_detected as an integrity violation kind', () => {
    const parsed = ProctoringViolationRequestSchema.parse({
      attemptId,
      kind: 'FOREIGN_OBJECT_DETECTED',
      occurredAt: '2026-09-03T10:00:00.000Z',
      nonce: 'a'.repeat(16),
      signature: 'b'.repeat(32),
    });
    expect(parsed.kind).toBe('FOREIGN_OBJECT_DETECTED');
  });

  it('includes phone_detected as an integrity violation kind', () => {
    const parsed = ProctoringViolationRequestSchema.parse({
      attemptId,
      kind: 'PHONE_DETECTED',
      occurredAt: '2026-09-03T10:00:00.000Z',
      nonce: 'a'.repeat(16),
      signature: 'b'.repeat(32),
    });
    expect(parsed.kind).toBe('PHONE_DETECTED');
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
