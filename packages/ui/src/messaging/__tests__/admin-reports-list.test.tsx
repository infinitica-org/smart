import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ messaging: { adminListReports: vi.fn() } }));

vi.mock('../../api-provider', async () => {
  const rq = await import('@tanstack/react-query');
  return { useQuery: rq.useQuery, useSmartApi: () => api };
});

import { AdminReportsList } from '../admin-reports-list';

const row = (n: number, over: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  targetType: 'MESSAGE',
  reason: 'SCAM',
  status: 'OPEN',
  createdAt: `2026-09-${String(10 + n).padStart(2, '0')}T10:00:00.000Z`,
  ...over,
});

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminReportsList />
    </QueryClientProvider>,
  );
}
const lastQuery = () => api.messaging.adminListReports.mock.calls.at(-1)?.[0];

describe('AdminReportsList (Th6-430)', () => {
  beforeEach(() => {
    api.messaging.adminListReports
      .mockReset()
      .mockResolvedValue({ reports: [row(2), row(1)], nextCursor: null });
  });
  afterEach(cleanup);

  it('lists messages first, in the order given, each row linking to its report page', async () => {
    renderList();
    const links = await screen.findAllByRole('link', { name: /review message report/i });
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      `/admin/reports/${row(2).id}`,
      `/admin/reports/${row(1).id}`,
    ]);
    expect(lastQuery()).toMatchObject({ targetType: 'MESSAGE' });
    expect((screen.getByLabelText('Target') as HTMLSelectElement).value).toBe('MESSAGE');
  });

  it('shows metadata only: never message content', async () => {
    api.messaging.adminListReports.mockResolvedValue({
      reports: [{ ...row(1), body: 'secret words', details: 'private' }],
      nextCursor: null,
    });
    const { container } = renderList();
    await screen.findByText('Scam');
    expect(container.textContent).not.toContain('secret words');
    expect(container.textContent).not.toContain('private');
  });

  it('filters by target, status and date', async () => {
    renderList();
    await screen.findAllByText('Scam');
    fireEvent.change(screen.getByLabelText('Target'), { target: { value: 'JOB' } });
    await waitFor(() => expect(lastQuery()).toMatchObject({ targetType: 'JOB' }));
    fireEvent.change(screen.getByLabelText('Target'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'RESOLVED' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-30' } });
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({
        status: 'RESOLVED',
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-30T23:59:59.999Z',
      }),
    );
    expect(lastQuery()).not.toHaveProperty('targetType');
  });

  it('shows loading, empty and error (with retry) states', async () => {
    api.messaging.adminListReports.mockResolvedValueOnce({ reports: [], nextCursor: null });
    renderList();
    expect(screen.getByText('Loading reports…')).toBeTruthy();
    expect(await screen.findByText('No reports found')).toBeTruthy();
    cleanup();

    api.messaging.adminListReports.mockRejectedValueOnce(new Error('down'));
    renderList();
    fireEvent.click(await screen.findByRole('button', { name: /try again/i }));
    expect((await screen.findAllByText('Scam')).length).toBe(2);
  });

  it('loads more with the cursor, keeping the filters', async () => {
    api.messaging.adminListReports
      .mockResolvedValueOnce({ reports: [row(3)], nextCursor: 'c1' })
      .mockResolvedValueOnce({ reports: [row(1, { reason: 'OTHER' })], nextCursor: null });
    renderList();
    fireEvent.click(await screen.findByRole('button', { name: 'Load more reports' }));
    expect(await screen.findByText('Other')).toBeTruthy();
    expect(screen.getAllByText('Scam')).toHaveLength(1); // the first page is kept
    expect(lastQuery()).toMatchObject({ cursor: 'c1', targetType: 'MESSAGE' });
    expect(screen.queryByRole('button', { name: 'Load more reports' })).toBeNull();
  });
});
