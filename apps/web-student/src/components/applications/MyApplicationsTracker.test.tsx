import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CandidateApplicationDto } from '@smart/contracts';
import { MyApplicationsTracker } from './MyApplicationsTracker';

const listMyApplications = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    placement: {
      listMyApplications: (...args: unknown[]) => listMyApplications(...args),
    },
    users: {
      listWorkExperiences: () => Promise.resolve([]),
    },
  },
}));

function application(overrides: Partial<CandidateApplicationDto> = {}): CandidateApplicationDto {
  return {
    applicationId: '00000000-0000-4000-8000-000000000001',
    openingId: '00000000-0000-4000-8000-000000000010',
    studentId: '00000000-0000-4000-8000-000000000020',
    stage: 'SHORTLISTED',
    matchScore: 0.88,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    companyName: 'Acme Labs',
    roleTitle: 'Backend Engineer',
    location: 'Bengaluru',
    employmentType: 'FULL_TIME',
    domain: 'SOFTWARE_IT',
    ...overrides,
  };
}

function renderTracker(pollIntervalMs = 60_000): ReturnType<typeof render> {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, refetchIntervalInBackground: true },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MyApplicationsTracker pollIntervalMs={pollIntervalMs} />
    </QueryClientProvider>,
  );
}

describe('MyApplicationsTracker', () => {
  beforeEach(() => {
    listMyApplications.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders company, role, and canonical ATS stage for the authenticated list', async () => {
    listMyApplications.mockResolvedValue({ applications: [application()] });

    renderTracker();

    await waitFor(() => expect(screen.getAllByText('Backend Engineer').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Acme Labs').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Shortlisted').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('ats-timeline')[0]?.getAttribute('data-stage')).toBe(
      'SHORTLISTED',
    );
    expect(listMyApplications).toHaveBeenCalledWith();
  });

  it('highlights pipeline stages up to the current CO-T02 column', async () => {
    listMyApplications.mockResolvedValue({
      applications: [application({ stage: 'INTERVIEW' })],
    });

    renderTracker();

    await waitFor(() => expect(screen.getAllByText('Interviewing').length).toBeGreaterThan(0));
    const segments = screen.getAllByTestId('ats-timeline')[0]?.querySelectorAll('[data-reached]');
    expect([...(segments ?? [])].map((node) => node.getAttribute('data-reached'))).toEqual([
      'true',
      'true',
      'true',
      'true',
      'false',
      'false',
    ]);
  });

  it('renders the AI-Verified stage introduced alongside CO-T02', async () => {
    listMyApplications.mockResolvedValue({
      applications: [application({ stage: 'AI_VERIFIED' })],
    });

    renderTracker();

    await waitFor(() => expect(screen.getAllByText('AI-Verified').length).toBeGreaterThan(0));
  });

  it('renders the Hired stage as the final, non-terminal pipeline step', async () => {
    listMyApplications.mockResolvedValue({
      applications: [application({ stage: 'HIRED' })],
    });

    renderTracker();

    await waitFor(() => expect(screen.getAllByText('Hired').length).toBeGreaterThan(0));
  });

  it('shows the updated stage after a poll cycle without a manual refresh', async () => {
    listMyApplications
      .mockResolvedValueOnce({ applications: [application({ stage: 'SHORTLISTED' })] })
      .mockResolvedValue({
        applications: [
          application({
            stage: 'INTERVIEW',
            updatedAt: '2026-09-02T10:05:00.000Z',
          }),
        ],
      });

    renderTracker(25);

    await waitFor(() => expect(screen.getAllByText('Shortlisted').length).toBeGreaterThan(0));
    await waitFor(
      () => {
        expect(listMyApplications.mock.calls.length).toBeGreaterThan(1);
        expect(screen.getAllByTestId('ats-timeline')[0]?.getAttribute('data-stage')).toBe(
          'INTERVIEW',
        );
      },
      { timeout: 1500 },
    );
  });

  it('stops polling after unmount', async () => {
    listMyApplications.mockResolvedValue({ applications: [application()] });

    const view = renderTracker(20);
    await waitFor(() => expect(listMyApplications).toHaveBeenCalled());
    const callsAtUnmount = listMyApplications.mock.calls.length;
    view.unmount();
    await new Promise((resolve) => {
      setTimeout(resolve, 80);
    });
    expect(listMyApplications.mock.calls.length).toBe(callsAtUnmount);
  });

  it('shows an empty state when the student has no applications', async () => {
    listMyApplications.mockResolvedValue({ applications: [] });

    renderTracker();

    await waitFor(() => expect(screen.getByText('No applications in pipeline')).toBeTruthy());
    expect(screen.queryByText('Backend Engineer')).toBeNull();
  });

  it('shows an error state and retries without accepting a studentId', async () => {
    listMyApplications.mockRejectedValueOnce(new Error('network')).mockResolvedValue({
      applications: [application()],
    });

    renderTracker();

    await waitFor(() => expect(screen.getByText(/Could not load your applications/i)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    await waitFor(() => expect(screen.getAllByText('Backend Engineer').length).toBeGreaterThan(0));
    expect(listMyApplications).toHaveBeenCalledWith();
  });
});
