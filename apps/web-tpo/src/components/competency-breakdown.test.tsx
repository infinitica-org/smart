import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AssessmentResult } from '@smart/contracts';
import { CompetencyBreakdown } from './competency-breakdown';

const sampleResult: AssessmentResult = {
  skillCode: 'SQL_QUERY_OPTIMIZATION',
  assessmentVersion: 'v1',
  attemptId: '33333333-3333-4333-8333-333333333333',
  competencyResults: [
    {
      competencyId: 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee',
      status: 'DEMONSTRATED',
      confidence: 'HIGH',
      evidence: [],
    },
  ],
  highestAssessmentSupportedProficiency: 'ADVANCED',
  targetProficiency: 'ADVANCED',
  assessmentComplete: true,
  assessmentPassed: true,
  uncertainties: [],
  recommendedNextStep: 'NONE',
  requiresInterview: false,
  requiresEvidenceVerification: false,
  requiresAdditionalAssessment: false,
  confidence: 'HIGH',
  evaluatedAt: new Date().toISOString(),
};

describe('CompetencyBreakdown', () => {
  it('renders read-only competency rows for TPO viewers', () => {
    render(
      <CompetencyBreakdown skillCode="SQL_QUERY_OPTIMIZATION" assessmentResult={sampleResult} />,
    );
    expect(screen.getByText(/Competency breakdown \(read-only\)/i)).toBeDefined();
    expect(screen.getByText(/Supported: Level 4/i)).toBeDefined();
    expect(screen.getByText(/demonstrated · high/i)).toBeDefined();
  });
});
