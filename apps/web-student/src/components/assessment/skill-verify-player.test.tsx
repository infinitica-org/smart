import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SmartApiError } from '@smart/api-client';
import { SkillVerifyPlayer } from './skill-verify-player';

const prepareSkillVerifyMock = vi.fn();
const listSkillClaimsMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    assessment: {
      prepareSkillVerify: (...args: unknown[]) => prepareSkillVerifyMock(...args),
      listSkillClaims: (...args: unknown[]) => listSkillClaimsMock(...args),
    },
  },
}));

vi.mock('@/components/proctoring/proctoring-shell', () => ({
  ProctoringShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('SkillVerifyPlayer', () => {
  beforeEach(() => {
    prepareSkillVerifyMock.mockReset();
    listSkillClaimsMock.mockReset();
    listSkillClaimsMock.mockResolvedValue([]);
  });

  it('shows profile completion guidance when the server rejects an incomplete profile', async () => {
    prepareSkillVerifyMock.mockRejectedValue(
      new SmartApiError({
        error: 'profile_incomplete',
        message: 'Complete your profile to unlock skill verification.',
        statusCode: 403,
      }),
    );

    render(<SkillVerifyPlayer claimId="22222222-2222-4222-8222-222222222222" />);

    await waitFor(() => {
      expect(screen.getByText('Complete your profile to unlock skill verification.')).toBeDefined();
    });
    expect(screen.getByRole('link', { name: 'Complete your profile' }).getAttribute('href')).toBe(
      '/profile',
    );
  });
});
