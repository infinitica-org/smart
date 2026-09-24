import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithQueryClient } from '@/test/render-with-query-client';
import DashboardPage from './page';

vi.mock('@/lib/candidate-identity', () => ({
  useCurrentUser: () => ({
    data: {
      userId: 'usr_1',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      profilePhotoUrl: null,
    },
    isLoading: false,
  }),
  firstNameOf: (name?: string) => name?.split(' ')[0] ?? '',
}));

vi.mock('@/lib/api', () => ({
  api: {
    placement: {
      listMyApplications: vi.fn().mockResolvedValue({ applications: [] }),
    },
  },
}));

vi.mock('@/lib/use-profile-progress', () => ({
  useProfileProgress: () => ({
    loading: false,
    error: null,
    progress: { percent: 33 },
    skillClaims: [],
    verifiedSkillCount: 0,
    declaredSkillCount: 0,
    input: { experiences: [] },
  }),
}));

describe('DashboardPage', () => {
  it('renders student dashboard hero, verification banner, stat cards, top matches, and activity feed', async () => {
    renderWithQueryClient(<DashboardPage />);

    expect(await screen.findByRole('heading', { name: /Ada/i })).toBeTruthy();
    expect(screen.getByTestId('student-verification-banner')).toBeTruthy();
    expect(screen.getByText('Your profile is 33% verified')).toBeTruthy();
    expect(screen.getByText('Strong-fit matches')).toBeTruthy();
    expect(screen.getByText('New opportunities')).toBeTruthy();
    expect(screen.getByText('Active applications')).toBeTruthy();

    expect(screen.getByText(/Top Matches for You/i)).toBeTruthy();
    expect(screen.getByText(/Your Skills/i)).toBeTruthy();
    expect(screen.getByText(/Recent Activity/i)).toBeTruthy();
  });
});
