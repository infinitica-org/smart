import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicProfilePreviewPage from './page';

const { users } = vi.hoisted(() => ({
  users: { getMyPublicProfile: vi.fn(), getPublicProfileLink: vi.fn() },
}));

vi.mock('@/lib/api', () => ({ api: { users } }));
vi.mock('@/components/public-profile/visibility-settings-card', () => ({
  VisibilitySettingsCard: () => <div data-testid="visibility-card" />,
}));

const baseProfile = {
  fullName: 'Ada Lovelace',
  profilePhotoUrl: null,
  trackName: 'Backend Engineering',
  trackCategory: 'TECH',
  skills: [],
  declaredSkillsCount: 3,
  projects: [],
  workExperience: [],
  certificate: null,
  externalCertificates: [],
  education: [],
  competencyEvidenceSummaries: [],
  showInProgressItems: false,
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PublicProfilePreviewPage />
    </QueryClientProvider>,
  );
}

describe('PublicProfilePreviewPage (employer-visible preview)', () => {
  beforeEach(() => {
    users.getMyPublicProfile.mockReset().mockResolvedValue(baseProfile);
    users.getPublicProfileLink.mockReset().mockResolvedValue({ url: 'https://smart.test/c/ada' });
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it('shows a loading state before the profile arrives', () => {
    users.getMyPublicProfile.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText(/Loading your profile/i)).toBeTruthy();
  });

  it('renders exactly what an employer sees, including the empty verified-skills state', async () => {
    renderPage();

    expect(await screen.findByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Backend Engineering candidate')).toBeTruthy();
    expect(screen.getByText('No verified skills yet.')).toBeTruthy();
    expect(screen.getByText(/0 of 3 declared/)).toBeTruthy();
    // No proof yet, so the verified badge must not appear.
    expect(screen.queryByText('SMART Verified')).toBeNull();
  });

  it('shows only verified skills and the verified badge', async () => {
    users.getMyPublicProfile.mockResolvedValue({
      ...baseProfile,
      skills: [{ skillCode: 'SE_REACT', skillName: 'React', proficiency: 'ADVANCED' }],
    });
    renderPage();

    expect(await screen.findByText('React')).toBeTruthy();
    expect(screen.getByText('Advanced')).toBeTruthy();
    expect(screen.getByText('SMART Verified')).toBeTruthy();
    expect(screen.getByText(/1 of 3 declared/)).toBeTruthy();
  });

  it('copies the public link and confirms', async () => {
    renderPage();
    const copy = await screen.findByRole('button', { name: /Copy Link/i });
    await waitFor(() => expect((copy as HTMLButtonElement).disabled).toBe(false));

    fireEvent.click(copy);

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://smart.test/c/ada'),
    );
    expect(await screen.findByText('Copied!')).toBeTruthy();
  });

  it('reports a copy failure instead of failing silently', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('denied'),
    );
    renderPage();
    const copy = await screen.findByRole('button', { name: /Copy Link/i });
    await waitFor(() => expect((copy as HTMLButtonElement).disabled).toBe(false));

    fireEvent.click(copy);

    expect(await screen.findByText('Copy failed')).toBeTruthy();
  });

  it('disables link actions when no public link is available', async () => {
    users.getPublicProfileLink.mockResolvedValue({ url: null });
    renderPage();

    const copy = await screen.findByRole('button', { name: /Copy Link/i });
    expect((copy as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByRole('button', { name: /Share Profile/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
