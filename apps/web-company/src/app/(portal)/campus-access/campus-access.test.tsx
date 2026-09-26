import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CampusAccessPage from './page';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: { campus: { employerCampusAccess: vi.fn(), requestCampusAccess: vi.fn() } },
}));

const load = vi.mocked(api.campus.employerCampusAccess);
const send = vi.mocked(api.campus.requestCampusAccess);

const row = (over: Record<string, unknown>) => ({
  institutionId: '11111111-1111-4111-8111-111111111111',
  institutionName: 'Uni A',
  status: 'NONE' as const,
  reason: null,
  requestId: null,
  updatedAt: null,
  ...over,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CampusAccessPage />
    </QueryClientProvider>,
  );
}

describe('Campus access page', () => {
  beforeEach(() => {
    load.mockReset();
    send.mockReset();
  });
  afterEach(cleanup);

  it('shows the status per university with the reason for denied and revoked', async () => {
    load.mockResolvedValue({
      canRequest: true,
      universities: [
        row({ institutionId: 'a', institutionName: 'Pending U', status: 'PENDING' }),
        row({ institutionId: 'b', institutionName: 'Approved U', status: 'APPROVED' }),
        row({
          institutionId: 'c',
          institutionName: 'Denied U',
          status: 'DENIED',
          reason: 'Not this year',
        }),
        row({
          institutionId: 'd',
          institutionName: 'Revoked U',
          status: 'REVOKED',
          reason: 'Policy breach',
        }),
      ],
    });
    renderPage();
    expect(await screen.findByText('Pending')).toBeDefined();
    expect(screen.getByText('Approved')).toBeDefined();
    expect(screen.getByText('Denied')).toBeDefined();
    expect(screen.getByText('Revoked')).toBeDefined();
    expect(screen.getByText('Reason: Not this year')).toBeDefined();
    expect(screen.getByText('Reason: Policy breach')).toBeDefined();
    // Nothing to request while pending or approved; denied and revoked can ask again.
    expect(screen.getAllByRole('button', { name: 'Request again' })).toHaveLength(2);
  });

  it('sends a request with a message', async () => {
    load.mockResolvedValue({ canRequest: true, universities: [row({})] });
    send.mockResolvedValue({
      id: 'r',
      institutionId: '11111111-1111-4111-8111-111111111111',
      status: 'PENDING',
      message: 'Hi',
      reason: null,
      createdAt: '2026-09-26T00:00:00.000Z',
      decidedAt: null,
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Request access' }));
    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: 'Hi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(
        { institutionId: '11111111-1111-4111-8111-111111111111', message: 'Hi' },
        expect.any(String),
      ),
    );
  });

  it('explains and blocks requests for an unverified company', async () => {
    load.mockResolvedValue({ canRequest: false, universities: [row({})] });
    renderPage();
    expect(await screen.findByText(/Only verified companies/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Request access' }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('shows an error with retry, and the empty state', async () => {
    load.mockRejectedValueOnce(new Error('boom'));
    renderPage();
    expect(await screen.findByText('boom')).toBeDefined();
    load.mockResolvedValue({ canRequest: true, universities: [] });
    fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }));
    expect(await screen.findByText('No partner universities yet')).toBeDefined();
  });
});
