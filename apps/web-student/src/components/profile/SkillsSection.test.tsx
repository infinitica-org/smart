import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SKILL_DEFINITIONS } from '@smart/contracts';

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
    expect(screen.queryByText('My selected skills')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Available skills' })).toBeDefined();
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

  it('declares every skill at the fixed diagnostic level and offers no self-rating control', async () => {
    render(<SkillsSection />);
    await screen.findByRole('heading', { name: 'Skills' });

    // The student only selects skills; proficiency is never something they can set.
    expect(screen.queryByRole('combobox', { name: /proficien|level/i })).toBeNull();
    expect(
      screen.queryByRole('radio', { name: /beginner|intermediate|advanced|expert/i }),
    ).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: /^Select$/i })[0] as HTMLButtonElement);

    await waitFor(() => expect(declareSkillClaimMock).toHaveBeenCalledTimes(1));
    expect(declareSkillClaimMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ proficiency: 'BEGINNER' }),
    );
  });

  it('does not re-declare a skill that is already selected', async () => {
    listSkillClaimsMock.mockResolvedValue([
      { claimId: 'clm-1', skillCode: SKILL_DEFINITIONS[0]?.code ?? '', status: 'DECLARED' },
    ]);
    render(<SkillsSection />);
    await screen.findByRole('heading', { name: 'Skills' });

    const selected = screen.getAllByRole('button', { name: /^Selected$/i })[0] as HTMLButtonElement;
    expect(selected.disabled).toBe(true);
    fireEvent.click(selected);

    expect(declareSkillClaimMock).not.toHaveBeenCalled();
  });

  it('shows a recoverable error when selecting fails and succeeds on retry', async () => {
    declareSkillClaimMock.mockRejectedValueOnce(new Error('Network down'));
    render(<SkillsSection />);
    await screen.findByRole('heading', { name: 'Skills' });

    fireEvent.click(screen.getAllByRole('button', { name: /^Select$/i })[0] as HTMLButtonElement);
    expect(await screen.findByText('Network down')).toBeDefined();

    fireEvent.click(screen.getAllByRole('button', { name: /^Select$/i })[0] as HTMLButtonElement);
    await waitFor(() => expect(declareSkillClaimMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Network down')).toBeNull());
  });

  it('shows an error when the skills list cannot be loaded', async () => {
    listSkillClaimsMock.mockRejectedValue(new Error('Failed to load skills.'));
    render(<SkillsSection />);

    expect(await screen.findByText('Failed to load skills.')).toBeDefined();
  });
});
