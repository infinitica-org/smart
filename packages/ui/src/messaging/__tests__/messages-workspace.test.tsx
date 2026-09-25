import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SmartApiError } from '@smart/api-client';

const api = vi.hoisted(() => ({
  auth: { me: vi.fn() },
  messaging: {
    listConversations: vi.fn(),
    listMessages: vi.fn(),
    send: vi.fn(),
    markRead: vi.fn(),
    search: vi.fn(),
    setMuted: vi.fn(),
    block: vi.fn(),
    deleteMessage: vi.fn(),
    reportMessage: vi.fn(),
  },
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

import { MessagesWorkspace } from '../messages-workspace';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const CONV = '33333333-3333-4333-8333-333333333333';

const summary = (over = {}) => ({
  id: CONV,
  counterpart: {
    userId: OTHER,
    name: 'Erin Employer',
    role: 'EMPLOYER',
    orgName: 'Acme',
    avatarUrl: null,
  },
  lastMessage: { body: 'Hello there', senderId: OTHER, createdAt: '2026-09-25T10:00:00.000Z' },
  lastMessageAt: '2026-09-25T10:00:00.000Z',
  unreadCount: 3,
  muted: false,
  canSend: true,
  ...over,
});
const message = (id: string, senderId: string, body: string) => ({
  id,
  conversationId: CONV,
  senderId,
  body,
  deleted: false,
  createdAt: '2026-09-25T10:00:00.000Z',
});

function renderWorkspace(initialConversationId: string | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MessagesWorkspace initialConversationId={initialConversationId} />
    </QueryClientProvider>,
  );
}

describe('MessagesWorkspace (Th6-422/424/425/426/427)', () => {
  beforeEach(() => {
    Object.values(api.messaging).forEach((fn) => fn.mockReset());
    api.auth.me.mockReset().mockResolvedValue({ userId: ME });
    api.messaging.markRead.mockResolvedValue({
      conversationId: CONV,
      lastReadAt: '2026-09-25T10:05:00.000Z',
    });
    api.messaging.listConversations.mockResolvedValue({
      conversations: [summary()],
      nextCursor: null,
    });
    api.messaging.listMessages.mockResolvedValue({
      messages: [message('m1', OTHER, 'Hello there')],
      nextCursor: null,
    });
  });

  it('shows an empty state when there are no conversations', async () => {
    api.messaging.listConversations.mockResolvedValue({ conversations: [], nextCursor: null });
    renderWorkspace();
    expect(await screen.findByText('No conversations yet')).toBeDefined();
  });

  it('shows an error with a retry that loads the list again', async () => {
    api.messaging.listConversations.mockRejectedValueOnce(
      new SmartApiError({ error: 'internal', message: 'Server is down', statusCode: 500 }),
    );
    renderWorkspace();
    expect(await screen.findByText('Server is down')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Erin Employer')).toBeDefined();
    expect(api.messaging.listConversations).toHaveBeenCalledTimes(2);
  });

  it('lists conversations with an unread badge', async () => {
    renderWorkspace();
    expect(await screen.findByText('Erin Employer')).toBeDefined();
    expect(screen.getByLabelText('3 unread')).toBeDefined();
  });

  it('opens a thread, marks it read, and renders message text literally (no HTML injection)', async () => {
    api.messaging.listMessages.mockResolvedValue({
      messages: [message('m1', OTHER, '<img src=x onerror=alert(1)> hi')],
      nextCursor: null,
    });
    const { container } = renderWorkspace(CONV);
    expect(await screen.findByText('<img src=x onerror=alert(1)> hi')).toBeDefined();
    expect(container.querySelector('img')).toBeNull();
    await waitFor(() => expect(api.messaging.markRead).toHaveBeenCalledWith(CONV));
  });

  it('sends optimistically, and a failed send shows "Not delivered" with a retry that reuses the same key', async () => {
    api.messaging.send
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ conversationId: CONV, message: message('m2', ME, 'On my way') });
    renderWorkspace(CONV);
    const box = await screen.findByLabelText('Write a message');
    fireEvent.change(box, { target: { value: 'On my way' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Not delivered')).toBeDefined();
    // the text is still on screen, not lost
    expect(screen.getByText('On my way')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(api.messaging.send).toHaveBeenCalledTimes(2));
    const [firstCall, secondCall] = api.messaging.send.mock.calls;
    expect(secondCall?.[2]).toBe(firstCall?.[2]);
    expect(firstCall?.[1]).toEqual({ body: 'On my way' });
  });

  it('does not send an empty or whitespace-only message', async () => {
    renderWorkspace(CONV);
    const box = await screen.findByLabelText('Write a message');
    fireEvent.change(box, { target: { value: '   ' } });
    const send = screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    expect(api.messaging.send).not.toHaveBeenCalled();
  });

  it('shows earlier messages on request', async () => {
    api.messaging.listMessages.mockImplementation(
      async (_id: string, query: { cursor?: string }) =>
        query.cursor
          ? { messages: [message('m1', OTHER, 'older')], nextCursor: null }
          : { messages: [message('m2', OTHER, 'newer')], nextCursor: 'CURSOR' },
    );
    renderWorkspace(CONV);
    fireEvent.click(await screen.findByRole('button', { name: /load earlier messages/i }));
    expect(await screen.findByText('older')).toBeDefined();
    expect(api.messaging.listMessages).toHaveBeenCalledWith(CONV, {
      limit: 30,
      cursor: 'CURSOR',
    });
  });

  it('asks for at least two characters before searching, then shows results and an empty state', async () => {
    renderWorkspace();
    const box = await screen.findByLabelText('Search your messages');
    fireEvent.change(box, { target: { value: 'a' } });
    expect(await screen.findByText(/at least 2 characters/i)).toBeDefined();
    expect(api.messaging.search).not.toHaveBeenCalled();

    api.messaging.search.mockResolvedValueOnce({
      hits: [
        {
          messageId: 'm9',
          conversationId: CONV,
          snippet: 'see you <mark>Monday</mark>',
          counterpartName: 'Erin Employer',
          createdAt: '2026-09-25T10:00:00.000Z',
        },
      ],
      nextCursor: null,
    });
    fireEvent.change(box, { target: { value: 'Monday' } });
    const mark = await screen.findByText('Monday');
    expect(mark.tagName).toBe('MARK');

    api.messaging.search.mockResolvedValueOnce({ hits: [], nextCursor: null });
    fireEvent.change(box, { target: { value: 'zzzz' } });
    expect(await screen.findByText('No messages found')).toBeDefined();
  });

  it('reports a message with the MESSAGE target type', async () => {
    api.messaging.reportMessage.mockResolvedValue({ id: 'r1', alreadyReported: false });
    renderWorkspace(CONV);
    fireEvent.click(await screen.findByRole('button', { name: 'Report' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Report' }));
    await waitFor(() => expect(api.messaging.reportMessage).toHaveBeenCalledTimes(1));
    expect(api.messaging.reportMessage.mock.calls[0]?.[0]).toMatchObject({
      targetType: 'MESSAGE',
      targetId: 'm1',
      reason: 'DISCRIMINATORY',
    });
  });

  it('turns the composer into a notice when the pair is blocked', async () => {
    api.messaging.listConversations.mockResolvedValue({
      conversations: [summary({ canSend: false })],
      nextCursor: null,
    });
    renderWorkspace(CONV);
    expect(await screen.findByText("You can't message this user.")).toBeDefined();
    expect(screen.queryByLabelText('Write a message')).toBeNull();
  });
});
