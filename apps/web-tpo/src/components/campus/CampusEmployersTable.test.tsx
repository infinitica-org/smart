import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CampusEmployersTable } from './CampusEmployersTable';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: { campus: { listEmployers: vi.fn(), revokeEmployer: vi.fn() } },
}));

const list = vi.mocked(api.campus.listEmployers);
const revoke = vi.mocked(api.campus.revokeEmployer);

const active = {
  companyId: '22222222-2222-4222-8222-222222222222',
  companyName: 'Acme Corp',
  logoFileId: null,
  industry: 'Software',
  status: 'ACTIVE' as const,
  approvedAt: '2026-09-01T00:00:00.000Z',
  revokedAt: null,
  openJobCount: 3,
  applicantCount: 12,
  hireCount: 2,
  lastActivityAt: '2026-09-20T00:00:00.000Z',
};

describe('CampusEmployersTable', () => {
  beforeEach(() => {
    list.mockReset();
    revoke.mockReset();
    list.mockResolvedValue({ employers: [active], nextCursor: null });
  });
  afterEach(cleanup);

  it('shows aggregate counts and labels revoked employers', async () => {
    list.mockResolvedValue({
      employers: [active, { ...active, companyId: 'x', companyName: 'Old Co', status: 'REVOKED' }],
      nextCursor: null,
    });
    render(<CampusEmployersTable />);
    const table = await screen.findByRole('table');
    expect(within(table).getAllByText('12').length).toBeGreaterThan(0);
    expect(within(table).getByText('Approved')).toBeDefined();
    expect(within(table).getByText('Revoked')).toBeDefined();
    // Only the approved employer can be revoked.
    expect(within(table).getAllByRole('button', { name: 'Revoke' })).toHaveLength(1);
  });

  it('shows the empty state', async () => {
    list.mockResolvedValue({ employers: [], nextCursor: null });
    render(<CampusEmployersTable />);
    expect(await screen.findByText('No employers yet')).toBeDefined();
  });

  it('sends the search and status filters', async () => {
    render(<CampusEmployersTable />);
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Search by company'), { target: { value: 'acme' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'REVOKED' } });
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'acme', status: 'REVOKED' }),
      ),
    );
  });

  it('confirms with a reason before revoking', async () => {
    revoke.mockResolvedValue({
      companyId: active.companyId,
      status: 'REVOKED',
      revokedAt: '2026-09-26T00:00:00.000Z',
    });
    render(<CampusEmployersTable />);
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.change(within(dialog).getByLabelText('Reason'), {
      target: { value: 'Policy breach' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke access' }));
    await waitFor(() =>
      expect(revoke).toHaveBeenCalledWith(active.companyId, { reason: 'Policy breach' }),
    );
  });
});
