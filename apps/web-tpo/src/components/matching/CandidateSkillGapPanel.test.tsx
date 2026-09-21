import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { CandidateMatchDto } from '@smart/contracts';

import { CandidateSkillGapPanel } from './CandidateSkillGapPanel';

const candidate: CandidateMatchDto = {
  studentId: 'aaaaaaa1-1111-4111-8111-111111111111',
  studentName: 'Aarav Sharma',
  trackCode: 'TECH_FULLSTACK',
  certificateId: null,
  highestLevelCleared: 1,
  headlineTier: 'BRONZE',
  similarityScore: 0,
  matchScore: 0.75,
  method: 'SKILL_CAPABILITY',
  explanation: {
    thresholdsMet: [],
    thresholdsMissed: [],
    strongCompetencies: [],
    gapCompetencies: ['Regulatory advisory'],
    skillCoveragePct: 0.5,
    capabilityCoveragePct: 0.5,
    potentialFit: 'STRETCH',
    skillFit: [
      {
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        skillName: 'Deep Learning',
        status: 'PARTIAL',
        requiredProficiency: 'INTERMEDIATE',
        actualProficiency: 'BEGINNER',
      },
    ],
    capabilityFit: [
      {
        competencyId: 'bbbbbbb2-2222-4222-8222-222222222222',
        capability: 'Regulatory & Legal Advisory',
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        hitScore: 0.2,
        evidenceSource: 'NONE',
      },
    ],
    verifiedSkills: [
      {
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        skillName: 'Deep Learning',
        proficiency: 'BEGINNER',
      },
      {
        skillCode: 'LARGE_LANGUAGE_MODEL_LLM_APPLICATION_ENGINEERING',
        skillName: 'LLM Applications',
        proficiency: 'INTERMEDIATE',
      },
    ],
  },
};

describe('CandidateSkillGapPanel', () => {
  afterEach(() => cleanup());

  it('defaults to skill gap with JD-required and other verified skills', () => {
    render(
      <CandidateSkillGapPanel candidate={candidate} roleTitle="Product Lead" variant="drawer" />,
    );

    expect(screen.getByText(/How to read level circles/i)).toBeDefined();
    expect(screen.getByText(/Skills required by this opening/i)).toBeDefined();
    expect(screen.getByText(/Other verified skills on profile/i)).toBeDefined();
    expect(screen.getByText('LLM Applications')).toBeDefined();
  });

  it('switches to competency gap when the competency tab is clicked', () => {
    render(
      <CandidateSkillGapPanel candidate={candidate} roleTitle="Product Lead" variant="drawer" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View Competency gap' }));
    expect(screen.getByText(/Competencies required by this opening/i)).toBeDefined();
    expect(screen.getByText(/Regulatory & Legal Advisory/i)).toBeDefined();
  });
});
