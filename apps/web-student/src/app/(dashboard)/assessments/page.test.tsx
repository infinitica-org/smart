import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SkillsPage from './page';

const push = vi.fn();
const listSkillClaimsMock = vi.fn();
const declareSkillClaimMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    assessment: {
      listSkillClaims: () => listSkillClaimsMock(),
      declareSkillClaim: (...args: unknown[]) => declareSkillClaimMock(...args),
    },
  },
}));

describe('SkillsPage', () => {
  beforeEach(() => {
    push.mockReset();
    listSkillClaimsMock.mockReset();
    declareSkillClaimMock.mockReset();
    listSkillClaimsMock.mockResolvedValue([
      {
        claimId: 'claim-1',
        studentId: 'student-1',
        skillCode: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
        proficiency: 'INTERMEDIATE',
        status: 'VERIFIED',
      },
      {
        claimId: 'claim-2',
        studentId: 'student-1',
        skillCode: 'GIT_VERSION_CONTROL',
        proficiency: 'BEGINNER',
        status: 'DECLARED',
      },
    ]);
  });

  it('renders the Skills header and lists real database skill claims', async () => {
    render(<SkillsPage />);
    expect(await screen.findByRole('heading', { name: 'Skills' })).toBeDefined();
    expect(screen.getByText('Programming fundamentals & logic')).toBeDefined();
    expect(screen.getByText('Git & version control')).toBeDefined();
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not Verified').length).toBeGreaterThan(0);
  });

  it('allows starting a skill verification exam for an unverified skill', async () => {
    declareSkillClaimMock.mockResolvedValue({ claimId: 'claim-2' });
    render(<SkillsPage />);
    const startButtons = await screen.findAllByRole('button', { name: /Start/i });
    expect(startButtons.length).toBeGreaterThan(0);
    if (!startButtons[0]) throw new Error('Button not found');
    fireEvent.click(startButtons[0]);
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/assessments/skills/claim-2');
    });
  });

  it('opens details modal when View Details is clicked', async () => {
    render(<SkillsPage />);
    const detailsButtons = await screen.findAllByRole('button', { name: /View Details/i });
    if (!detailsButtons[0]) throw new Error('Button not found');
    fireEvent.click(detailsButtons[0]);
    expect(await screen.findByText('Database Claim ID:')).toBeDefined();
  });
});
