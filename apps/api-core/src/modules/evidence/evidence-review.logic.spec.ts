import { describe, expect, it } from 'vitest';
import {
  findLatestReviewAuditEntry,
  isIdempotentReviewRequest,
  isReviewAuditAction,
  mapReviewDecisionToVerificationStatus,
  mergeReviewVerificationMetadata,
  reviewBlocksTerminalStatus,
  reviewDecisionConflict,
} from './evidence-review.logic.js';

describe('evidence-review.logic', () => {
  it('maps reviewer decisions to verification statuses', () => {
    expect(mapReviewDecisionToVerificationStatus('ACCEPTED')).toBe('VERIFIED');
    expect(mapReviewDecisionToVerificationStatus('REJECTED')).toBe('REJECTED');
    expect(mapReviewDecisionToVerificationStatus('NEEDS_INFORMATION')).toBe('PENDING');
  });

  it('blocks EXPIRED terminal status', () => {
    expect(reviewBlocksTerminalStatus('EXPIRED')).toBe(true);
    expect(reviewBlocksTerminalStatus('PENDING')).toBe(false);
  });

  it('detects REJECTED to ACCEPTED conflict', () => {
    expect(reviewDecisionConflict('REJECTED', 'ACCEPTED')).toBe(true);
    expect(reviewDecisionConflict('PENDING', 'ACCEPTED')).toBe(false);
  });

  it('merges metadata without dropping existing fields', () => {
    const merged = mergeReviewVerificationMetadata(
      { verificationMethod: 'DOCUMENT', linkedEvidenceIds: ['a'] },
      {
        decision: 'NEEDS_INFORMATION',
        reviewerId: 'reviewer-1',
        reviewerDisplay: 'reviewer-1',
        reason: 'Need clearer contribution statement.',
        nowIso: '2026-09-01T00:00:00.000Z',
      },
    );
    expect(merged.linkedEvidenceIds).toEqual(['a']);
    expect(merged.reviewRequired).toBe(true);
    expect(Array.isArray(merged.auditTrail)).toBe(true);
  });

  it('detects idempotent reviewer replay', () => {
    const metadata = {
      reviewRequired: true,
      auditTrail: [
        {
          at: '2026-09-01T00:00:00.000Z',
          actorId: 'reviewer-1',
          action: 'EVIDENCE_REVIEW_NEEDS_INFORMATION',
        },
      ],
    };
    expect(isIdempotentReviewRequest('PENDING', metadata, 'NEEDS_INFORMATION', 'reviewer-1')).toBe(
      true,
    );
  });

  it('ignores unrelated auditTrail entries when detecting latest reviewer decision', () => {
    const metadata = {
      auditTrail: [
        {
          at: '2026-08-01T00:00:00.000Z',
          actorId: 'reviewer-1',
          action: 'EVIDENCE_REVIEW_ACCEPTED',
        },
        {
          at: '2026-09-01T00:00:00.000Z',
          actorId: null,
          action: 'SYSTEM_SYNC',
        },
      ],
    };
    expect(findLatestReviewAuditEntry(metadata)?.action).toBe('EVIDENCE_REVIEW_ACCEPTED');
    expect(isIdempotentReviewRequest('VERIFIED', metadata, 'ACCEPTED', 'reviewer-1')).toBe(true);
    expect(isIdempotentReviewRequest('VERIFIED', metadata, 'REJECTED', 'reviewer-1')).toBe(false);
    expect(isReviewAuditAction('SYSTEM_SYNC')).toBe(false);
  });
});
