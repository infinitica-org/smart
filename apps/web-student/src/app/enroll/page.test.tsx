import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnrollPage from './page';

const { push, enrollTrack, tracks } = vi.hoisted(() => ({
  push: vi.fn(),
  enrollTrack: vi.fn(),
  tracks: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock('../../lib/api', () => ({
  api: {
    catalog: {
      tracks: (...args: unknown[]) => tracks(...args),
    },
    auth: {
      enrollTrack: (...args: unknown[]) => enrollTrack(...args),
    },
  },
}));

const catalogTrack = {
  trackId: '11111111-1111-4111-8111-111111111111',
  code: 'MBA_FINANCE',
  name: 'MBA Finance',
  description: 'Finance track',
  category: 'MBA',
  launchStatus: 'AVAILABLE_NEW',
  calibrationStatus: 'NOT_CALIBRATED',
  foundationWeight: 0.2,
  competencies: [],
  levels: [],
  capstoneBrief: 'Capstone',
};

describe('EnrollPage routing', () => {
  beforeEach(() => {
    push.mockReset();
    enrollTrack.mockReset();
    tracks.mockReset();
    tracks.mockResolvedValue([catalogTrack]);
  });

  it('routes incomplete students to /onboarding after enrollment', async () => {
    enrollTrack.mockResolvedValueOnce({
      onboardingCompleted: false,
      primaryTrack: 'MBA_FINANCE',
    });
    render(<EnrollPage />);
    fireEvent.click(await screen.findByText('MBA Finance'));
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => expect(enrollTrack).toHaveBeenCalledWith({ trackCode: 'MBA_FINANCE' }));
    expect(push).toHaveBeenCalledWith('/onboarding');
  });

  it('routes completed students to /dashboard after enrollment', async () => {
    enrollTrack.mockResolvedValueOnce({
      onboardingCompleted: true,
      primaryTrack: 'MBA_FINANCE',
    });
    render(<EnrollPage />);
    fireEvent.click(await screen.findByText('MBA Finance'));
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => expect(enrollTrack).toHaveBeenCalledWith({ trackCode: 'MBA_FINANCE' }));
    expect(push).toHaveBeenCalledWith('/dashboard');
    expect(push).not.toHaveBeenCalledWith('/onboarding');
  });
});
