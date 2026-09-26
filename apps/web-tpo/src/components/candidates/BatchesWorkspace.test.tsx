import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BatchesWorkspace } from './BatchesWorkspace';

vi.mock('../../lib/api', () => ({
  api: {
    onboarding: {
      listBatches: vi.fn().mockResolvedValue([
        {
          batchId: 'b1',
          name: 'Batch 2025–2026',
          code: '25-26',
          memberCount: 12,
          pendingInviteCount: 2,
          campusId: 'c-main',
          campusName: 'Main campus',
        },
        {
          batchId: 'b2',
          name: 'North MBA 2026',
          code: null,
          memberCount: 4,
          pendingInviteCount: 0,
          campusId: 'c-north',
          campusName: 'North campus',
        },
      ]),
      listCampuses: vi.fn().mockResolvedValue([
        { campusId: 'c-main', name: 'Main campus', isPrimary: true },
        { campusId: 'c-north', name: 'North campus', isPrimary: false },
      ]),
      createBatch: vi.fn(),
    },
  },
}));

describe('BatchesWorkspace', () => {
  afterEach(() => {
    cleanup();
  });

  it('filters batches client-side via search', async () => {
    render(<BatchesWorkspace />);
    await screen.findByRole('heading', { level: 3, name: 'Batch 2025–2026' });

    fireEvent.change(screen.getByRole('searchbox', { name: /Search batches/i }), {
      target: { value: 'nomatch' },
    });

    expect(screen.getByText(/No batches match/i)).toBeDefined();
    expect(screen.queryByRole('heading', { level: 3, name: 'Batch 2025–2026' })).toBeNull();
  });

  it('filters batches by campus and labels each batch with its campus (S6-VV-112)', async () => {
    render(<BatchesWorkspace />);
    await screen.findByRole('heading', { level: 3, name: 'North MBA 2026' });
    const filter = await screen.findByRole('combobox', { name: /Filter batches by campus/i });

    fireEvent.change(filter, { target: { value: 'c-north' } });

    expect(screen.queryByRole('heading', { level: 3, name: 'Batch 2025–2026' })).toBeNull();
    expect(screen.getByRole('heading', { level: 3, name: 'North MBA 2026' })).toBeDefined();
    expect(screen.getByText('North campus', { selector: 'p' })).toBeDefined();
  });

  it('renders bento batches list with explanatory copy', async () => {
    render(<BatchesWorkspace />);

    expect(await screen.findByRole('heading', { name: /^Batches$/i })).toBeDefined();
    expect(screen.getByRole('searchbox', { name: /Search batches/i })).toBeDefined();
    expect(screen.getByText(/group candidates into cohorts/i)).toBeDefined();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'Batch 2025–2026' })).toBeDefined();
    });
    expect(
      screen
        .getByRole('heading', { level: 3, name: 'Batch 2025–2026' })
        .closest('a')
        ?.getAttribute('href'),
    ).toBe('/batches/b1');
  });
});
