import { describe, expect, it, vi } from 'vitest';
import { createProctorIngest } from './ingest-queue';

describe('createProctorIngest', () => {
  it('queues reports until a secret exists then flushes them', async () => {
    let secret = '';
    const send = vi.fn().mockResolvedValue(undefined);
    const ingest = createProctorIngest({
      getSecret: () => secret,
      send,
      debounceMs: 0,
    });
    ingest.report('RIGHT_CLICK');
    ingest.report('OS_KEY');
    await ingest.flush();
    expect(send).not.toHaveBeenCalled();
    secret = 'hmac-secret-value';
    await ingest.flush();
    expect(send).toHaveBeenCalledWith('RIGHT_CLICK');
    expect(send).toHaveBeenCalledWith('OS_KEY');
  });
});
