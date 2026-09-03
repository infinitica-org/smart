import { beforeEach, describe, expect, it } from 'vitest';
import { MOCK_ONBOARDING_STATE_KEY, mockStudentApiFetch } from './api';

function seedCompletedOnboarding() {
  window.sessionStorage.setItem(
    MOCK_ONBOARDING_STATE_KEY,
    JSON.stringify({
      completed: true,
      profile: { firstName: 'Ada', lastName: 'Lovelace' },
      draft: null,
    }),
  );
}

async function jsonBody(response: Response) {
  return (await response.json()) as {
    user?: { onboardingCompleted?: boolean };
    onboardingCompleted?: boolean;
    primaryTrack?: string | null;
  };
}

describe('mock student API onboarding persistence', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('does not reset completed onboarding on password login', async () => {
    seedCompletedOnboarding();
    const response = await mockStudentApiFetch('http://localhost:3000/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'student@example.com', password: 'password12' }),
    });
    const body = await jsonBody(response);
    expect(body.user?.onboardingCompleted).toBe(true);
    expect(window.sessionStorage.getItem(MOCK_ONBOARDING_STATE_KEY)).toContain('"completed":true');
  });

  it('does not reset completed onboarding on SSO callback', async () => {
    seedCompletedOnboarding();
    const response = await mockStudentApiFetch('http://localhost:3000/auth/sso/callback', {
      method: 'POST',
      body: JSON.stringify({ code: 'mock_code', state: 'mock_state' }),
    });
    const body = await jsonBody(response);
    expect(body.user?.onboardingCompleted).toBe(true);
    expect(window.sessionStorage.getItem(MOCK_ONBOARDING_STATE_KEY)).toContain('"completed":true');
  });

  it('preserves onboardingCompleted on mock track enrollment', async () => {
    seedCompletedOnboarding();
    const response = await mockStudentApiFetch('http://localhost:3000/users/me/track', {
      method: 'PUT',
      body: JSON.stringify({ trackCode: 'MBA_FINANCE' }),
    });
    const body = await jsonBody(response);
    expect(body.onboardingCompleted).toBe(true);
    expect(body.primaryTrack).toBe('MBA_FINANCE');
  });
});
