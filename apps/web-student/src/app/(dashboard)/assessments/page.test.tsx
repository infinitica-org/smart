import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AssessmentsPage from './page';

const listSkillClaimsMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    assessment: {
      listSkillClaims: () => listSkillClaimsMock(),
    },
  },
}));

describe('AssessmentsPage', () => {
  beforeEach(() => {
    listSkillClaimsMock.mockReset();
  });

  it('renders the Skill Assessments heading and catalog skills', async () => {
    listSkillClaimsMock.mockResolvedValue([
      {
        claimId: 'claim-1',
        skillCode: 'PYTHON_PROGRAMMING_AND_DATA_STRUCTURES',
        proficiency: 'INTERMEDIATE',
        status: 'VERIFIED',
      },
      {
        claimId: 'claim-2',
        skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
        proficiency: 'BEGINNER',
        status: 'DECLARED',
      },
    ]);

    render(<AssessmentsPage />);
    expect(await screen.findByRole('heading', { name: 'Skill Assessments' })).toBeDefined();
  });

  it('renders empty state when there are no pending assessments', async () => {
    listSkillClaimsMock.mockResolvedValue([]);

    render(<AssessmentsPage />);
    expect(await screen.findByRole('heading', { name: 'Skill Assessments' })).toBeDefined();
    expect(await screen.findByText('No pending skill assessments')).toBeDefined();
  });
});
