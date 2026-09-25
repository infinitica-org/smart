import {
  ALLOWED_TRANSITIONS,
  APPLICATION_STATUSES,
  STAGE_FOR_STATUS,
  type ApplicationStatus,
} from '@smart/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDS, withIdempotencyLedger } from '../company-profile/test-utils.js';
import { HiringService } from './hiring.service.js';

const APP = '99999999-9999-4999-8999-999999999999';
const STUDENT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const INSTITUTION = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const JOB = '00000000-0000-4000-8000-000000000001';

const employer = { type: 'EMPLOYER' as const, id: IDS.owner, companyId: IDS.companyA };
const student = { type: 'STUDENT' as const, id: STUDENT };

describe('HiringService.transition (Th6-414/418)', () => {
  let apps: any[];
  let order: string[];
  let prisma: any;
  let outbox: any;
  let service: HiringService;

  const application = (stage: string, over: Record<string, unknown> = {}) => ({
    id: APP,
    openingId: JOB,
    studentId: STUDENT,
    stage,
    createdAt: new Date('2026-09-20T00:00:00Z'),
    updatedAt: new Date('2026-09-20T00:00:00Z'),
    opening: { companyId: IDS.companyA, institutionId: INSTITUTION },
    ...over,
  });

  beforeEach(() => {
    apps = [application('APPLIED')];
    order = [];
    const ledger = withIdempotencyLedger({
      application: {
        findUnique: vi.fn(async ({ where }: any) => {
          const row = apps.find((a) => a.id === where.id);
          return row ? { ...row } : null; // a copy, like a real read
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const row = apps.find((a) => a.id === where.id);
          Object.assign(row, data, { updatedAt: new Date('2026-09-26T10:00:00Z') });
          order.push('update');
          return { ...row, student: { fullName: 'A', email: 'a@x.test', primaryTrack: null } };
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          const row = apps.find(
            (a) => a.id === where.id && (!where.stage || a.stage === where.stage),
          );
          if (!row) return { count: 0 };
          Object.assign(row, data);
          order.push('update');
          return { count: 1 };
        }),
      },
      applicationStageEvent: {
        create: vi.fn(async ({ data }: any) => {
          order.push('event');
          return { id: 'ev-1', createdAt: new Date('2026-09-26T10:00:00Z'), ...data };
        }),
      },
    });
    prisma = ledger.prisma;
    const auditCreate = prisma.auditLog.create;
    prisma.auditLog.create = vi.fn(async (args: any) => {
      order.push('audit');
      return auditCreate(args);
    });
    outbox = {
      enqueueEnvelope: vi.fn(async () => {
        order.push('publish');
      }),
    };
    service = new HiringService(prisma, ledger.idempotency, outbox);
  });

  const move = (toStatus: ApplicationStatus, over: Record<string, unknown> = {}) =>
    service.transition({
      applicationId: APP,
      toStatus,
      expectedFromStatus: 'APPLIED',
      actor: employer,
      idempotencyKey: `k-${Math.random()}`,
      source: 'employer_board',
      ...over,
    } as any);

  /* ---------- every valid move, table-driven ---------- */
  const validEmployerMoves = APPLICATION_STATUSES.flatMap((from) =>
    ALLOWED_TRANSITIONS[from].map((to) => [from, to] as const),
  );

  it.each(validEmployerMoves)(
    '%s -> %s writes exactly one event, one audit row and one status event',
    async (from, to) => {
      apps[0].stage = STAGE_FOR_STATUS[from];
      const result = await move(to, { expectedFromStatus: from, note: 'because' });

      expect(result).toMatchObject({ applicationId: APP, fromStatus: from, toStatus: to });
      expect(prisma.applicationStageEvent.create).toHaveBeenCalledTimes(1);
      expect(prisma.applicationStageEvent.create.mock.calls[0]?.[0].data).toMatchObject({
        applicationId: APP,
        orgId: IDS.companyA,
        fromStatus: from,
        toStatus: to,
        actorId: IDS.owner,
        actorType: 'EMPLOYER',
        note: 'because',
        source: 'employer_board',
      });
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      expect(outbox.enqueueEnvelope).toHaveBeenCalledTimes(1);
      expect(apps[0].stage).toBe(STAGE_FOR_STATUS[to]);
    },
  );

  it.each(['APPLIED', 'REVIEWING', 'INTERVIEWING', 'OFFERED'] as const)(
    'a student withdraws from %s through the same service (actor STUDENT)',
    async (from) => {
      apps[0].stage = STAGE_FOR_STATUS[from];
      await service.transition({
        applicationId: APP,
        toStatus: 'WITHDRAWN',
        expectedFromStatus: from,
        note: 'changed my mind',
        actor: student,
        idempotencyKey: 'w1',
        source: 'student_withdraw',
      });
      expect(prisma.applicationStageEvent.create).toHaveBeenCalledTimes(1);
      expect(prisma.applicationStageEvent.create.mock.calls[0]?.[0].data).toMatchObject({
        toStatus: 'WITHDRAWN',
        actorType: 'STUDENT',
        note: 'changed my mind',
        source: 'student_withdraw',
      });
    },
  );

  it('records who, which organisation, when, from where, and the prior and new status in the audit row', async () => {
    await move('REVIEWING');
    const audit = prisma.auditLog.create.mock.calls[0]?.[0].data;
    expect(audit).toMatchObject({
      actorId: IDS.owner,
      action: 'application.status_changed',
      resourceId: APP,
      metadata: {
        orgId: IDS.companyA,
        source: 'employer_board',
        actorType: 'EMPLOYER',
        before: { status: 'APPLIED' },
        after: { status: 'REVIEWING' },
        at: '2026-09-26T10:00:00.000Z',
      },
    });
  });

  /* ---------- refusals write nothing ---------- */
  it('409s when the application was moved since the caller loaded it, and writes nothing', async () => {
    apps[0].stage = 'SHORTLISTED'; // another recruiter already moved it to Reviewing
    await expect(move('REVIEWING')).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ error: 'stale_status', currentStatus: 'REVIEWING' }),
    });
    expect(prisma.applicationStageEvent.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it('409s when a concurrent move wins between the read and the conditional update', async () => {
    prisma.application.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(move('REVIEWING')).rejects.toMatchObject({ status: 409 });
    expect(prisma.applicationStageEvent.create).not.toHaveBeenCalled();
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it('422s a move the rules do not allow, naming the two statuses', async () => {
    await expect(move('OFFERED')).rejects.toMatchObject({
      status: 422,
      response: expect.objectContaining({ message: "Can't move from Applied to Offered" }),
    });
    expect(prisma.application.updateMany).not.toHaveBeenCalled();
    expect(prisma.applicationStageEvent.create).not.toHaveBeenCalled();
  });

  it.each(['HIRED', 'REJECTED', 'WITHDRAWN'] as const)(
    '422s any move out of %s',
    async (terminal) => {
      apps[0].stage = STAGE_FOR_STATUS[terminal];
      await expect(move('REVIEWING', { expectedFromStatus: terminal })).rejects.toMatchObject({
        status: 422,
      });
      expect(prisma.applicationStageEvent.create).not.toHaveBeenCalled();
    },
  );

  it('does not let an employer withdraw, or a student make an employer move', async () => {
    await expect(move('WITHDRAWN')).rejects.toMatchObject({ status: 422 });
    await expect(
      service.transition({
        applicationId: APP,
        toStatus: 'REVIEWING',
        expectedFromStatus: 'APPLIED',
        actor: student,
        idempotencyKey: 's1',
        source: 'x',
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(prisma.applicationStageEvent.create).not.toHaveBeenCalled();
  });

  it("404s another company's application, a missing one, and another student's", async () => {
    await expect(
      move('REVIEWING', {
        actor: { type: 'EMPLOYER', id: IDS.otherCompanyUser, companyId: IDS.companyB },
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      move('REVIEWING', { actor: { type: 'EMPLOYER', id: IDS.owner, companyId: null } }),
    ).rejects.toMatchObject({
      status: 404,
    });
    await expect(move('REVIEWING', { applicationId: 'nope' })).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      service.transition({
        applicationId: APP,
        toStatus: 'WITHDRAWN',
        expectedFromStatus: 'APPLIED',
        actor: { type: 'STUDENT', id: 'someone-else' },
        idempotencyKey: 'w',
        source: 'x',
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(prisma.applicationStageEvent.create).not.toHaveBeenCalled();
  });

  /* ---------- transaction + post-commit ordering ---------- */
  it('does the update, event and audit inside one transaction and publishes only after commit', async () => {
    await move('REVIEWING');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(order).toEqual(['update', 'event', 'audit', 'publish']);
  });

  it('publishes nothing if the transaction fails part-way', async () => {
    prisma.auditLog.create = vi.fn(async () => {
      throw new Error('db down');
    });
    await expect(move('REVIEWING')).rejects.toThrow('db down');
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  /* ---------- idempotency ---------- */
  it('the same Idempotency-Key replays the same response with no duplicate event, audit or notification', async () => {
    const first = await move('REVIEWING', { idempotencyKey: 'same' });
    const retry = await move('REVIEWING', { idempotencyKey: 'same' });
    expect(retry).toEqual(first);
    expect(prisma.applicationStageEvent.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(outbox.enqueueEnvelope).toHaveBeenCalledTimes(1);
  });

  it('reusing a key for a different move is a 409, and a new key after success is a stale 409, not a duplicate', async () => {
    await move('REVIEWING', { idempotencyKey: 'k' });
    await expect(move('REJECTED', { idempotencyKey: 'k' })).rejects.toMatchObject({ status: 409 });
    await expect(move('REVIEWING', { idempotencyKey: 'fresh' })).rejects.toMatchObject({
      status: 409,
    });
    expect(prisma.applicationStageEvent.create).toHaveBeenCalledTimes(1);
  });

  /* ---------- the university's board ---------- */
  it("records the university's move as an INSTITUTION event and skips no-ops", async () => {
    apps[0].stage = 'SHORTLISTED';
    const moved = await service.moveInstitutionStage({
      applicationId: APP,
      toStage: 'AI_VERIFIED',
      actorId: 'tpo-1',
      institutionId: INSTITUTION,
    });
    expect(moved.changed).toBe(true);
    expect(prisma.applicationStageEvent.create.mock.calls[0]?.[0].data).toMatchObject({
      actorType: 'INSTITUTION',
      source: 'tpo_board',
      toStatus: 'REVIEWING',
    });
    prisma.applicationStageEvent.create.mockClear();
    const again = await service.moveInstitutionStage({
      applicationId: APP,
      toStage: 'AI_VERIFIED',
      actorId: 'tpo-1',
    });
    expect(again.changed).toBe(false);
    expect(prisma.applicationStageEvent.create).not.toHaveBeenCalled();
  });
});
