import { describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen } from '@testing-library/react';

import ProfilePage from './page';

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/lib/candidate-identity', () => ({
  useCurrentUser: () => ({
    data: {
      userId: 'usr_1',
      fullName: 'Ada Lovelace',
      profilePhotoUrl: null,
      institutionName: null,
    },
  }),
  useTracks: () => ({ data: [] }),
  headlineFor: () => 'SMART candidate',
  initialsOf: (fullName?: string) => {
    const parts = fullName?.trim().split(/\s+/u).filter(Boolean) ?? [];
    return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''}`.toUpperCase();
  },
}));

vi.mock('@/lib/use-onboarding', () => ({
  useOnboarding: () => ({
    data: { profile: null, draft: null, onboardingCompleted: true },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@smart/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn().mockResolvedValue(undefined) }),
  };
});

vi.mock('@/lib/use-profile-progress', () => ({
  useProfileProgress: () => ({
    loading: false,
    error: null,
    progress: {
      percent: 38,
      completedAreas: ['skills', 'languages', 'education'],
      incompleteAreas: [],
      areaStatus: {
        skills: true,
        languages: true,
        education: true,
        experience: false,
        projects: false,
        certifications: false,
        professionalLinks: false,
      },
    },
    input: {
      skillClaims: [],
      onboardingProfile: null,
      onboardingDraft: null,
      languages: [],
      education: [],
      experiences: [],
      projects: [],
      certificates: [],
    },
    visibleRecommendedAction: {
      id: 'add-experience',
      title: 'Add work experience',
      description: 'Share roles that shaped your professional journey.',
      ctaLabel: 'Add experience',
      href: '/profile?section=experience',
    },
    dismissRecommendedAction: vi.fn(),
    linkedinVerified: false,
    githubVerified: false,
  }),
}));

vi.mock('@/components/profile/ProfilePublicLinkCard', () => ({
  ProfilePublicLinkCard: () => null,
}));

vi.mock('@/components/profile/SkillsSection', () => ({
  SkillsSection: () => <div>Skills section</div>,
}));

vi.mock('@/components/profile/EducationSection', () => ({
  EducationSection: () => <div>Education section</div>,
}));

vi.mock('@/components/profile/WorkExperienceSection', () => ({
  WorkExperienceSection: () => <div>Work experience section</div>,
}));

vi.mock('@/components/profile/LanguagesSection', () => ({
  LanguagesSection: () => <div>Languages section</div>,
}));

vi.mock('@/components/profile/CertificatesSection', () => ({
  CertificatesSection: () => <div>Certificates section</div>,
}));

vi.mock('@/components/profile/CredentialsSection', () => ({
  CredentialsSection: () => <div>Credentials section</div>,
}));

vi.mock('@/components/profile/ProjectSubmissionForm', () => ({
  ProjectSubmissionForm: () => <div>Projects section</div>,
}));

vi.mock('@/components/profile/ProfessionalLinksSection', () => ({
  ProfessionalLinksSection: () => <div>Professional links section</div>,
}));

vi.mock('@/components/profile/ResumeSection', () => ({
  ResumeSection: () => <div>Resume section</div>,
}));

describe('ProfilePage', () => {
  it('defaults to education workspace without professional summary above tabs', () => {
    render(<ProfilePage />);

    expect(screen.queryByRole('button', { name: 'About' })).toBeNull();
    expect(screen.getByText('Education section')).toBeTruthy();
    expect(screen.queryByText(/Introduce yourself with a short professional summary/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit Profile/i })).toBeNull();
    expect(screen.queryByText('Skills section')).toBeNull();
    expect(screen.queryByText('Resume section')).toBeNull();
    expect(screen.queryByText('Overview')).toBeNull();
    expect(screen.getAllByText('38%').length).toBeGreaterThan(0);
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Upload profile photo|Change profile photo/i }),
    ).toBeTruthy();
  });

  it('navigates to another subsection via top nav without showing all sections', () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: 'Work Experience' }));

    expect(push).toHaveBeenCalledWith('/profile?section=experience', { scroll: false });
  });
});
