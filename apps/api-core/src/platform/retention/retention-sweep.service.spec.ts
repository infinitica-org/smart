import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RETENTION_POLICIES, RetentionSweepService } from './retention-sweep.service.js';

const DAY = 86_400_000;
const NOW = Date.parse('2026-09-26T00:00:00.000Z');

function table(count = 3) {
  return {
    count: vi.fn().mockResolvedValue(count),
    deleteMany: vi.fn().mockResolvedValue({ count }),
  };
}

describe('S6-VV-118 retention sweep', () => {
  let prisma: any;
  let storage: any;
  let service: RetentionSweepService;

  beforeEach(() => {
    prisma = {
      auditLog: table(),
      rateLimitLog: table(),
      notification: table(),
      emailVerificationToken: table(1),
      passwordResetToken: table(1),
      refreshToken: table(1),
      integrityEvent: table(9),
      user: table(2),
      dataSubjectRequest: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([{ id: 'r1', exportKey: 'dsr-exports/u/r1.json' }]),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    storage = { deleteObject: vi.fn().mockResolvedValue(undefined) };
    service = new RetentionSweepService(prisma, storage);
  });

  it('keeps audit logs for 400 days (decision D2), no longer 20', async () => {
    await service.run({ dryRun: false }, NOW);

    const cutoff: Date = prisma.auditLog.deleteMany.mock.calls[0][0].where.createdAt.lt;
    expect(NOW - cutoff.getTime()).toBe(400 * DAY);
    expect(RETENTION_POLICIES.find((p) => p.category === 'audit_logs')?.days).toBe(400);
  });

  it('a dry run counts every category and deletes nothing', async () => {
    const report = await service.run({ dryRun: true }, NOW);

    expect(report.map((row) => row.category)).toEqual(RETENTION_POLICIES.map((p) => p.category));
    expect(report.every((row) => row.removed === 0)).toBe(true);
    expect(report.find((row) => row.category === 'expired_auth_tokens')?.matched).toBe(3);
    for (const model of ['auditLog', 'rateLimitLog', 'notification', 'refreshToken']) {
      expect(prisma[model].deleteMany).not.toHaveBeenCalled();
    }
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('a live run removes only rows past each cutoff', async () => {
    const report = await service.run({ dryRun: false }, NOW);

    expect(prisma.rateLimitLog.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date(NOW - 30 * DAY) } },
    });
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { readAt: { lt: new Date(NOW - 180 * DAY) } },
    });
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: new Date(NOW - 30 * DAY) } },
    });
    expect(report.find((row) => row.category === 'audit_logs')?.removed).toBe(3);
  });

  it('never removes report-only categories, even live', async () => {
    const report = await service.run({ dryRun: false }, NOW);

    expect(prisma.integrityEvent.deleteMany).not.toHaveBeenCalled();
    expect(prisma.user.deleteMany).not.toHaveBeenCalled();
    expect(report.find((row) => row.category === 'integrity_events')).toMatchObject({
      action: 'report',
      matched: 9,
      removed: 0,
    });
  });

  it('deletes expired export bundles from storage and forgets their key', async () => {
    await service.run({ dryRun: false }, NOW);

    expect(prisma.dataSubjectRequest.findMany.mock.calls[0][0].where).toMatchObject({
      type: 'EXPORT',
      resolvedAt: { lt: new Date(NOW - 7 * DAY) },
    });
    expect(storage.deleteObject).toHaveBeenCalledWith('dsr-exports/u/r1.json');
    expect(prisma.dataSubjectRequest.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { exportKey: null },
    });
  });
});
