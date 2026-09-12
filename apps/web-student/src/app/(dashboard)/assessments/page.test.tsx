import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
        skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
        proficiency: 'INTERMEDIATE',
        status: 'VERIFIED',
      },
      {
        claimId: 'claim-2',
        studentId: 'student-1',
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        proficiency: 'BEGINNER',
        status: 'DECLARED',
      },
    ]);
  });

  it('renders the Skills header and lists real database skill claims', async () => {
    render(<SkillsPage />);
    expect(await screen.findByRole('heading', { name: 'Skills' })).toBeDefined();
    expect(screen.getByText('Algorithmic Complexity & Performance Optimization')).toBeDefined();
    expect(screen.getByText('SQL & Query Optimization')).toBeDefined();
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

  it('declares a new skill at professional proficiency from the add dialog', async () => {
    declareSkillClaimMock.mockResolvedValue({
      claimId: 'claim-pro',
      studentId: 'student-1',
      skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      proficiency: 'PROFESSIONAL',
      status: 'DECLARED',
      strikes: 0,
      lockedUntil: null,
      lastAttemptId: null,
    });
    render(<SkillsPage />);
    await screen.findByRole('heading', { name: 'Skills' });
    const addSkillButton = screen.getAllByRole('button', { name: /Add Skill/i })[0];
    if (!addSkillButton) throw new Error('Add Skill button not found');
    fireEvent.click(addSkillButton);
    const dialogHeading = await screen.findByRole('heading', { name: 'Add a Skill' });
    const modal = dialogHeading.closest('.fixed');
    const form = modal?.querySelector('form');
    if (!form) throw new Error('Add skill form not found');
    const selects = within(form as HTMLElement).getAllByRole('combobox');
    const skillSelect = selects[0];
    const proficiencySelect = selects[1];
    if (!skillSelect || !proficiencySelect) throw new Error('Add skill selects not found');
    fireEvent.change(skillSelect, {
      target: { value: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT' },
    });
    fireEvent.change(proficiencySelect, {
      target: { value: 'PROFESSIONAL' },
    });
    fireEvent.submit(form as HTMLFormElement);
    await waitFor(() => {
      expect(declareSkillClaimMock).toHaveBeenCalledWith(
        expect.objectContaining({
          skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
          proficiency: 'PROFESSIONAL',
        }),
      );
    });
  });

  it('opens details modal when View Details is clicked', async () => {
    render(<SkillsPage />);
    const detailsButtons = await screen.findAllByRole('button', { name: /View Details/i });
    if (!detailsButtons[0]) throw new Error('Button not found');
    fireEvent.click(detailsButtons[0]);
    expect(await screen.findByText('Verification Status:')).toBeDefined();
  });
});
