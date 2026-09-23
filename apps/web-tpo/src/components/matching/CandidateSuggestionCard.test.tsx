import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CandidateMatchDto } from '@smart/contracts';

import { CandidateSuggestionCard } from './CandidateSuggestionCard';

const candidate: CandidateMatchDto = {
  studentId: 'aaaaaaa1-1111-4111-8111-111111111111',
  studentName: 'Aarav Sharma',
  trackCode: 'TECH_FULLSTACK',
  certificateId: null,
  highestLevelCleared: 1,
  headlineTier: 'BRONZE',
  similarityScore: 0,
  matchScore: 0.92,
  method: 'SKILL_CAPABILITY',
  explanation: {
    thresholdsMet: [],
    thresholdsMissed: [],
    strongCompetencies: [],
    gapCompetencies: [],
    skillCoveragePct: 1,
    capabilityCoveragePct: 0.5,
    potentialFit: 'STRONG',
    recruiterSummary: 'Strong fit for the role.',
    skillFit: [
      {
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        skillName: 'Deep Learning',
        status: 'MET',
        requiredProficiency: 'BEGINNER',
        actualProficiency: 'INTERMEDIATE',
      },
    ],
    capabilityFit: [],
    verifiedSkills: [
      {
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        skillName: 'Deep Learning',
        proficiency: 'INTERMEDIATE',
      },
    ],
    competencyEvidenceSummaries: [
      {
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        capabilityLabel: 'Train and evaluate neural networks',
        proficiency: 'INTERMEDIATE',
        confidenceScore: 0.88,
        evidenceSnippets: ['Explained validation split during project defense.'],
      },
    ],
  },
};

describe('CandidateSuggestionCard', () => {
  it('shows opening skill preview with level circles and verified chips', () => {
    render(
      <CandidateSuggestionCard
        candidate={candidate}
        rank={1}
        skillCapability
        matchPercent={92}
        whyText="Strong fit for the role."
        skillCoveragePct={1}
        capabilityCoveragePct={0.5}
        selected={false}
        opportunitySent={false}
        sending={false}
        onToggleSelect={vi.fn()}
        onViewSkillGap={vi.fn()}
      />,
    );

    expect(screen.getByText('Opening-required skills')).toBeDefined();
    expect(screen.getByText('Meets opening')).toBeDefined();
    expect(screen.getByText(/Verified on profile/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /View skill gap/i })).toBeDefined();
    expect(screen.getByText('Demonstrated capabilities')).toBeDefined();
    expect(screen.getByText('Train and evaluate neural networks')).toBeDefined();
  });
});
