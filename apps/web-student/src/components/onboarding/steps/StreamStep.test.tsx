import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StreamStep from './StreamStep';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    auth: {
      enrollTrack: vi.fn(),
    },
  },
}));

describe('StreamStep', () => {
  it('renders stream options correctly', () => {
    render(<StreamStep onBack={vi.fn()} onContinue={vi.fn()} />);

    expect(screen.getByText('Choose your stream')).toBeTruthy();
    expect(screen.getByText('Software Engineering / SDE')).toBeTruthy();
    expect(screen.getByText('DataOps')).toBeTruthy();
    expect(screen.getByText('AIML')).toBeTruthy();
  });

  it('enrolls candidate track and advances when continue is clicked', async () => {
    vi.mocked(api.auth.enrollTrack).mockResolvedValueOnce({
      userId: 'usr_1',
      email: 'candidate@example.com',
      fullName: 'Ada Lovelace',
      role: 'STUDENT',
      institutionId: null,
      institutionName: null,
      companyId: null,
      companyName: null,
      companyVerificationStatus: null,
      primaryTrack: 'TECH_FULLSTACK',
      secondaryTrack: null,
      provider: 'PASSWORD',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      onboardingCompleted: false,
      profilePhotoUrl: null,
      cgpa: null,
      sscPercentage: null,
      hscPercentage: null,
      sessionHold: null,
    });

    const onContinue = vi.fn();
    render(<StreamStep onBack={vi.fn()} onContinue={onContinue} />);

    const continueBtn = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(api.auth.enrollTrack).toHaveBeenCalledWith({ trackCode: 'TECH_FULLSTACK' });
    });
  });
});
