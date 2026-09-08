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
  headlineFor: () => 'Full Stack Engineer',
}));

vi.mock('@/lib/skill-declarations', () => ({
  skillNameForCode: (code: string) => code,
  claimToBadgeStatus: (claim: { status: string }) => claim.status,
}));

describe('DashboardPage', () => {
  it('renders skills section and candidate welcome, but does NOT render Application tracker or Public profile', () => {
    render(<DashboardPage />);

    expect(screen.getByText(/Welcome back, Ada/i)).toBeTruthy();
    expect(screen.getByText('Your skills')).toBeTruthy();
    expect(screen.getByText('Verified Skills')).toBeTruthy();
    expect(screen.getByText('Skills Declared')).toBeTruthy();

    // Verify Application tracker and Public profile are removed from Home page
    expect(screen.queryByText(/Application tracker/i)).toBeNull();
    expect(screen.queryByText(/Public profile/i)).toBeNull();
    expect(screen.queryByText(/Active Apps/i)).toBeNull();
  });
});
