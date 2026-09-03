import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicProfilePreviewPage from './page';

const me = vi.fn();
const getOnboarding = vi.fn();
const listSkillClaims = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    auth: { me: (...args: unknown[]) => me(...args) },
    users: { getOnboarding: (...args: unknown[]) => getOnboarding(...args) },
    assessment: { listSkillClaims: (...args: unknown[]) => listSkillClaims(...args) },
  },
}));

function renderPreview() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PublicProfilePreviewPage />
    </QueryClientProvider>,
  );
}

describe('PublicProfilePreviewPage', () => {
  beforeEach(() => {
    me.mockReset();
    getOnboarding.mockReset();
    listSkillClaims.mockReset();
    me.mockResolvedValue({
      fullName: 'Ada Lovelace',
      institutionName: 'Analytical Engine Lab',
      primaryTrack: 'MBA_FINANCE',
    });
    getOnboarding.mockResolvedValue({ profile: null, draft: null, onboardingCompleted: true });
    listSkillClaims.mockResolvedValue([]);
  });

  it('labels the page as a placeholder and does not show John Doe fixtures', async () => {
    renderPreview();
    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeTruthy());
    expect(screen.getByText('Placeholder')).toBeTruthy();
    expect(screen.getByText(/no public profile URL/i)).toBeTruthy();
    expect(screen.queryByText('John Doe')).toBeNull();
    expect(screen.queryByText('San Francisco, CA')).toBeNull();
    expect(screen.queryByText('Senior React Engineer')).toBeNull();
    expect(screen.queryByText('E-Commerce Microservices')).toBeNull();
  });
});
