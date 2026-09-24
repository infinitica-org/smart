import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudentAssessmentHub } from './StudentAssessmentHub';

const push = vi.fn();
const listSkillClaimsMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const listEvidenceMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    assessment: {
      listSkillClaims: () => listSkillClaimsMock(),
    },
    evidence: {
      list: () => listEvidenceMock(),
    },
  },
}));

const loadBundleMock = vi.fn();

vi.mock('@/lib/skill-linked-evidence-bundle', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    loadProfileLinkedEvidenceBundle: () => loadBundleMock(),
  };
});

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
    listEvidenceMock.mockReset();
    loadBundleMock.mockReset();
    listEvidenceMock.mockResolvedValue([]);
    loadBundleMock.mockResolvedValue({
      projects: [],
      projectMappingsById: new Map(),
      workExperiences: [],
      projectTitleById: new Map(),
      experienceLabelById: new Map(),
      liveProjectIds: new Set(),
      liveExperienceIds: new Set(),
    });
  });

  it('shows empty state when no skill claims exist', async () => {
    listSkillClaimsMock.mockResolvedValue([]);
    render(<StudentAssessmentHub />);

    expect(await screen.findByText('No pending skill assessments')).toBeDefined();
    expect(screen.getByRole('link', { name: /Add Skills in Profile/i }).getAttribute('href')).toBe(
      '/skills',
    );
  });

  it('lists declared claims and starts assessment in inline session', async () => {
    listSkillClaimsMock.mockResolvedValue([
      { claimId: 'claim-1', skillCode: 'SE_REACT', status: 'DECLARED', lastAttemptId: null },
      { claimId: 'claim-2', skillCode: 'SE_PYTHON', status: 'VERIFIED', lastAttemptId: 'att-1' },
    ]);

    render(<StudentAssessmentHub />);

    expect(
      await screen.findByRole('heading', { name: 'Python Diagnostic Assessment' }),
    ).toBeDefined();
    expect(screen.getByRole('heading', { name: 'React Diagnostic Assessment' })).toBeDefined();

    const startButtons = screen.getAllByRole('button', { name: /Start Assessment/i });
    expect(startButtons.length).toBe(2);
    if (startButtons[0]) fireEvent.click(startButtons[0]);

    expect(await screen.findByText(/Question 1 of 2/i)).toBeDefined();
  });
});
