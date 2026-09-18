import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SkillsSection } from './SkillsSection';

const listSkillClaimsMock = vi.fn();
const declareSkillClaimMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    assessment: {
      listSkillClaims: () => listSkillClaimsMock(),
      declareSkillClaim: (...args: unknown[]) => declareSkillClaimMock(...args),
    },
  },
}));

vi.mock('@/lib/skill-declarations', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    skillNameForCode: (code: string) => (code === 'SE_REACT' ? 'React' : code),
  };
});

describe('SkillsSection', () => {
  beforeEach(() => {
    listSkillClaimsMock.mockReset();
    declareSkillClaimMock.mockReset();
    listSkillClaimsMock.mockResolvedValue([]);
    declareSkillClaimMock.mockResolvedValue({
      claimId: 'new-1',
      skillCode: 'REACT',
      status: 'DECLARED',
    });
  });

  it('renders catalog skills from contracts and shows selected state', async () => {
    listSkillClaimsMock.mockResolvedValue([
      { claimId: 'clm-1', skillCode: 'SE_REACT', status: 'DECLARED' },
    ]);

    render(<SkillsSection />);

    expect(await screen.findByRole('heading', { name: 'Skills' })).toBeDefined();
    expect(screen.getByPlaceholderText('Search skills…')).toBeDefined();
    expect(screen.getByText('My selected skills')).toBeDefined();
    expect(screen.getByText('React')).toBeDefined();
  });

  it('persists selection through declareSkillClaim API', async () => {
    render(<SkillsSection />);
    await screen.findByRole('heading', { name: 'Skills' });

    const selectButton = screen.getAllByRole('button', { name: /^Select$/i })[0];
    expect(selectButton).toBeDefined();
    fireEvent.click(selectButton as HTMLButtonElement);

    await waitFor(() => {
      expect(declareSkillClaimMock).toHaveBeenCalled();
    });
    expect(listSkillClaimsMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
