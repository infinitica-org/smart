import { ListAdminReportsQuerySchema } from '@smart/contracts';
import { describe, expect, it, vi } from 'vitest';
import { AdminReportsService } from './admin-reports.service.js';

const at = (day: number) => new Date(Date.UTC(2026, 8, day));
const report = (n: number) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  targetType: 'MESSAGE',
  reason: 'SCAM',
  status: 'OPEN',
  createdAt: at(n),
  // Anything else on the row must never be returned.
  details: 'private words',
  targetId: 'x',
});
const query = (over: Record<string, unknown> = {}) => ListAdminReportsQuerySchema.parse(over);

function build(rows: ReturnType<typeof report>[]) {
  const findMany = vi.fn(async () => rows);
  return { findMany, service: new AdminReportsService({ report: { findMany } } as any) };
}

describe('AdminReportsService (Th6-430)', () => {
  it('returns newest first with metadata only, never content', async () => {
    const { service, findMany } = build([report(3), report(2)]);
    const result = await service.list(query());
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, targetType: true, reason: true, status: true, createdAt: true },
    });
    expect(result.reports.map((r) => r.createdAt)).toEqual([
      at(3).toISOString(),
      at(2).toISOString(),
    ]);
    expect(JSON.stringify(result)).not.toContain('private words');
    expect(result.nextCursor).toBeNull();
  });

  it('filters by target type, status and date window', async () => {
    const { service, findMany } = build([]);
    await service.list(
      query({
        targetType: 'MESSAGE',
        status: 'OPEN',
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-30T00:00:00.000Z',
      }),
    );
    const where = (findMany.mock.calls[0] as any)[0].where;
    expect(where.targetType).toBe('MESSAGE');
    expect(where.status).toBe('OPEN');
    expect(where.AND).toEqual([
      {
        createdAt: {
          gte: new Date('2026-09-01T00:00:00.000Z'),
          lte: new Date('2026-09-30T00:00:00.000Z'),
        },
      },
    ]);
  });

  it('pages with a cursor and keeps the date window while paging', async () => {
    const { service, findMany } = build([report(5), report(4), report(3)]);
    const first = await service.list(query({ limit: 2, from: '2026-09-01T00:00:00.000Z' }));
    expect(first.reports).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    await service.list(
      query({ limit: 2, from: '2026-09-01T00:00:00.000Z', cursor: first.nextCursor as string }),
    );
    const where = (findMany.mock.calls[1] as any)[0].where;
    expect(where.AND).toHaveLength(2); // the window AND the cursor
    expect(where.AND[1].OR[0]).toEqual({ createdAt: { lt: at(4) } });
  });

  it('rejects unknown filter values', () => {
    expect(ListAdminReportsQuerySchema.safeParse({ targetType: 'USER' }).success).toBe(false);
    expect(ListAdminReportsQuerySchema.safeParse({ status: 'DONE' }).success).toBe(false);
  });
});
