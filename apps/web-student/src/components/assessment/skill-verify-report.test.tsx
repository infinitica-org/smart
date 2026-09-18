import { fireEvent, render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';

import type { AssessmentResult, GradeSdeSkillFormResponse } from '@smart/contracts';

import { SkillVerifyReport } from './skill-verify-report';

const grade: GradeSdeSkillFormResponse = {
  skillCode: 'SDE_DSA',

  proficiency: 'BEGINNER',

  marksEarned: 40,

  marksTotal: 50,

  scorePercent: 80,

  passed: true,

  promptRef: 'sde-skill-open-batch-grader@2',

  mcqCorrect: 6,

  mcqTotal: 8,

  traceCorrect: 2,

  traceTotal: 3,

  itemResults: [],
};

const assessmentResult: AssessmentResult = {
  skillCode: 'SQL_QUERY_OPTIMIZATION',

  assessmentVersion: 'v1',

  attemptId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',

  competencyResults: [
    {
      competencyId: 'c1',

      status: 'DEMONSTRATED',

      confidence: 'HIGH',

      evidence: [],
    },
  ],

  highestAssessmentSupportedProficiency: 'INTERMEDIATE',

  targetProficiency: 'PROFESSIONAL',

  assessmentComplete: true,

  assessmentPassed: true,

  uncertainties: [],

  recommendedNextStep: 'NONE',

  requiresInterview: false,

  requiresEvidenceVerification: false,

  requiresAdditionalAssessment: false,

  confidence: 'MEDIUM',

  evaluatedAt: new Date().toISOString(),
};

describe('SkillVerifyReport', () => {
  it('shows a minimal finished screen with one back action', () => {
    const onDone = vi.fn();

    render(
      <SkillVerifyReport
        grade={grade}
        assessmentResult={assessmentResult}
        catalogSkillCode="SQL_QUERY_OPTIMIZATION"
        onDone={onDone}
      />,
    );

    expect(screen.getByText(/Assessment finished/)).toBeDefined();
    expect(screen.queryByText(/Competency map/)).toBeNull();
    expect(screen.queryByText(/Assessment-supported proficiency/)).toBeNull();
    expect(screen.queryByRole('link', { name: /view skill repository/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /back to skills/i }));

    expect(onDone).toHaveBeenCalled();
  });
});
