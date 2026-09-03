import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from './page';

const me = vi.fn();
const getOnboarding = vi.fn();
const listSkillClaims = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    auth: { me: (...args: unknown[]) => me(...args) },
    users: { getOnboarding: (...args: unknown[]) => getOnboarding(...args) },
    assessment: { listSkillClaims: (...args: unknown[]) => listSkillClaims(...args) },
    projects: { create: vi.fn(), get: vi.fn() },
  },
}));

function renderProfile() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProfilePage />
    </QueryClientProvider>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    me.mockReset();
    getOnboarding.mockReset();
    listSkillClaims.mockReset();
    me.mockResolvedValue({
      fullName: 'Ada Lovelace',
      institutionName: 'Analytical Engine Lab',
      primaryTrack: 'MBA_FINANCE',
    });
    getOnboarding.mockResolvedValue({
      onboardingCompleted: true,
      draft: null,
      profile: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        experiences: [{ role: 'Researcher', company: 'USN', tags: [] }],
        linkedinUrl: 'https://www.linkedin.com/in/ada',
      },
    });
    listSkillClaims.mockResolvedValue([]);
  });

  it('binds the header to GET /users/me and onboarding profile data', async () => {
    renderProfile();
    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeTruthy());
    expect(screen.getByText('Researcher · USN')).toBeTruthy();
    expect(screen.getByText('https://www.linkedin.com/in/ada')).toBeTruthy();
    expect(me).toHaveBeenCalled();
    expect(getOnboarding).toHaveBeenCalled();
  });

  it('does not render a fabricated profile-completion percentage', async () => {
    renderProfile();
    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeTruthy());
    expect(screen.queryByText(/68%/)).toBeNull();
    expect(screen.queryByText(/% complete/i)).toBeNull();
    expect(screen.queryByText('Sathe')).toBeNull();
  });
});
