import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { push, getOnboarding, saveOnboarding, completeOnboarding, enrollTrack } = vi.hoisted(() => ({
  push: vi.fn(),
  getOnboarding: vi.fn(),
  saveOnboarding: vi.fn(),
  completeOnboarding: vi.fn(),
  enrollTrack: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    users: {
      getOnboarding: (...args: unknown[]) => getOnboarding(...args),
      saveOnboarding: (...args: unknown[]) => saveOnboarding(...args),
      completeOnboarding: (...args: unknown[]) => completeOnboarding(...args),
    },
    auth: {
      enrollTrack: (...args: unknown[]) => enrollTrack(...args),
    },
  },
}));

vi.mock('@/lib/tour', () => ({
  markTourAutostart: vi.fn(),
}));

import OnboardingWizard from './OnboardingWizard';

describe('OnboardingWizard', () => {
  beforeEach(() => {
    push.mockReset();
    getOnboarding.mockReset();
    saveOnboarding.mockReset();
    completeOnboarding.mockReset();
    enrollTrack.mockReset();
    window.localStorage.clear();

    getOnboarding.mockResolvedValue({ draft: null });
    saveOnboarding.mockResolvedValue({ saved: true });
    completeOnboarding.mockResolvedValue({ onboardingCompleted: true });
  });

  it('does not call enrollTrack during minimal onboarding completion', async () => {
    render(<OnboardingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Welcome to SMART')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('interest-domain-CS_IT'));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText("Let's set up your profile")).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Lovelace' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    fireEvent.change(screen.getByPlaceholderText('9876543210'), {
      target: { value: '9876543210' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /enter smart/i }));

    await waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          interestDomain: 'CS_IT',
          firstName: 'Ada',
          lastName: 'Lovelace',
          phoneCountryCode: '+91',
          phoneNumber: '9876543210',
          dpdpConsent: true,
        }),
      );
    });

    expect(enrollTrack).not.toHaveBeenCalled();
  });
});
