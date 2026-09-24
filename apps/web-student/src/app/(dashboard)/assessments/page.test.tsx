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

  it('renders the Skill Repository heading and catalog skills', async () => {
    render(<SkillRepositoryPage />);
    expect(await screen.findByRole('heading', { name: 'Skill Assessments' })).toBeDefined();
    expect(screen.getByText('Python')).toBeDefined();
    expect(screen.getByText('JavaScript / TypeScript')).toBeDefined();
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Declared').length).toBeGreaterThan(0);
  });

    expect(await screen.findByRole('heading', { name: 'Skill Assessments' })).toBeDefined();
    expect(screen.getByText('No pending skill assessments')).toBeDefined();
  });
});
