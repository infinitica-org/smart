import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { replace, me } = vi.hoisted(() => ({
  replace: vi.fn(),
  me: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('../../lib/api', () => ({
  api: {
    auth: {
      me: (...args: unknown[]) => me(...args),
    },
  },
}));

import { OnboardingGate } from './OnboardingGate';

describe('OnboardingGate', () => {
  beforeEach(() => {
    replace.mockReset();
    me.mockReset();
  });

  it('redirects incomplete candidates away from the console', async () => {
    me.mockResolvedValueOnce({
      role: 'STUDENT',
      onboardingCompleted: false,
      fullName: 'Incomplete',
    });
    render(
      <OnboardingGate>
        <div>Secret dashboard</div>
      </OnboardingGate>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/onboarding'));
    expect(screen.queryByText('Secret dashboard')).toBeNull();
    expect(me).toHaveBeenCalled();
  });

  it('allows completed candidates into the console', async () => {
    me.mockResolvedValue({
      role: 'STUDENT',
      onboardingCompleted: true,
    });
    render(
      <OnboardingGate>
        <div>Secret dashboard</div>
      </OnboardingGate>,
    );

    await waitFor(() => expect(screen.getByText('Secret dashboard')).toBeTruthy());
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not trust localStorage for the gate (server flag only)', async () => {
    window.localStorage.setItem(
      'smart.candidate.onboarding.draft',
      JSON.stringify({ complete: true, dpdpConsent: true, firstName: 'Hack' }),
    );
    me.mockResolvedValueOnce({
      role: 'STUDENT',
      onboardingCompleted: false,
      fullName: 'Still Incomplete',
    });
    render(
      <OnboardingGate>
        <div>Secret dashboard</div>
      </OnboardingGate>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/onboarding'));
    expect(screen.queryByText('Secret dashboard')).toBeNull();
  });
});
