import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type * as UiModule from '@smart/ui';
import DashboardPage from './page';

vi.mock('@smart/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof UiModule>();
  return {
    ...actual,
    useQuery: vi.fn().mockReturnValue({
      data: [
        { claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' },
        { claimId: 'clm_2', skillCode: 'NODE', status: 'DECLARED' },
      ],
    }),
  };
});

vi.mock('@/lib/api', () => ({
  api: {
    assessment: {
      listSkillClaims: vi.fn(),
    },
  },
}));

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
}));

vi.mock('@/lib/tour', () => ({
  consumeTourAutostart: () => false,
}));

vi.mock('@/components/tour/ProductTour', () => ({
  ProductTour: () => null,
}));

vi.mock('@/lib/use-profile-progress', () => ({
  useProfileProgress: () => ({
    loading: false,
    error: null,
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
        jobPreferences: false,
      },
    },
    visibleRecommendedAction: {
      id: 'add-education',
      title: 'Add education',
      description: 'Help employers understand your academic background.',
      ctaLabel: 'Add education',
      href: '/profile#education',
    },
    dismissRecommendedAction: vi.fn(),
  }),
}));

describe('DashboardPage', () => {
  it('renders greeting, profile progress, unlock message, and verified skills only', () => {
    render(<DashboardPage />);

    expect(screen.getByRole('heading', { name: /Welcome back, Ada/i })).toBeTruthy();
    expect(screen.getByText('Your SMART Profile')).toBeTruthy();
    expect(screen.getByText('37% complete')).toBeTruthy();
    expect(
      screen.getByText('Reach at least 50% profile completion to unlock skill verification.'),
    ).toBeTruthy();
    expect(screen.getByText('Recommended next step')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Add education' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Add education' }).getAttribute('href')).toBe(
      '/profile#education',
    );
    expect(
      screen.getByRole('link', { name: /Continue building your profile/i }).getAttribute('href'),
    ).toBe('/profile');

    expect(screen.getByRole('heading', { name: 'Skills you have verified' })).toBeTruthy();
    expect(screen.getByText('REACT')).toBeTruthy();
    expect(screen.queryByText('NODE')).toBeNull();

    const skillRepositoryLink = screen.getByRole('link', { name: /Browse Skill Repository/i });
    expect(skillRepositoryLink.getAttribute('href')).toBe('/assessments');

    expect(screen.queryByText('Skills Declared')).toBeNull();
    expect(screen.queryByText(/Application tracker/i)).toBeNull();
    expect(screen.queryByText(/Public profile/i)).toBeNull();
    expect(screen.queryByText(/Active Apps/i)).toBeNull();
  });
});
