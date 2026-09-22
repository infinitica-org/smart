import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ManagerSurveyPage from './page';

const getWorkExperienceManagerEndorsementByToken = vi.fn();
const submitWorkExperienceManagerEndorsementByToken = vi.fn();

vi.mock('../../../../lib/api', () => ({
  api: {
    users: {
      getWorkExperienceManagerEndorsementByToken: (...args: unknown[]) =>
        getWorkExperienceManagerEndorsementByToken(...args),
      submitWorkExperienceManagerEndorsementByToken: (...args: unknown[]) =>
        submitWorkExperienceManagerEndorsementByToken(...args),
    },
  },
}));

vi.mock('react', async () => {
  const reactActual = await vi.importActual<Record<string, unknown>>('react');
  const useHook = reactActual.use as (value: unknown) => unknown;
  return {
    ...reactActual,
    use: (value: unknown) => {
      if (value instanceof Promise) {
        return { token: 'test-token' };
      }
      return useHook(value);
    },
  };
});

const mockSurveyData = {
  experienceId: 'exp-1',
  candidateName: 'Jane Candidate',
  companyName: 'Acme Corp',
  role: 'Software Engineer',
  employmentType: 'FULL_TIME',
  startDate: '2022-01-01',
  endDate: '2024-06-30',
  isCurrent: false,
  responsibilities: 'Built APIs and led a backend team.',
  skillsClaimed: ['SQL_QUERY_OPTIMIZATION'],
  managerEmail: 'manager@acme.com',
  managerName: 'Jane Manager',
  status: 'PENDING',
  expiresAt: '2026-09-12T00:00:00.000Z',
  isExpired: false,
  isAlreadyResponded: false,
};

describe('ManagerSurveyPage', () => {
  beforeEach(() => {
    getWorkExperienceManagerEndorsementByToken.mockResolvedValue(mockSurveyData);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  async function renderPage() {
    render(<ManagerSurveyPage params={Promise.resolve({ token: 'test-token' })} />);
    expect(await screen.findByText(/Manager Endorsement Request/i)).toBeDefined();
  }

  it('shows the existing manager relationship and contact on file', async () => {
    await renderPage();

    expect(screen.getByText(/Professional relationship/i)).toBeDefined();
    expect(screen.getByText(/^Manager$/i)).toBeDefined();
    expect(
      screen.getByText(
        /You were invited as Jane Candidate's manager to endorse this work experience/i,
      ),
    ).toBeDefined();
    expect(screen.getByText(/manager@acme.com/i)).toBeDefined();
    expect(screen.getByText(/Jane Manager/i)).toBeDefined();
    expect(screen.getByText(/Your manager contact on file/i)).toBeDefined();
  });

  it('renders candidate role, employment dates, and responsibilities as read-only claim details', async () => {
    await renderPage();

    expect(screen.getByText(/Work experience claim/i)).toBeDefined();
    expect(screen.getByText(/Software Engineer \(FULL_TIME\)/i)).toBeDefined();
    expect(screen.getByText(/2022-01-01 — 2024-06-30/i)).toBeDefined();
    expect(screen.getByText(/Built APIs and led a backend team\./i)).toBeDefined();
    expect(screen.queryByDisplayValue('Software Engineer')).toBeNull();
    expect(screen.queryByDisplayValue('2022-01-01')).toBeNull();
    expect(screen.queryByDisplayValue(/Built APIs/i)).toBeNull();
  });

  it('shows explicit confirmation copy for role, dates, and responsibilities', async () => {
    await renderPage();

    expect(screen.getByText(/What confirmation means/i)).toBeDefined();
    expect(
      screen.getByText(
        /verifies that the role, employment dates, and responsibilities shown above/i,
      ),
    ).toBeDefined();
  });

  it('submits confirmed=true with skill ratings and optional comments', async () => {
    submitWorkExperienceManagerEndorsementByToken.mockResolvedValueOnce({
      success: true,
      status: 'CONFIRMED',
      message:
        "Thank you for confirming the candidate's role, employment dates, and responsibilities as their manager. Your manager endorsement has been recorded.",
    });

    await renderPage();
    fireEvent.change(screen.getByPlaceholderText(/Add comments regarding candidate performance/i), {
      target: { value: 'Strong contributor.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Endorse Claim/i }));

    await waitFor(() => {
      expect(submitWorkExperienceManagerEndorsementByToken).toHaveBeenCalledWith('test-token', {
        confirmed: true,
        skillRatings: [{ skillCode: 'SQL_QUERY_OPTIMIZATION', rating: 5 }],
        comments: 'Strong contributor.',
      });
    });
  });

  it('shows explicit success messaging after confirmation', async () => {
    submitWorkExperienceManagerEndorsementByToken.mockResolvedValueOnce({
      success: true,
      status: 'CONFIRMED',
      message:
        "Thank you for confirming the candidate's role, employment dates, and responsibilities as their manager. Your manager endorsement has been recorded.",
    });

    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Endorse Claim/i }));

    expect(
      await screen.findByText(
        /Thank you for confirming the candidate's role, employment dates, and responsibilities as their manager/i,
      ),
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: /Confirm & Endorse Claim/i })).toBeNull();
  });

  it('shows API validation errors without hiding the form', async () => {
    submitWorkExperienceManagerEndorsementByToken.mockRejectedValueOnce(
      new Error('Invalid endorsement payload.'),
    );

    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Endorse Claim/i }));

    expect(await screen.findByText(/Invalid endorsement payload\./i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Confirm & Endorse Claim/i })).toBeDefined();
  });

  it('hides the survey form when the magic link is expired', async () => {
    getWorkExperienceManagerEndorsementByToken.mockResolvedValueOnce({
      ...mockSurveyData,
      isExpired: true,
    });

    await renderPage();
    expect(screen.getByText(/manager endorsement magic link has expired/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: /Confirm & Endorse Claim/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Dispute Experience Claim/i })).toBeNull();
  });

  it('hides the survey form when the link was already responded to', async () => {
    getWorkExperienceManagerEndorsementByToken.mockResolvedValueOnce({
      ...mockSurveyData,
      status: 'CONFIRMED',
      isAlreadyResponded: true,
    });

    await renderPage();
    expect(screen.getByText(/Endorsement recorded: Status is/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: /Confirm & Endorse Claim/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Dispute Experience Claim/i })).toBeNull();
  });
});
