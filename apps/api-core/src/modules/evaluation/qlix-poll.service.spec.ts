import { describe, expect, it, vi } from 'vitest';
import { QlixPollService } from './qlix-poll.service.js';

describe('QlixPollService', () => {
  it('skips when a verification report already exists', async () => {
    const prisma = {
      projectVerificationReport: {
        findUnique: vi.fn().mockResolvedValue({ id: 'report-1' }),
      },
    };
    const service = new QlixPollService(
      prisma as never,
      { getCheck: vi.fn() } as never,
      { markVerifyComplete: vi.fn() } as never,
      { enqueueEnvelope: vi.fn() } as never,
      { get: vi.fn() } as never,
      { add: vi.fn() } as never,
    );

    await service.handlePoll({
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      studentId: '123e4567-e89b-12d3-a456-426614174001',
      checkId: 'check-1',
      startedAtMs: Date.now(),
    });

    expect(prisma.projectVerificationReport.findUnique).toHaveBeenCalled();
  });
});
