import { describe, expect, it } from 'vitest';
import { mapProjectEvidenceVerification } from './project-evidence.adapter.js';

describe('mapProjectEvidenceVerification', () => {
  it('marks evidence VERIFIED when QLIX report is trusted even if project is under review', () => {
    expect(
      mapProjectEvidenceVerification({
        projectStatus: 'UNDER_REVIEW',
        report: { confidence: 0.85, routedToReview: false },
      }),
    ).toBe('VERIFIED');
  });

  it('stays provisional when routed to human review', () => {
    expect(
      mapProjectEvidenceVerification({
        projectStatus: 'UNDER_REVIEW',
        report: { confidence: 0.9, routedToReview: true },
      }),
    ).toBe('PROVISIONAL');
  });
});
