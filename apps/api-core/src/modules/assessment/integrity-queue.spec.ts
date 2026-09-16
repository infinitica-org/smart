import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentService } from './assessment.service.js';

const ATTEMPT_ID = '55555555-5555-5555-5555-555555555555';
const OTHER_ATTEMPT_ID = '55555555-5555-5555-5555-555555555556';
const STUDENT_ID = '11111111-1111-1111-1111-111111111111';

type MockEvent = { id: string; attemptId: string; detail: unknown; createdAt: Date };
type MockAttempt = {
  id: string;
  userId: string;
  status: string;
  integrityFlag: string;
  startedAt: Date;
  completedAt: Date | null;
  user: { fullName: string; email: string };
};

/**
 * Builds a minimal Prisma double covering only the models/queries touched by
 * `listIntegrityQueue`/`resolveIntegrity`/`toIntegrityQueueItem`:
 *  - `attempt.findMany` / `findUnique` / `update`, with the same
 *    `events: { take: 50 }` cap the real query applies.
 *  - `integrityEvent.groupBy` / `count`, filtered to `detail.classified ===
 *    'INTEGRITY'` the same way the real (Postgres JSON-path) query is.
 */
function createMockPrisma() {
  const attempts: MockAttempt[] = [];
  const events: MockEvent[] = [];

  function classifiedCountFor(attemptId: string): number {
    return events.filter(
      (e) =>
        e.attemptId === attemptId &&
        (e.detail as { classified?: string })?.classified === 'INTEGRITY',
    ).length;
  }

  function eventsFor(attemptId: string, take = 50) {
    return events
      .filter((e) => e.attemptId === attemptId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, take)
      .map((e) => ({ detail: e.detail, createdAt: e.createdAt }));
  }

  return {
    _attempts: attempts,
    _events: events,
    attempt: {
      findMany: vi.fn(async ({ where, take }: any) => {
        let rows = attempts.filter((a) => a.status !== 'VOIDED');
        if (where?.integrityFlag?.in) {
          rows = rows.filter((a) => where.integrityFlag.in.includes(a.integrityFlag));
        }
        rows = [...rows].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
        if (typeof take === 'number') rows = rows.slice(0, take);
        return rows.map((a) => ({ ...a, events: eventsFor(a.id, 50) }));
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        const found = attempts.find((a) => a.id === where.id);
        return found ? { ...found } : null;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const found = attempts.find((a) => a.id === where.id);
        if (!found) throw new Error('Attempt not found in mock store');
        Object.assign(found, data);
        return { ...found, events: eventsFor(found.id, 50) };
      }),
    },
    integrityEvent: {
      groupBy: vi.fn(async ({ where }: any) => {
        const ids: string[] = where.attemptId.in;
        return ids
          .map((attemptId) => ({ attemptId, _count: { _all: classifiedCountFor(attemptId) } }))
          .filter((row) => row._count._all > 0);
      }),
      count: vi.fn(async ({ where }: any) => classifiedCountFor(where.attemptId)),
    },
  } as any;
}

function createMockRedis() {
  return {
    get: vi.fn(async () => null),
    setex: vi.fn(async () => 'OK'),
  } as any;
}

function createMockAuditPublisher() {
  return { record: vi.fn(async () => undefined) } as any;
}

function baseAttempt(overrides: Partial<MockAttempt> = {}): MockAttempt {
  return {
    id: ATTEMPT_ID,
    userId: STUDENT_ID,
    status: 'IN_PROGRESS',
    integrityFlag: 'FLAGGED_PROCTOR',
    startedAt: new Date('2026-01-01T00:00:00.000Z'),
    completedAt: null,
    user: { fullName: 'Jane Student', email: 'jane@example.com' },
    ...overrides,
  };
}

describe('AssessmentService integrity queue (S6-VV-64)', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: AssessmentService;

  beforeEach(() => {
    prisma = createMockPrisma();
    const redis = createMockRedis();
    const rotation = {} as any;
    const outbox = {} as any;
    const auditPublisher = createMockAuditPublisher();
    const aiGateway = {} as any;
    service = new AssessmentService(prisma, redis, rotation, outbox, auditPublisher, aiGateway);
  });

  it('flagReason ignores a technical event even when it is the most recent one', async () => {
    prisma._attempts.push(baseAttempt());
    // Most recent event is a transient technical blip (network loss).
    prisma._events.push({
      id: 'e1',
      attemptId: ATTEMPT_ID,
      detail: { kind: 'NETWORK_LOSS', severity: 'high', classified: 'TECHNICAL' },
      createdAt: new Date('2026-01-01T00:05:00.000Z'),
    });
    // Older event is a genuine classified integrity violation.
    prisma._events.push({
      id: 'e2',
      attemptId: ATTEMPT_ID,
      detail: { kind: 'TAB_BLUR', severity: 'medium', classified: 'INTEGRITY' },
      createdAt: new Date('2026-01-01T00:04:00.000Z'),
    });

    const [item] = await service.listIntegrityQueue();

    expect(item.flagReason).toBe('TAB_BLUR');
  });

  it('severity score excludes technical events entirely', async () => {
    prisma._attempts.push(baseAttempt());
    // Several high-severity TECHNICAL events only — none should count toward
    // the score, so the band must stay CLEAN.
    for (let i = 0; i < 5; i += 1) {
      prisma._events.push({
        id: `tech-${i}`,
        attemptId: ATTEMPT_ID,
        detail: { kind: 'NETWORK_LOSS', severity: 'high', classified: 'TECHNICAL' },
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
      });
    }

    const [item] = await service.listIntegrityQueue();

    expect(item.severity).toBe('CLEAN');
    expect(item.flagReason).toBeNull();
  });

  it('flagReason "+N more" count is not truncated by the 50-row events cap', async () => {
    prisma._attempts.push(baseAttempt());
    // 60 classified integrity events, all within the last hour, newest first.
    for (let i = 0; i < 60; i += 1) {
      prisma._events.push({
        id: `int-${i}`,
        attemptId: ATTEMPT_ID,
        detail: { kind: 'TAB_BLUR', severity: 'low', classified: 'INTEGRITY' },
        createdAt: new Date(Date.UTC(2026, 0, 1, 1, 0, 0, 1000 * (60 - i))),
      });
    }

    const [item] = await service.listIntegrityQueue();

    // True count is 60, so "+N more" must read 59, not 49 (60 capped to 50, minus 1).
    expect(item.flagReason).toBe('TAB_BLUR (+59 more)');
  });

  it('resolveIntegrity also reports the true (uncapped) event count', async () => {
    prisma._attempts.push(baseAttempt());
    for (let i = 0; i < 55; i += 1) {
      prisma._events.push({
        id: `int-${i}`,
        attemptId: ATTEMPT_ID,
        detail: { kind: 'RIGHT_CLICK', severity: 'low', classified: 'INTEGRITY' },
        createdAt: new Date(Date.UTC(2026, 0, 1, 1, 0, 0, 1000 * (55 - i))),
      });
    }

    const result = await service.resolveIntegrity(
      ATTEMPT_ID,
      { resolution: 'CLEAR', reason: 'reviewed, false positive' },
      'admin-1',
    );

    expect(result.flagReason).toBe('RIGHT_CLICK (+54 more)');
  });

  it('listIntegrityQueue defaults to PENDING and excludes ESCALATED attempts', async () => {
    prisma._attempts.push(baseAttempt({ integrityFlag: 'FLAGGED_PROCTOR' }));
    prisma._attempts.push(
      baseAttempt({
        id: OTHER_ATTEMPT_ID,
        integrityFlag: 'ESCALATED',
        startedAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
    );

    const pending = await service.listIntegrityQueue();
    expect(pending.map((i) => i.attemptId)).toEqual([ATTEMPT_ID]);

    const escalated = await service.listIntegrityQueue('ESCALATED');
    expect(escalated.map((i) => i.attemptId)).toEqual([OTHER_ATTEMPT_ID]);
  });

  it('resolveIntegrity(ESCALATE) moves an attempt into the ESCALATED view', async () => {
    prisma._attempts.push(baseAttempt());

    await service.resolveIntegrity(
      ATTEMPT_ID,
      { resolution: 'ESCALATE', reason: 'looks like a genuine violation' },
      'admin-1',
    );

    const pending = await service.listIntegrityQueue();
    expect(pending).toHaveLength(0);

    const escalated = await service.listIntegrityQueue('ESCALATED');
    expect(escalated.map((i) => i.attemptId)).toEqual([ATTEMPT_ID]);
  });
});
