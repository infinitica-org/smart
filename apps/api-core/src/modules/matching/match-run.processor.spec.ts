import { describe, expect, it, vi } from 'vitest';
import { MatchRunProcessor } from './match-run.processor.js';

describe('MatchRunProcessor', () => {
  it('delegates to MatchingService.runMatchRun with the job payload', async () => {
    const matching = { runMatchRun: vi.fn().mockResolvedValue(undefined) };
    const dlq = { add: vi.fn() };
    const processor = new MatchRunProcessor(matching as never, dlq as never);

    await processor.process({ data: { matchRunId: 'run-1' } } as never);

    expect(matching.runMatchRun).toHaveBeenCalledWith('run-1');
  });

  it('propagates a failure so DlqAwareProcessor can DLQ it once retries exhaust', async () => {
    const matching = { runMatchRun: vi.fn().mockRejectedValue(new Error('boom')) };
    const dlq = { add: vi.fn() };
    const processor = new MatchRunProcessor(matching as never, dlq as never);

    await expect(processor.process({ data: { matchRunId: 'run-1' } } as never)).rejects.toThrow(
      'boom',
    );
  });
});
