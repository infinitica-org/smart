import { ATS_STAGES } from '@smart/contracts';
import { describe, expect, it } from 'vitest';
import {
  ATS_PIPELINE_STAGES,
  ATS_STAGE_LABELS,
  formatAppliedOn,
  isCanonicalAtsStage,
  isTerminalAtsStage,
  matchPercent,
  pipelineProgressIndex,
  sortApplications,
  stageReached,
} from './my-applications';

describe('CN-T06 ATS timeline mapping', () => {
  it('uses only canonical AtsStage values from the contract', () => {
    expect(ATS_PIPELINE_STAGES.every((stage) => ATS_STAGES.includes(stage))).toBe(true);
    expect(Object.keys(ATS_STAGE_LABELS)).toEqual([...ATS_STAGES]);
    expect(isCanonicalAtsStage('AI_VERIFIED')).toBe(true);
    expect(isCanonicalAtsStage('HIRED')).toBe(true);
    expect(isCanonicalAtsStage('INTERVIEW')).toBe(true);
    expect(isCanonicalAtsStage('SENT_TO_COMPANY')).toBe(false);
  });

  it('progresses the pipeline up to the current CO-T02 stage', () => {
    expect(pipelineProgressIndex('APPLIED')).toBe(0);
    expect(pipelineProgressIndex('SHORTLISTED')).toBe(1);
    expect(pipelineProgressIndex('AI_VERIFIED')).toBe(2);
    expect(pipelineProgressIndex('INTERVIEW')).toBe(3);
    expect(pipelineProgressIndex('OFFER')).toBe(4);
    expect(pipelineProgressIndex('HIRED')).toBe(5);
    expect(stageReached('INTERVIEW', 'APPLIED')).toBe(true);
    expect(stageReached('INTERVIEW', 'SHORTLISTED')).toBe(true);
    expect(stageReached('INTERVIEW', 'AI_VERIFIED')).toBe(true);
    expect(stageReached('INTERVIEW', 'INTERVIEW')).toBe(true);
    expect(stageReached('INTERVIEW', 'OFFER')).toBe(false);
    expect(stageReached('HIRED', 'OFFER')).toBe(true);
    expect(stageReached('HIRED', 'HIRED')).toBe(true);
  });

  it('treats REJECTED and WITHDRAWN as terminal rather than past Hired', () => {
    expect(isTerminalAtsStage('REJECTED')).toBe(true);
    expect(isTerminalAtsStage('WITHDRAWN')).toBe(true);
    expect(isTerminalAtsStage('HIRED')).toBe(false);
    expect(pipelineProgressIndex('REJECTED')).toBe(-1);
    expect(stageReached('REJECTED', 'OFFER')).toBe(false);
    expect(ATS_STAGE_LABELS.REJECTED).toBe('Rejected');
  });

  it('formats match score and applied date without inventing values', () => {
    expect(matchPercent(0.88)).toBe('88%');
    expect(matchPercent(null)).toBeNull();
    expect(formatAppliedOn('2026-09-01T08:00:00.000Z')).toMatch(/Sep/);
  });

  it('sorts applications by updatedAt so a polled stage change rises', () => {
    const sorted = sortApplications([
      {
        applicationId: '00000000-0000-4000-8000-000000000001',
        openingId: '00000000-0000-4000-8000-000000000010',
        studentId: '00000000-0000-4000-8000-000000000020',
        stage: 'SHORTLISTED',
        matchScore: 0.5,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        companyName: 'Older Co',
        roleTitle: 'Analyst',
        location: 'Chennai',
        employmentType: 'FULL_TIME',
        domain: 'SOFTWARE_IT',
      },
      {
        applicationId: '00000000-0000-4000-8000-000000000002',
        openingId: '00000000-0000-4000-8000-000000000011',
        studentId: '00000000-0000-4000-8000-000000000020',
        stage: 'INTERVIEW',
        matchScore: 0.9,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-02T12:00:00.000Z',
        companyName: 'Newer Co',
        roleTitle: 'Engineer',
        location: 'Bengaluru',
        employmentType: 'FULL_TIME',
        domain: 'SOFTWARE_IT',
      },
    ]);
    expect(sorted[0]?.stage).toBe('INTERVIEW');
    expect(sorted[0]?.companyName).toBe('Newer Co');
  });
});
