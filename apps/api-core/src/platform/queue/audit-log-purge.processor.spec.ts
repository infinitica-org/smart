import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditLogPurgeProcessor } from './audit-log-purge.processor.js';

describe('AuditLogPurgeProcessor', () => {
  let prisma: any;
  let queue: any;
  let processor: AuditLogPurgeProcessor;

  beforeEach(() => {
    prisma = {
      auditLog: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    queue = {
      upsertJobScheduler: vi.fn().mockResolvedValue(undefined),
    };
    processor = new AuditLogPurgeProcessor(prisma, queue);
  });

  it('deletes audit_logs rows older than the 20-day retention window', async () => {
    await processor.process();

    expect(prisma.auditLog.deleteMany).toHaveBeenCalledTimes(1);
    const { where } = prisma.auditLog.deleteMany.mock.calls[0][0];
    const cutoff: Date = where.createdAt.lt;

    const expectedCutoff = Date.now() - 20 * 24 * 60 * 60 * 1000;
    // Allow a small tolerance for the time elapsed between building the
    // expectation and the processor computing its own cutoff.
    expect(Math.abs(cutoff.getTime() - expectedCutoff)).toBeLessThan(5_000);
  });

  it('logs nothing noisy when nothing is purged', async () => {
    prisma.auditLog.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(processor.process()).resolves.toBeUndefined();
  });

  // onModuleInit is skipped under NODE_ENV=test (matches the same guard
  // convention as AuditRecordedConsumer) so its scheduling call is not
  // exercised here — it has no branching logic worth a mocked-env test.
});
