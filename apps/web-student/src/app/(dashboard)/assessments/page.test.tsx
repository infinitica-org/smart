import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SkillRepositoryPage from './page';

const push = vi.fn();
const listSkillClaimsMock = vi.fn();
const declareSkillClaimMock = vi.fn();

const profileProgressMock = vi.fn();

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

vi.mock('@/lib/use-profile-progress', () => ({
  useProfileProgress: () => profileProgressMock(),
}));

function mockIncompleteProfile() {
  profileProgressMock.mockReturnValue({
    loading: false,
    progress: {
      percent: 62,
      completedAreas: ['skills', 'languages', 'education', 'experience', 'projects'],
      incompleteAreas: ['certifications', 'professionalLinks', 'jobPreferences'],
      areaStatus: {
        skills: true,
        languages: true,
        education: true,
        experience: true,
        projects: true,
        certifications: false,
        professionalLinks: false,
        jobPreferences: false,
      },
    },
    recommendedAction: {
      id: 'add-certification',
      title: 'Add a certification',
      description: 'External certifications strengthen your profile.',
      ctaLabel: 'Add certification',
      href: '/profile#certificates',
    },
  });
}

function mockCompleteProfile() {
  profileProgressMock.mockReturnValue({
    loading: false,
    progress: {
      percent: 100,
      completedAreas: [
        'skills',
        'languages',
        'education',
        'experience',
        'projects',
        'certifications',
        'professionalLinks',
        'jobPreferences',
      ],
      incompleteAreas: [],
      areaStatus: {
        skills: true,
        languages: true,
        education: true,
        experience: true,
        projects: true,
        certifications: true,
        professionalLinks: true,
        jobPreferences: true,
      },
    },
    recommendedAction: {
      id: 'explore-public-profile',
      title: 'Explore your public profile',
      description: 'See how employers will view your SMART profile.',
      ctaLabel: 'View public profile',
      href: '/public-profile',
    },
  });
}

async function selectSkill(name: string) {
  const skillButton = await screen.findByRole('button', { name: new RegExp(name, 'i') });
  fireEvent.click(skillButton);
  return skillButton;
}

async function selectProficiency(label: string) {
  const proficiencyButton = await screen.findByRole('button', { name: label, pressed: false });
  fireEvent.click(proficiencyButton);
}

describe('SkillRepositoryPage', () => {
  beforeEach(() => {
    push.mockReset();
    listSkillClaimsMock.mockReset();
    declareSkillClaimMock.mockReset();
    profileProgressMock.mockReset();
    mockIncompleteProfile();
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

  it('renders the Skill Repository heading and catalog skills', async () => {
    render(<SkillRepositoryPage />);
    expect(await screen.findByRole('heading', { name: 'Skill Repository' })).toBeDefined();
    expect(screen.getByText('Programming fundamentals & logic')).toBeDefined();
    expect(screen.getByText('Git & version control')).toBeDefined();
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Declared').length).toBeGreaterThan(0);
  });

  it('shows skill details and status after selecting a skill', async () => {
    render(<SkillRepositoryPage />);
    await selectSkill('Git & version control');

    expect(await screen.findByRole('region', { name: 'Skill details' })).toBeDefined();
    expect(screen.getByText('Current status')).toBeDefined();
    expect(
      within(screen.getByRole('region', { name: 'Skill details' })).getByText('Declared'),
    ).toBeDefined();
    expect(screen.getByText('Select proficiency')).toBeDefined();
  });

  it('displays proficiency options for the selected skill', async () => {
    render(<SkillRepositoryPage />);
    await selectSkill('Git & version control');

    expect(await screen.findByRole('button', { name: 'Beginner' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Intermediate' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Advanced' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Professional' })).toBeDefined();
  });

  it('keeps Take Assessment disabled when profile is incomplete', async () => {
    render(<SkillRepositoryPage />);
    await selectSkill('Git & version control');

    const takeAssessment = await screen.findByRole('button', { name: /Take Assessment/i });
    expect(takeAssessment.hasAttribute('disabled')).toBe(true);
    const details = await screen.findByRole('region', { name: 'Skill details' });
    expect(
      within(details).getByText('Complete your profile to unlock skill verification.'),
    ).toBeDefined();
    expect(
      within(details).getByRole('link', { name: 'Add certification' }).getAttribute('href'),
    ).toBe('/profile#certificates');
  });

  it('keeps Take Assessment disabled when profile is complete but proficiency is not selected', async () => {
    mockCompleteProfile();
    listSkillClaimsMock.mockResolvedValue([]);
    render(<SkillRepositoryPage />);
    await selectSkill('Programming fundamentals & logic');
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Beginner', pressed: true })).toBeNull();
    });

    const takeAssessment = screen.getByRole('button', { name: /Take Assessment/i });
    expect(takeAssessment.hasAttribute('disabled')).toBe(true);
  });

  it('enables Take Assessment when profile is complete and proficiency is selected', async () => {
    mockCompleteProfile();
    render(<SkillRepositoryPage />);
    await selectSkill('Git & version control');
    await selectProficiency('Advanced');

    const takeAssessment = await screen.findByRole('button', { name: /Take Assessment/i });
    expect(takeAssessment.hasAttribute('disabled')).toBe(false);
  });

  it('navigates to the existing assessment route when Take Assessment is clicked', async () => {
    mockCompleteProfile();
    declareSkillClaimMock.mockResolvedValue({
      claimId: 'claim-2',
      skillCode: 'GIT_VERSION_CONTROL',
      proficiency: 'ADVANCED',
      status: 'DECLARED',
    });

    render(<SkillRepositoryPage />);
    await selectSkill('Git & version control');
    await selectProficiency('Advanced');

    fireEvent.click(screen.getByRole('button', { name: /Take Assessment/i }));

    await waitFor(() => {
      expect(declareSkillClaimMock).toHaveBeenCalledWith(
        expect.objectContaining({
          skillCode: 'GIT_VERSION_CONTROL',
          proficiency: 'ADVANCED',
        }),
      );
      expect(push).toHaveBeenCalledWith('/assessments/skills/claim-2');
    });
  });

  it('keeps Take Assessment disabled for verified skills when profile is incomplete', async () => {
    render(<SkillRepositoryPage />);
    await selectSkill('Programming fundamentals & logic');

    const takeAssessment = await screen.findByRole('button', { name: /Practice Assessment/i });
    expect(takeAssessment.hasAttribute('disabled')).toBe(true);
  });

  it('preserves verified status display for verified claims', async () => {
    render(<SkillRepositoryPage />);
    await selectSkill('Programming fundamentals & logic');

    const details = await screen.findByRole('region', { name: 'Skill details' });
    expect(within(details).getByText('Verified')).toBeDefined();
  });

  it('shows not declared status for catalog skills without a claim', async () => {
    render(<SkillRepositoryPage />);
    await selectSkill('Database fundamentals');

    const details = await screen.findByRole('region', { name: 'Skill details' });
    expect(within(details).getByText('Not declared')).toBeDefined();
  });
});
