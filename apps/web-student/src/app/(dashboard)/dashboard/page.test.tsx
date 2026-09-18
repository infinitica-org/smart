import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type * as UiModule from '@smart/ui';
import DashboardPage from './page';

vi.mock('@smart/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof UiModule>();
  return actual;
});

vi.mock('@/lib/candidate-identity', () => ({
  useCurrentUser: () => ({
    data: {
      userId: 'usr_1',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      profilePhotoUrl: null,
    },
  }),
  useTracks: () => ({
    data: [],
  }),
  firstNameOf: (name?: string) => name?.split(' ')[0] ?? '',
  initialsOf: (name?: string) =>
    name
      ?.split(' ')
      .map((part) => part[0])
      .join('') ?? '',
  headlineFor: () => 'SMART candidate',
}));

vi.mock('@/lib/skill-declarations', () => ({
  skillNameForCode: (code: string) => code,
  claimToBadgeStatus: (claim: { status: string }) => claim.status,
  proficiencyLabelForClaim: () => null,
}));

vi.mock('@/lib/tour', () => ({
  consumeTourAutostart: () => false,
}));

vi.mock('@/components/tour/ProductTour', () => ({
  ProductTour: () => null,
}));

vi.mock('@/components/profile/ProfilePhotoEditControl', () => ({
  ProfilePhotoEditControl: () => null,
}));

vi.mock('@/components/profile/ProfilePublicLinkCard', () => ({
  ProfilePublicLinkCard: () => <div>Public profile link</div>,
}));

vi.mock('@/lib/use-profile-progress', () => ({
  useProfileProgress: () => ({
    loading: false,
    error: null,
    input: { education: [] },
    linkedinVerified: false,
    githubVerified: true,
    progress: {
      percent: 37,
      completedAreas: ['skills', 'languages', 'projects'],
      incompleteAreas: [],
      areaStatus: {
        skills: true,
        languages: true,
        education: false,
        experience: false,
        projects: true,
        certifications: false,
        professionalLinks: false,
      },
    },
    visibleRecommendedAction: {
      id: 'add-education',
      title: 'Complete your Education profile',
      description:
        'Add your academic background to strengthen your profile and showcase your qualifications.',
      ctaLabel: 'Continue to Education',
      href: '/profile?section=education',
    },
    dismissRecommendedAction: vi.fn(),
    skillClaims: [
      { claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' },
      { claimId: 'clm_2', skillCode: 'NODE', status: 'DECLARED' },
    ],
  }),
}));

describe('DashboardPage', () => {
  it('renders profile hero, public link, progress cards, and verified skills', () => {
    render(<DashboardPage />);

    expect(screen.getByRole('heading', { name: /Welcome back, Ada/i })).toBeTruthy();
    expect(screen.getByTestId('profile-hero-banner')).toBeTruthy();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Public profile link')).toBeTruthy();
    expect(screen.getByText('37%')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /3 of 7 sections complete/i }).getAttribute('href'),
    ).toBe('/profile');
    expect(screen.getByText('Profile Sections')).toBeTruthy();
    expect(screen.queryByText('Why complete your profile?')).toBeNull();
    expect(screen.getByText('Recommended Next Step')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Complete your Education profile' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Continue to Education/i }).getAttribute('href')).toBe(
      '/profile?section=education',
    );

    expect(screen.getByText('Verified Skills')).toBeTruthy();
    expect(screen.getByText('REACT')).toBeTruthy();
    expect(screen.queryByText('NODE')).toBeNull();

    const manageSkillsLink = screen.getByRole('link', { name: /Manage skills/i });
    expect(manageSkillsLink.getAttribute('href')).toBe('/profile?section=skills');

    expect(screen.queryByText('Skills Declared')).toBeNull();
    expect(screen.queryByText(/Application tracker/i)).toBeNull();
  });
});
