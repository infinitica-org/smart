import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SmartApiError } from '@smart/api-client';
import { emptyOnboardingForm } from '@/lib/onboarding-form';
import SocialVerification from './SocialVerification';

vi.mock('@/lib/api', () => ({
  api: {
    users: {
      linkedinOauthUrl: vi.fn(),
      fetchGithubProfile: vi.fn(),
    },
  },
}));

import { api } from '@/lib/api';

describe('SocialVerification GitHub errors', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows "No such user found" for github_user_not_found', async () => {
    vi.mocked(api.users.fetchGithubProfile).mockRejectedValue(
      new SmartApiError({
        error: 'github_user_not_found',
        message: 'No public GitHub profile found for "ghost-user".',
        statusCode: 404,
      }),
    );

    const formData = {
      ...emptyOnboardingForm(),
      githubUrl: 'https://github.com/ghost-user',
    };
    const updateField = vi.fn();

    render(<SocialVerification formData={formData} updateField={updateField} />);
    fireEvent.click(screen.getByRole('button', { name: /Fetch profile/i }));

    expect(await screen.findByText('No such user found')).toBeTruthy();
  });

  it('shows integration-unavailable message for github_unavailable', async () => {
    vi.mocked(api.users.fetchGithubProfile).mockRejectedValue(
      new SmartApiError({
        error: 'github_unavailable',
        message: 'GitHub is unavailable right now. You can skip this and add it later.',
        statusCode: 503,
      }),
    );

    const formData = {
      ...emptyOnboardingForm(),
      githubUrl: 'https://github.com/octocat',
    };
    const updateField = vi.fn();

    render(<SocialVerification formData={formData} updateField={updateField} />);
    fireEvent.click(screen.getByRole('button', { name: /Fetch profile/i }));

    await waitFor(() => {
      expect(
        screen.getByText('GitHub is unavailable right now. You can skip this and add it later.'),
      ).toBeTruthy();
    });
  });

  it('loads profile preview for an existing GitHub user', async () => {
    vi.mocked(api.users.fetchGithubProfile).mockResolvedValue({
      login: 'octocat',
      name: 'The Octocat',
      avatarUrl: 'https://github.com/octocat.png',
      bio: null,
      publicRepoCount: 8,
    });

    const formData = {
      ...emptyOnboardingForm(),
      githubUrl: 'https://github.com/octocat',
    };
    const updateField = vi.fn();

    render(<SocialVerification formData={formData} updateField={updateField} />);
    fireEvent.click(screen.getByRole('button', { name: /Fetch profile/i }));

    expect(await screen.findByText(/The Octocat/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Yes, that's me/i })).toBeTruthy();
  });

  it('shows GitHub username only and normalizes pasted profile URLs', () => {
    const formData = {
      ...emptyOnboardingForm(),
      githubUrl: 'https://github.com/vishalbharath',
    };
    const updateField = vi.fn();

    render(<SocialVerification formData={formData} updateField={updateField} />);

    const githubInput = screen.getByLabelText('GitHub username');
    expect(githubInput).toHaveProperty('value', 'vishalbharath');

    fireEvent.change(githubInput, { target: { value: 'github.com/new-user' } });
    expect(updateField).toHaveBeenCalledWith('githubUrl', 'https://github.com/new-user');
  });
});
