import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { replace, me } = vi.hoisted(() => ({
  replace: vi.fn(),
  me: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock('../../lib/api', () => ({
  api: {
    auth: {
      me: (...args: unknown[]) => me(...args),
    },
  },
}));

import { OnboardingExitGate } from './OnboardingExitGate';

describe('OnboardingExitGate', () => {
  beforeEach(() => {
    replace.mockReset();
    me.mockReset();
  });

  it('redirects completed candidates from /onboarding to /dashboard', async () => {
    me.mockResolvedValue({
      role: 'STUDENT',
      onboardingCompleted: true,
      fullName: 'Done',
    });
    render(
      <OnboardingExitGate>
        <div>Wizard</div>
      </OnboardingExitGate>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    expect(screen.queryByText('Wizard')).toBeNull();
    expect(me).toHaveBeenCalled();
  });

  it('keeps incomplete candidates in onboarding', async () => {
    me.mockResolvedValue({
      role: 'STUDENT',
      onboardingCompleted: false,
      fullName: 'New',
    });
    render(
      <OnboardingExitGate>
        <div>Wizard</div>
      </OnboardingExitGate>,
    );

    await waitFor(() => expect(screen.getByText('Wizard')).toBeTruthy());
    expect(replace).not.toHaveBeenCalled();
  });
});
