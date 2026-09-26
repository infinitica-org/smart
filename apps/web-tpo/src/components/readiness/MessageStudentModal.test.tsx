import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageStudentModal } from './MessageStudentModal';
import { universityApi } from '../../lib/api';

vi.mock('../../lib/api', () => ({ universityApi: { messageStudent: vi.fn() } }));

const sent = { conversationId: 'c', message: {} } as never;

function setup() {
  const onClose = vi.fn();
  const onSent = vi.fn();
  render(
    <MessageStudentModal
      open
      studentId="s1"
      studentName="Asha"
      onClose={onClose}
      onSent={onSent}
    />,
  );
  return { onClose, onSent };
}

describe('MessageStudentModal', () => {
  beforeEach(() => vi.mocked(universityApi.messageStudent).mockReset());
  afterEach(cleanup);

  it('shows a field-level message and does not send an empty body', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }));
    expect(await screen.findByText('Write a message first.')).toBeDefined();
    expect(universityApi.messageStudent).not.toHaveBeenCalled();
  });

  it('keeps the draft on failure and retries with the SAME idempotency key', async () => {
    vi.mocked(universityApi.messageStudent)
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce(sent);
    const { onSent, onClose } = setup();
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Please add evidence' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }));

    expect(await screen.findByText(/Network down/)).toBeDefined();
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe(
      'Please add evidence',
    );
    expect(onSent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalled();

    const calls = vi.mocked(universityApi.messageStudent).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]?.[1]).toBe(calls[1]?.[1]);
    expect(calls[1]?.[2]).toEqual({ body: 'Please add evidence' });
  });
});
