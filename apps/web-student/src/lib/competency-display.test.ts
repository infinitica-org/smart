import { describe, expect, it } from 'vitest';
import {
  COMPETENCY_STATUS_LABELS,
  competencyLabel,
  summarizeEvidenceContext,
} from './competency-display';

describe('competency-display', () => {
  it('maps competency ids to capability labels from the skill blueprint', () => {
    const label = competencyLabel(
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      '828ed14b-2aca-408b-adc1-78e24f22b09d',
    );
    expect(label).toContain('Python syntax');
  });

  it('summarizes empty evidence context for pre-assessment copy', () => {
    expect(summarizeEvidenceContext(undefined)).toMatch(/no application evidence/i);
    expect(summarizeEvidenceContext({ availableCount: 0, items: [] })).toMatch(/still verify/i);
  });

  it('summarizes linked evidence items', () => {
    expect(
      summarizeEvidenceContext({
        availableCount: 2,
        items: [
          {
            evidenceType: 'PROJECT',
            label: 'API service',
            verificationStatus: 'VERIFIED',
            qualifiesForDemonstration: true,
          },
          {
            evidenceType: 'PASSIVE_SIGNAL',
            label: 'GitHub activity',
            verificationStatus: 'PENDING',
            qualifiesForDemonstration: false,
          },
        ],
      }),
    ).toMatch(/API service/);
  });

  it('labels competency statuses for display', () => {
    expect(COMPETENCY_STATUS_LABELS.DEMONSTRATED).toBe('Demonstrated');
    expect(COMPETENCY_STATUS_LABELS.NOT_TESTED).toBe('Not tested');
  });
});
