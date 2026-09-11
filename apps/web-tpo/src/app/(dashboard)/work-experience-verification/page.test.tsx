import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WorkExperienceVerificationPage from './page';

const getWorkExperienceOpsDashboard = vi.fn();

vi.mock('../../../lib/api', () => ({
  api: {
    users: {
      getWorkExperienceOpsDashboard: (...args: unknown[]) => getWorkExperienceOpsDashboard(...args),
    },
  },
}));

describe('WorkExperienceVerificationPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders table headers and a verification row from the ops dashboard API', async () => {
    getWorkExperienceOpsDashboard.mockResolvedValueOnce([
      {
        experienceId: 'exp-1',
        candidateId: 'student-1',
        candidateName: 'Jane Candidate',
        candidateEmail: 'jane@student.edu',
        companyName: 'Acme Corp',
        companyWebsite: 'https://acme.com',
        role: 'Engineer',
        status: 'PENDING_EMPLOYER',
        currentStep: 'EMPLOYER_DISPATCHED',
        emailState: 'SENT',
        timeRemainingHours: 24,
        flaggedDocumentCount: 0,
        hasFlaggedDocuments: false,
        nextAction: 'Awaiting employer response (24h remaining). Reminders sent every 6 hours.',
        createdAt: '2026-09-10T00:00:00.000Z',
      },
    ]);

    render(<WorkExperienceVerificationPage />);

    expect(
      await screen.findByRole('heading', { name: /Work Experience Verification/i }),
    ).toBeDefined();
    expect(screen.getByText('Candidate')).toBeDefined();
    expect(screen.getByText('Jane Candidate')).toBeDefined();
    expect(screen.getByText('Acme Corp')).toBeDefined();
    expect(screen.getByText('PENDING_EMPLOYER')).toBeDefined();
    expect(screen.getByText(/Awaiting employer response/i)).toBeDefined();
  });

  it('renders empty state when no verifications are in progress', async () => {
    getWorkExperienceOpsDashboard.mockResolvedValueOnce([]);
    render(<WorkExperienceVerificationPage />);
    expect(await screen.findByText(/No work experience verifications in progress/i)).toBeDefined();
  });

  it('renders error state when API fails', async () => {
    getWorkExperienceOpsDashboard.mockRejectedValueOnce(new Error('Network error'));
    render(<WorkExperienceVerificationPage />);
    await waitFor(() => {
      expect(screen.getByText(/Could not load verification queue/i)).toBeDefined();
    });
  });
});
