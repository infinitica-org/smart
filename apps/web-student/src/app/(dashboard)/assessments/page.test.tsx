import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SkillRepositoryPage from './page';

const push = vi.fn();
const listSkillClaimsMock = vi.fn();
const declareSkillClaimMock = vi.fn();
const listEvidenceMock = vi.fn();
const listProjectsMock = vi.fn();
const listWorkExperiencesMock = vi.fn();
const listProjectSkillMappingsMock = vi.fn();

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
    evidence: {
      list: (...args: unknown[]) => listEvidenceMock(...args),
      listProjectSkillMappings: (...args: unknown[]) => listProjectSkillMappingsMock(...args),
    },
    projects: {
      listMine: () => listProjectsMock(),
    },
    users: {
      listWorkExperiences: () => listWorkExperiencesMock(),
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
      percent: 5,
      completedAreas: ['skills', 'languages', 'education'],
      incompleteAreas: [
        'experience',
        'projects',
        'certifications',
        'professionalLinks',
        'jobPreferences',
      ],
      areaStatus: {
        skills: true,
        languages: true,
        education: true,
        experience: false,
        projects: false,
        certifications: false,
        professionalLinks: false,
        jobPreferences: false,
      },
    },
    recommendedAction: {
      id: 'add-experience',
      title: 'Add work experience',
      description: 'Share roles that shaped your professional journey.',
      ctaLabel: 'Add experience',
      href: '/profile?section=experience',
    },
  });
}

function mockCompleteProfile() {
  profileProgressMock.mockReturnValue({
    loading: false,
    progress: {
      percent: 50,
      completedAreas: ['skills', 'languages', 'education', 'experience'],
      incompleteAreas: ['projects', 'certifications', 'professionalLinks', 'jobPreferences'],
      areaStatus: {
        skills: true,
        languages: true,
        education: true,
        experience: true,
        projects: false,
        certifications: false,
        professionalLinks: false,
        jobPreferences: false,
      },
    },
    recommendedAction: {
      id: 'add-project',
      title: 'Add a project',
      description: 'Projects are strong evidence of what you have built.',
      ctaLabel: 'Add project',
      href: '/profile?section=projects',
    },
  });
}

async function selectSkill(name: string) {
  const skillButton = await screen.findByRole('button', { name: new RegExp(name, 'i') });
  fireEvent.click(skillButton);
  return skillButton;
}

describe('SkillRepositoryPage', () => {
  beforeEach(() => {
    push.mockReset();
    listSkillClaimsMock.mockReset();
    declareSkillClaimMock.mockReset();
    listEvidenceMock.mockReset();
    listEvidenceMock.mockResolvedValue([]);
    listProjectsMock.mockReset();
    listProjectsMock.mockResolvedValue({ projects: [] });
    listWorkExperiencesMock.mockReset();
    listWorkExperiencesMock.mockResolvedValue([]);
    listProjectSkillMappingsMock.mockReset();
    listProjectSkillMappingsMock.mockResolvedValue([]);
    profileProgressMock.mockReset();
    mockIncompleteProfile();
    listSkillClaimsMock.mockResolvedValue([
      {
        claimId: 'claim-1',
        studentId: 'student-1',
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        proficiency: 'INTERMEDIATE',
        status: 'VERIFIED',
      },
      {
        claimId: 'claim-2',
        studentId: 'student-1',
        skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
        proficiency: 'BEGINNER',
        status: 'DECLARED',
      },
    ]);
  });

  it('renders the Skill Repository heading and catalog skills', async () => {
    render(<SkillRepositoryPage />);
    expect(await screen.findByRole('heading', { name: 'Skill Repository' })).toBeDefined();
    expect(screen.getByText('Python')).toBeDefined();
    expect(screen.getByText('JavaScript / TypeScript')).toBeDefined();
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Declared').length).toBeGreaterThan(0);
  });

  it('shows skill details and assessment instructions after selecting a skill', async () => {
    render(<SkillRepositoryPage />);
    await selectSkill('JavaScript / TypeScript');

    const details = await screen.findByRole('region', { name: 'Skill details' });
    expect(details).toBeDefined();
    expect(within(details).getByText('Current status')).toBeDefined();
    expect(within(details).getByText('Declared')).toBeDefined();
    expect(within(details).getByText('How we assess you')).toBeDefined();
    expect(screen.queryByText('Select proficiency')).toBeNull();
  });

  it('keeps Take Assessment disabled when profile is below 10%', async () => {
    render(<SkillRepositoryPage />);
    await selectSkill('JavaScript / TypeScript');

    const takeAssessment = await screen.findByRole('button', { name: /Take Assessment/i });
    expect(takeAssessment.hasAttribute('disabled')).toBe(true);
    const details = await screen.findByRole('region', { name: 'Skill details' });
    expect(
      within(details).getByText('Complete your profile to unlock skill verification.'),
    ).toBeDefined();
    expect(within(details).getByRole('link', { name: 'Add experience' }).getAttribute('href')).toBe(
      '/profile?section=experience',
    );
  });

  it('enables Take Assessment when profile is at least 10% complete', async () => {
    mockCompleteProfile();
    render(<SkillRepositoryPage />);
    await selectSkill('JavaScript / TypeScript');

    const takeAssessment = await screen.findByRole('button', { name: /Take Assessment/i });
    expect(takeAssessment.hasAttribute('disabled')).toBe(false);
  });

  it('navigates to the existing assessment route when Take Assessment is clicked', async () => {
    mockCompleteProfile();
    declareSkillClaimMock.mockResolvedValue({
      claimId: 'claim-2',
      skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
      proficiency: 'BEGINNER',
      status: 'DECLARED',
    });

    render(<SkillRepositoryPage />);
    await selectSkill('JavaScript / TypeScript');

    fireEvent.click(screen.getByRole('button', { name: /Take Assessment/i }));

    await waitFor(() => {
      expect(declareSkillClaimMock).toHaveBeenCalledWith(
        expect.objectContaining({
          skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
          proficiency: 'BEGINNER',
        }),
      );
      expect(push).toHaveBeenCalledWith('/assessments/skills/claim-2');
    });
  });

  it('does not show Take Assessment for verified skills', async () => {
    render(<SkillRepositoryPage />);
    await selectSkill('Python');

    const details = await screen.findByRole('region', { name: 'Skill details' });
    expect(within(details).queryByRole('button', { name: /Take Assessment/i })).toBeNull();
    expect(within(details).queryByRole('button', { name: /Practice Assessment/i })).toBeNull();
  });

  it('preserves verified status display for verified claims', async () => {
    render(<SkillRepositoryPage />);
    await selectSkill('Python');

    const details = await screen.findByRole('region', { name: 'Skill details' });
    expect(within(details).getByText('Verified')).toBeDefined();
  });

  it('does not list catalog skills until they are added', async () => {
    render(<SkillRepositoryPage />);
    await screen.findByText('Python');
    expect(screen.queryByRole('button', { name: /^Go$/i })).toBeNull();
  });

  it('adds a skill from the category picker dialog', async () => {
    mockCompleteProfile();
    declareSkillClaimMock.mockResolvedValue({
      claimId: 'claim-go',
      skillCode: 'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES',
      proficiency: 'BEGINNER',
      status: 'DECLARED',
    });

    render(<SkillRepositoryPage />);
    await screen.findByText('Python');

    fireEvent.click(screen.getByRole('button', { name: /Add skill/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Add skill' });
    fireEvent.change(within(dialog).getByPlaceholderText('Search skills...'), {
      target: { value: 'Go' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: /Go GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES/i }),
    );

    await waitFor(() => {
      expect(declareSkillClaimMock).toHaveBeenCalledWith(
        expect.objectContaining({
          skillCode: 'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES',
          proficiency: 'BEGINNER',
        }),
      );
    });
    expect(
      await screen.findByRole('button', { name: /Go GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES/i }),
    ).toBeDefined();
  });
});
