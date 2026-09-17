import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfessionalLinksSection } from '@/components/profile/ProfessionalLinksSection';

vi.mock('@/lib/use-onboarding', () => ({
  useOnboarding: vi.fn(),
}));

vi.mock('@/components/onboarding/steps/SocialVerification', () => ({
  default: () => <div data-testid="social-verification">Social form</div>,
}));

vi.mock('@smart/ui', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@/lib/api', () => ({
  api: { users: { saveOnboarding: vi.fn() } },
}));

const { useOnboarding } = await import('@/lib/use-onboarding');

describe('ProfessionalLinksSection', () => {
  beforeEach(() => {
    vi.mocked(useOnboarding).mockReturnValue({
      data: { profile: null, draft: null, onboardingCompleted: true },
      isLoading: false,
      isError: false,
      error: null,
    } as never);
  });

  it('renders premium section header and save action', () => {
    render(<ProfessionalLinksSection />);

    expect(screen.getByRole('heading', { name: 'Professional Links' })).toBeTruthy();
    expect(screen.getByText(/Verify when you can/i)).toBeTruthy();
    expect(screen.getByTestId('social-verification')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save links' })).toBeTruthy();
  });
});
