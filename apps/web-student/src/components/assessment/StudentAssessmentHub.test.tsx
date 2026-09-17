import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudentAssessmentHub } from './StudentAssessmentHub';

const push = vi.fn();
const listSkillClaimsMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    assessment: {
      listSkillClaims: () => listSkillClaimsMock(),
    },
  },
}));

vi.mock('@/lib/use-profile-progress', () => ({
  useProfileProgress: () => ({
    loading: false,
    progress: { percent: 60, completedAreas: [], incompleteAreas: [], areaStatus: {} },
  }),
}));

vi.mock('@/lib/skill-declarations', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const labels: Record<string, string> = { SE_REACT: 'React', SE_PYTHON: 'Python' };
  return {
    ...actual,
    skillNameForCode: (code: string) => labels[code] ?? code,
    categoryNameForCode: () => 'Programming',
  };
});

describe('StudentAssessmentHub', () => {
  beforeEach(() => {
    push.mockClear();
    listSkillClaimsMock.mockReset();
  });

  it('shows empty state when no skill claims exist', async () => {
    listSkillClaimsMock.mockResolvedValue([]);
    render(<StudentAssessmentHub />);

    expect(await screen.findByRole('heading', { name: 'No skills selected yet' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Choose Skills' }).getAttribute('href')).toBe(
      '/profile?section=skills',
    );
  });

  it('lists only declared claims and starts assessment via player route', async () => {
    listSkillClaimsMock.mockResolvedValue([
      { claimId: 'claim-1', skillCode: 'SE_REACT', status: 'DECLARED', lastAttemptId: null },
      { claimId: 'claim-2', skillCode: 'SE_PYTHON', status: 'DECLARED', lastAttemptId: 'att-1' },
    ]);

    render(<StudentAssessmentHub />);

    expect(await screen.findByRole('heading', { name: 'Python' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'React' })).toBeDefined();
    expect(screen.getByText('Not started')).toBeDefined();
    expect(screen.getByText('In progress')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Start Assessment/i }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/assessments/skills/claim-1');
    });
  });
});
