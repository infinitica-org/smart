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

  it('renders skill assessments hub with header', async () => {
    listSkillClaimsMock.mockResolvedValue([]);
    render(<AssessmentsPage />);

    expect(await screen.findByRole('heading', { name: 'Skill Assessments' })).toBeDefined();
    expect(screen.getByText('No pending skill assessments')).toBeDefined();
  });
});
