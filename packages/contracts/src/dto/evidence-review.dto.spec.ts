import { describe, expect, it } from 'vitest';
import { ReviewEvidenceRequestSchema } from './evidence-review.dto.js';

describe('ReviewEvidenceRequestSchema', () => {
  it('accepts ACCEPTED without reason', () => {
    const parsed = ReviewEvidenceRequestSchema.safeParse({ decision: 'ACCEPTED' });
    expect(parsed.success).toBe(true);
  });

  it('requires reason for REJECTED', () => {
    const parsed = ReviewEvidenceRequestSchema.safeParse({
      decision: 'REJECTED',
      reason: 'short',
    });
    expect(parsed.success).toBe(false);
  });

  it('requires reason or requestedInformation for NEEDS_INFORMATION', () => {
    const parsed = ReviewEvidenceRequestSchema.safeParse({
      decision: 'NEEDS_INFORMATION',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts NEEDS_INFORMATION with requestedInformation', () => {
    const parsed = ReviewEvidenceRequestSchema.safeParse({
      decision: 'NEEDS_INFORMATION',
      requestedInformation: 'Please upload employer verification letter.',
    });
    expect(parsed.success).toBe(true);
  });
});
