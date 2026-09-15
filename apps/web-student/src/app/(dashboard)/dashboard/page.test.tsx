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

vi.mock('@/lib/use-profile-progress', () => ({
  useProfileProgress: () => ({
    loading: false,
    error: null,
    input: null,
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
      title: 'Complete your Education profile',
      description:
        'Add your academic background to strengthen your profile and showcase your qualifications.',
      ctaLabel: 'Continue to Education',
      href: '/profile#education',
    },
    dismissRecommendedAction: vi.fn(),
    skillClaims: [
      { claimId: 'clm_1', skillCode: 'REACT', status: 'VERIFIED' },
      { claimId: 'clm_2', skillCode: 'NODE', status: 'DECLARED' },
    ],
  }),
}));

describe('DashboardPage', () => {
  it('renders greeting, profile progress, unlock message, and verified skills only', () => {
    render(<DashboardPage />);

    expect(screen.getByRole('heading', { name: /Welcome back, Ada/i })).toBeTruthy();
    expect(screen.getByText('Profile Completion')).toBeTruthy();
    expect(screen.getByText('38%')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to Profile' }).getAttribute('href')).toBe(
      '/profile',
    );
    expect(screen.getByText('Profile Sections')).toBeTruthy();
    expect(
      screen.getByText('Complete all profile sections to unlock skill verification.'),
    ).toBeTruthy();
    expect(screen.getByText('Recommended Next Step')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Complete your Education profile' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Continue to Education/i }).getAttribute('href')).toBe(
      '/profile#education',
    );

    expect(screen.getByText('Verified Skills')).toBeTruthy();
    expect(screen.getByText('REACT')).toBeTruthy();
    expect(screen.queryByText('NODE')).toBeNull();

    const skillRepositoryLink = screen.getByRole('link', { name: /Browse Skill Repository/i });
    expect(skillRepositoryLink.getAttribute('href')).toBe('/assessments');

    expect(screen.queryByText('Skills Declared')).toBeNull();
    expect(screen.queryByText(/Application tracker/i)).toBeNull();
  });
});
