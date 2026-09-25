import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SmartApiError } from '@smart/api-client';
import type { StudentApplicationCard, StudentApplicationDetail } from '@smart/contracts';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MyApplicationsTracker } from './MyApplicationsTracker';

const studentApplications = vi.hoisted(() => ({
  list: vi.fn(),
  detail: vi.fn(),
  withdraw: vi.fn(),
}));
const listWorkExperiences = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({
  api: {
    studentApplications,
    users: { listWorkExperiences },
    companies: { createReview: vi.fn() },
  },
}));
vi.mock('../../lib/api', () => ({
  api: {
    studentApplications,
    users: { listWorkExperiences },
    companies: { createReview: vi.fn() },
  },
}));

const APP = '00000000-0000-4000-8000-000000000001';
const JOB = '00000000-0000-4000-8000-000000000010';
const COMPANY = '11111111-1111-4111-8111-111111111111';

function card(over: Partial<StudentApplicationCard> = {}): StudentApplicationCard {
  return {
    id: APP,
    referenceNumber: 'APP-00000000',
    jobId: JOB,
    roleTitle: 'Backend Engineer',
    companyName: 'Acme Labs',
    companyId: null,
    companyVerified: false,
    companyVerifiedAt: null,
    location: 'Bengaluru',
    status: 'APPLIED',
    statusLabel: 'Submitted',
    appliedAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    ...over,
  };
}

function detail(over: Partial<StudentApplicationDetail> = {}): StudentApplicationDetail {
  return {
    ...card(),
    coverNote: null,
    timeline: [{ status: 'APPLIED', statusLabel: 'Submitted', at: '2026-09-01T08:00:00.000Z' }],
    canWithdraw: true,
    ...over,
  };
}

function renderTracker(pollIntervalMs = 60_000) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MyApplicationsTracker pollIntervalMs={pollIntervalMs} initialTab="applications" />
    </QueryClientProvider>,
  );
}

describe('MyApplicationsTracker (Th6-392/393)', () => {
  beforeEach(() => {
    Object.values(studentApplications).forEach((fn) => fn.mockReset());
    listWorkExperiences.mockReset().mockResolvedValue([]);
    studentApplications.detail.mockResolvedValue(detail());
  });
  afterEach(cleanup);

  it('shows company, role and the student-facing status, never an internal stage name', async () => {
    studentApplications.list.mockResolvedValue({
      applications: [card({ status: 'REVIEWING', statusLabel: 'Under review' })],
    });
    renderTracker();
    expect((await screen.findAllByText('Backend Engineer')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acme Labs').length).toBeGreaterThan(0);
    expect(screen.getByTestId('status-label').textContent).toBe('Under review');
    const page = document.body.textContent ?? '';
    for (const internal of ['AI-Verified', 'Shortlisted', 'Applied / New Matches', 'Rejected']) {
      expect(page).not.toContain(internal);
    }
  });

  it('shows a progress bar up to the current status', async () => {
    studentApplications.list.mockResolvedValue({
      applications: [card({ status: 'INTERVIEWING', statusLabel: 'Interviewing' })],
    });
    renderTracker();
    await screen.findAllByText('Backend Engineer');
    const bars = screen.getAllByTestId('status-bar');
    expect(bars[0]?.getAttribute('data-status')).toBe('INTERVIEWING');
    const reached = [...(bars[0]?.querySelectorAll('[data-reached]') ?? [])].map((n) =>
      n.getAttribute('data-reached'),
    );
    expect(reached).toEqual(['true', 'true', 'true', 'false', 'false']);
  });

  it.each([
    ['HIRED', 'Hired'],
    ['REJECTED', 'Not selected'],
    ['WITHDRAWN', 'Withdrawn'],
    ['OFFERED', 'Offer'],
  ] as const)('labels %s as "%s"', async (status, label) => {
    studentApplications.list.mockResolvedValue({
      applications: [card({ status, statusLabel: label })],
    });
    renderTracker();
    expect((await screen.findByTestId('status-label')).textContent).toBe(label);
    if (status === 'REJECTED' || status === 'WITHDRAWN') {
      // An ending, not a step past Hired: no step is highlighted.
      const steps = [
        ...(screen.getAllByTestId('status-bar')[0]?.querySelectorAll('[data-reached]') ?? []),
      ];
      expect(steps.every((n) => n.getAttribute('data-reached') === 'false')).toBe(true);
    }
  });

  it('shows the verified badge only when the server marks the company verified', async () => {
    studentApplications.list.mockResolvedValue({
      applications: [
        card({ companyVerified: true, companyVerifiedAt: '2026-09-01T10:00:00.000Z' }),
        card({ id: '00000000-0000-4000-8000-000000000002', companyName: 'Plain Co' }),
      ],
    });
    renderTracker();
    await screen.findAllByText('Backend Engineer');
    const items = within(screen.getByLabelText('My applications')).getAllByRole('listitem');
    expect(within(items[0] as HTMLElement).getByTestId('verified-badge')).toBeTruthy();
    expect(within(items[1] as HTMLElement).queryByTestId('verified-badge')).toBeNull();
  });

  it('offers a company review only for jobs linked to a company', async () => {
    studentApplications.list.mockResolvedValue({ applications: [card({ companyId: COMPANY })] });
    renderTracker();
    expect(await screen.findByRole('button', { name: 'Review this company' })).toBeTruthy();
    cleanup();
    studentApplications.list.mockResolvedValue({ applications: [card({ companyId: null })] });
    renderTracker();
    await screen.findAllByText('Backend Engineer');
    expect(screen.queryByRole('button', { name: 'Review this company' })).toBeNull();
  });

  it('shows the history from the detail endpoint, with the cover note', async () => {
    studentApplications.list.mockResolvedValue({ applications: [card()] });
    studentApplications.detail.mockResolvedValue(
      detail({
        coverNote: 'I love robots.',
        timeline: [
          { status: 'APPLIED', statusLabel: 'Submitted', at: '2026-09-01T08:00:00.000Z' },
          { status: 'REVIEWING', statusLabel: 'Under review', at: '2026-09-03T08:00:00.000Z' },
        ],
      }),
    );
    renderTracker();
    const history = await screen.findByLabelText('Application history');
    expect(within(history).getByText('Submitted')).toBeTruthy();
    expect(within(history).getByText('Under review')).toBeTruthy();
    expect(screen.getByText('I love robots.')).toBeTruthy();
  });

  it('shows the updated status after a poll cycle without a manual refresh', async () => {
    studentApplications.list
      .mockResolvedValueOnce({ applications: [card()] })
      .mockResolvedValue({ applications: [card({ status: 'OFFERED', statusLabel: 'Offer' })] });
    renderTracker(30);
    expect((await screen.findByTestId('status-label')).textContent).toBe('Submitted');
    await waitFor(() => expect(screen.getByTestId('status-label').textContent).toBe('Offer'));
  });

  it('stops polling after unmount', async () => {
    studentApplications.list.mockResolvedValue({ applications: [card()] });
    const { unmount } = renderTracker(30);
    await screen.findAllByText('Backend Engineer');
    unmount();
    const calls = studentApplications.list.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(studentApplications.list.mock.calls.length).toBe(calls);
  });

  it('shows an empty state with a link to browse jobs', async () => {
    studentApplications.list.mockResolvedValue({ applications: [] });
    renderTracker();
    expect(await screen.findByText('No applications yet')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Browse jobs' }).getAttribute('href')).toBe('/jobs');
  });

  it('shows an error state and retries', async () => {
    studentApplications.list.mockRejectedValueOnce(new Error('down'));
    renderTracker();
    expect(await screen.findByText('Could not load your applications')).toBeTruthy();
    studentApplications.list.mockResolvedValue({ applications: [card()] });
    fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }));
    expect((await screen.findAllByText('Backend Engineer')).length).toBeGreaterThan(0);
  });

  describe('withdraw', () => {
    it('asks for confirmation, sends the optional reason with an Idempotency-Key, and confirms', async () => {
      studentApplications.list.mockResolvedValue({ applications: [card()] });
      studentApplications.withdraw.mockResolvedValue(
        detail({ status: 'WITHDRAWN', statusLabel: 'Withdrawn', canWithdraw: false }),
      );
      renderTracker();
      fireEvent.click(await screen.findByRole('button', { name: 'Withdraw application' }));
      expect(studentApplications.withdraw).not.toHaveBeenCalled(); // nothing until confirmed
      fireEvent.change(screen.getByLabelText('Reason (optional)'), {
        target: { value: 'Took another offer' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
      await waitFor(() => expect(studentApplications.withdraw).toHaveBeenCalledTimes(1));
      const [id, body, key] = studentApplications.withdraw.mock.calls[0] ?? [];
      expect([id, body]).toEqual([APP, { reason: 'Took another offer' }]);
      expect(typeof key).toBe('string');
      expect(await screen.findByText('Your application was withdrawn.')).toBeTruthy();
    });

    it('does not offer withdraw once the application is closed', async () => {
      studentApplications.list.mockResolvedValue({
        applications: [card({ status: 'HIRED', statusLabel: 'Hired' })],
      });
      studentApplications.detail.mockResolvedValue(
        detail({ status: 'HIRED', statusLabel: 'Hired', canWithdraw: false }),
      );
      renderTracker();
      await screen.findByLabelText('Application history');
      expect(screen.queryByRole('button', { name: 'Withdraw application' })).toBeNull();
    });

    it('shows the server message on failure and reuses the same key when retried', async () => {
      studentApplications.list.mockResolvedValue({ applications: [card()] });
      studentApplications.withdraw
        .mockRejectedValueOnce(
          new SmartApiError({
            error: 'cannot_withdraw',
            message: 'Already closed.',
            statusCode: 422,
          } as never),
        )
        .mockResolvedValueOnce(
          detail({ status: 'WITHDRAWN', statusLabel: 'Withdrawn', canWithdraw: false }),
        );
      renderTracker();
      fireEvent.click(await screen.findByRole('button', { name: 'Withdraw application' }));
      fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
      expect(await screen.findByText('Already closed.')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
      await waitFor(() => expect(studentApplications.withdraw).toHaveBeenCalledTimes(2));
      expect(studentApplications.withdraw.mock.calls[1]?.[2]).toBe(
        studentApplications.withdraw.mock.calls[0]?.[2],
      );
    });
  });
});
