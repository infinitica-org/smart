import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployerRequestsQueue } from './EmployerRequestsQueue';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: { campus: { listEmployerRequests: vi.fn(), decideEmployerRequest: vi.fn() } },
}));

const list = vi.mocked(api.campus.listEmployerRequests);
const decide = vi.mocked(api.campus.decideEmployerRequest);

const request = {
  id: '11111111-1111-4111-8111-111111111111',
  companyId: '22222222-2222-4222-8222-222222222222',
  companyName: 'Acme Corp',
  logoFileId: null,
  verified: true,
  industry: 'Software',
  openJobCount: 4,
  message: 'We hire freshers',
  status: 'PENDING' as const,
  reason: null,
  createdAt: '2026-09-20T10:00:00.000Z',
  decidedAt: null,
};

describe('EmployerRequestsQueue', () => {
  beforeEach(() => {
    list.mockReset();
    decide.mockReset();
    list.mockResolvedValue({ requests: [request], nextCursor: null });
  });
  afterEach(cleanup);

  it('shows company, industry, open jobs and the message', async () => {
    render(<EmployerRequestsQueue />);
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Acme Corp')).toBeDefined();
    expect(within(table).getByText('Software')).toBeDefined();
    expect(within(table).getByText('4')).toBeDefined();
    expect(within(table).getByText('We hire freshers')).toBeDefined();
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING' }));
  });

  it('shows the empty state when nothing is pending', async () => {
    list.mockResolvedValue({ requests: [], nextCursor: null });
    render(<EmployerRequestsQueue />);
    expect(await screen.findByText('No pending requests')).toBeDefined();
  });

  it('filters by status tab', async () => {
    render(<EmployerRequestsQueue />);
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('tab', { name: 'Denied' }));
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'DENIED' })),
    );
  });

  it('approves in one click', async () => {
    decide.mockResolvedValue({ request: { ...request, status: 'APPROVED' } });
    render(<EmployerRequestsQueue />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(decide).toHaveBeenCalledWith(request.id, { decision: 'APPROVE' }));
    expect(await screen.findByText(/Acme Corp was approved/)).toBeDefined();
  });

  it('will not deny without a reason of 5+ characters, then sends it', async () => {
    decide.mockResolvedValue({ request: { ...request, status: 'DENIED' } });
    render(<EmployerRequestsQueue />);
    fireEvent.click(await screen.findByRole('button', { name: 'Deny' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deny request' }));
    expect(await within(dialog).findByText(/at least 5 characters/)).toBeDefined();
    expect(decide).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Not a fit' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deny request' }));
    await waitFor(() =>
      expect(decide).toHaveBeenCalledWith(request.id, { decision: 'DENY', reason: 'Not a fit' }),
    );
  });

  it('shows the error and lets the user retry when loading fails', async () => {
    list.mockRejectedValueOnce(new Error('boom'));
    render(<EmployerRequestsQueue />);
    expect(await screen.findByText('boom')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }));
    expect(await screen.findByRole('table')).toBeDefined();
  });
});
