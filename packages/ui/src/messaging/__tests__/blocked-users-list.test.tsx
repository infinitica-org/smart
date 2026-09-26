import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  messaging: { listBlocks: vi.fn(), unblock: vi.fn() },
}));

vi.mock('../../api-provider', async () => {
  const rq = await import('@tanstack/react-query');
  return {
    useQuery: rq.useQuery,
    useMutation: rq.useMutation,
    useQueryClient: rq.useQueryClient,
    useSmartApi: () => api,
  };
});

import { BlockedUsersList } from '../blocked-users-list';

const SAM = '22222222-2222-4222-8222-222222222222';
const blocked = { userId: SAM, name: 'Sam Rao', blockedAt: '2026-09-20T10:00:00.000Z' };

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BlockedUsersList />
    </QueryClientProvider>,
  );
}

describe('BlockedUsersList (Th6-427)', () => {
  beforeEach(() => {
    api.messaging.listBlocks.mockReset().mockResolvedValue({ blocks: [blocked] });
    api.messaging.unblock.mockReset().mockResolvedValue(undefined);
  });

  it("shows the empty state when you haven't blocked anyone", async () => {
    api.messaging.listBlocks.mockResolvedValue({ blocks: [] });
    renderList();
    expect(await screen.findByText("You haven't blocked anyone")).toBeDefined();
  });

  it('shows an error with a retry', async () => {
    api.messaging.listBlocks.mockRejectedValueOnce(new Error('offline'));
    renderList();
    fireEvent.click(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Sam Rao')).toBeDefined();
    expect(api.messaging.listBlocks).toHaveBeenCalledTimes(2);
  });

  it('unblocks only after the confirm dialog, and Cancel unblocks nobody', async () => {
    renderList();
    fireEvent.click(await screen.findByRole('button', { name: 'Unblock Sam Rao' }));
    expect(await screen.findByText('Unblock Sam Rao?')).toBeDefined();
    expect(api.messaging.unblock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(api.messaging.unblock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Unblock Sam Rao' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Unblock' }));
    await waitFor(() => expect(api.messaging.unblock).toHaveBeenCalledWith(SAM));
    expect(await screen.findByText('Sam Rao was unblocked.')).toBeDefined();
  });
});
