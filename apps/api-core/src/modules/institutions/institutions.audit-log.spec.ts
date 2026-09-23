import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { InstitutionsService } from './institutions.service.js';

const noopRedis = { get: vi.fn(), setex: vi.fn(), del: vi.fn() };

describe('InstitutionsService.listAuditLogs', () => {
  const auditRow = {
    id: randomUUID(),
    actorId: randomUUID(),
    action: 'institution.held',
    resourceType: 'institution',
    resourceId: randomUUID(),
    reasonCode: 'suspected fraud',
    metadata: { note: 'flagged by billing' },
    createdAt: new Date('2026-01-15T00:00:00.000Z'),
    actor: { email: 'admin@example.com', role: 'SUPER_ADMIN' },
  };

  function buildService(findMany = vi.fn().mockResolvedValue([auditRow])) {
    const prisma = { auditLog: { findMany } };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
      {} as never,
    );
    return { service, findMany };
  }

  it('maps rows into AuditLogDto shape, including metadata', async () => {
    const { service } = buildService();
    const rows = await service.listAuditLogs();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.action).toBe('institution.held');
    expect(rows[0]?.metadata).toEqual({ note: 'flagged by billing' });
  });

  it('applies a createdAt range when from/to are provided', async () => {
    const { service, findMany } = buildService();
    await service.listAuditLogs({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.999Z',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date('2026-01-01T00:00:00.000Z'),
            lte: new Date('2026-01-31T23:59:59.999Z'),
          },
        }),
      }),
    );
  });

  it('applies only a lower bound when only from is provided', async () => {
    const { service, findMany } = buildService();
    await service.listAuditLogs({ from: '2026-01-01T00:00:00.000Z' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gte: new Date('2026-01-01T00:00:00.000Z') },
        }),
      }),
    );
  });

  it('omits the createdAt clause entirely when no range is given', async () => {
    const { service, findMany } = buildService();
    await service.listAuditLogs({ actorId: auditRow.actorId });

    const callArgs = findMany.mock.calls[0]?.[0];
    expect(callArgs.where).not.toHaveProperty('createdAt');
  });
});
