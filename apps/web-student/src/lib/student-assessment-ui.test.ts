import { describe, expect, it } from 'vitest';

import { assessmentCardStateForClaim } from './student-assessment-ui';

describe('assessmentCardStateForClaim', () => {
  it('returns not started for a fresh declared claim', () => {
    const state = assessmentCardStateForClaim({
      claimId: 'clm_1',
      skillCode: 'REACT',
      status: 'DECLARED',
      lastAttemptId: null,
    } as never);
    expect(state.statusLabel).toBe('Not started');
    expect(state.buttonLabel).toBe('Start Assessment');
    expect(state.action).toBe('start');
  });

  it('returns continue when a diagnostic attempt exists', () => {
    const state = assessmentCardStateForClaim({
      claimId: 'clm_2',
      skillCode: 'PYTHON',
      status: 'DECLARED',
      lastAttemptId: 'att_1',
    } as never);
    expect(state.statusLabel).toBe('In progress');
    expect(state.action).toBe('continue');
  });

  it('shows proficiency discovery copy for project-tagged claims', () => {
    const state = assessmentCardStateForClaim({
      claimId: 'clm_pt',
      skillCode: 'PYTHON',
      status: 'DECLARED',
      lastAttemptId: null,
      declareOrigin: 'PROJECT_TAGGED',
    } as never);
    expect(state.statusLabel).toBe('Find out your proficiency');
  });

  it('returns verified state without a practice action', () => {
    const state = assessmentCardStateForClaim({
      claimId: 'clm_3',
      skillCode: 'JAVA',
      status: 'VERIFIED',
      proficiency: 'INTERMEDIATE',
    } as never);
    expect(state.statusLabel).toBe('Verified');
    expect(state.action).toBe('verified');
    expect(state.buttonLabel).toBe('');
  });
});
