import { render, screen, waitFor } from '@testing-library/react';
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
    onboarding: {
      getInstitutionPartnershipStatus: vi.fn().mockResolvedValue({
        institutionId: 'inst_1',
        institutionName: 'PSG Tech',
        isPartnered: true,
      }),
      listPartnerUniversities: vi.fn().mockResolvedValue([
        {
          institutionId: 'inst_1',
          name: 'PSG College of Technology',
          domain: 'psgtech.ac.in',
          isPartnered: true,
        },
      ]),
      connectPartnerUniversity: vi.fn().mockResolvedValue({
        userId: 'usr_1',
        institutionId: 'inst_1',
        institutionName: 'PSG College of Technology',
      }),
    },
  },
}));

vi.mock('@/lib/tour', () => ({
  markTourAutostart: vi.fn(),
}));

import OnboardingWizard from './OnboardingWizard';
import { WIZARD_STEP_META } from './wizard-ui';

describe('OnboardingWizard', () => {
  beforeEach(() => {
    push.mockReset();
    getOnboarding.mockReset();
    saveOnboarding.mockReset();
    completeOnboarding.mockReset();
    enrollTrack.mockReset();
    window.localStorage.clear();

    getOnboarding.mockResolvedValue({
      draft: null,
      profilePhotoUrl: null,
      onboardingCompleted: false,
    });
    saveOnboarding.mockResolvedValue({ saved: true });
    completeOnboarding.mockResolvedValue({ onboardingCompleted: true });
    enrollTrack.mockResolvedValue({ primaryTrack: 'TECH_FULLSTACK' });
  });

  it('defines the correct 3-step student onboarding wizard order', () => {
    const stepOrder = WIZARD_STEP_META.map((step) => step.id);
    expect(stepOrder).toEqual(['phone', 'school', 'profile']);
  });

  it('opens on the phone verification step for a new student', async () => {
    render(<OnboardingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Verify your mobile number')).toBeTruthy();
    });

    expect(screen.getByTestId('phone-number-input')).toBeTruthy();
    expect(screen.getByTestId('otp-code-input')).toBeTruthy();
  });

  it('resumes at the explicitly persisted onboardingStep', async () => {
    getOnboarding.mockResolvedValue({
      draft: {
        phoneNumber: '9876543210',
        dpdpConsent: true,
        onboardingStep: 'school',
      },
      profilePhotoUrl: null,
      onboardingCompleted: false,
    });

    render(<OnboardingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Connect to your Partner University')).toBeTruthy();
    });
  });

  it('renders Basic Profile step when moving to profile', async () => {
    getOnboarding.mockResolvedValue({
      draft: {
        phoneNumber: '9876543210',
        dpdpConsent: true,
        onboardingStep: 'profile',
      },
      profilePhotoUrl: null,
      onboardingCompleted: false,
    });

    render(<OnboardingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Basic Profile')).toBeTruthy();
      expect(screen.getByTestId('first-name-input')).toBeTruthy();
      expect(screen.getByTestId('major-study-program-input')).toBeTruthy();
    });
  });
});
