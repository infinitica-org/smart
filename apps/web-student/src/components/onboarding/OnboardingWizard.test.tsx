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

  it('does not include a skills selection step in the wizard', () => {
    expect(WIZARD_STEP_META.map((step) => step.id)).not.toContain('skills');
  });

  it('starts with profile and does not include a resume upload step', () => {
    const stepOrder = WIZARD_STEP_META.map((step) => step.id);
    expect(stepOrder[0]).toBe('profile');
    expect(stepOrder).not.toContain('resume');
    expect(stepOrder).toContain('academics');
  });

  it('opens on the profile step for a new candidate', async () => {
    render(<OnboardingWizard />);

    await waitFor(() => {
      expect(screen.getByText("Let's set up your profile")).toBeTruthy();
    });

    expect(screen.queryByText(/upload your resume/i)).toBeNull();
  });

  it('hydrates an uploaded profile photo from the onboarding response', async () => {
    getOnboarding.mockResolvedValue({
      draft: { firstName: 'Ada', lastName: 'Lovelace' },
      profilePhotoUrl: 'https://cdn.example/photo.jpg',
      onboardingCompleted: false,
    });

    render(<OnboardingWizard />);

    await waitFor(() => {
      expect(screen.getByText("Let's set up your profile")).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: /change photo/i })).toBeTruthy();
  });

  it('resumes past legacy skills data to the languages step', async () => {
    getOnboarding.mockResolvedValue({
      draft: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        skills: [{ type: 'technical', name: 'JavaScript', proficiency: 'Intermediate' }],
      },
      profilePhotoUrl: null,
      onboardingCompleted: false,
    });

    render(<OnboardingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Languages you know')).toBeTruthy();
    });

    expect(screen.queryByText('Your skills')).toBeNull();
  });

  it('does not include a stream selection step', () => {
    const stepOrder = WIZARD_STEP_META.map((step) => step.id);
    expect(stepOrder).not.toContain('stream');
    expect(stepOrder.indexOf('academics')).toBe(stepOrder.indexOf('profile') + 1);
    expect(stepOrder.indexOf('languages')).toBe(stepOrder.indexOf('academics') + 1);
  });
});
