import { CreateReportRequestSchema, REPORT_ESCALATION_THRESHOLD } from '@smart/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withIdempotencyLedger } from '../company-profile/test-utils.js';
import { JobReportsService } from './job-reports.service.js';

const STUDENT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const INSTITUTION = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const JOB = '00000000-0000-4000-8000-000000000001';

const body = (over: Record<string, unknown> = {}) =>
  CreateReportRequestSchema.parse({ targetType: 'JOB', targetId: JOB, reason: 'SCAM', ...over });

describe('JobReportsService (Th6-386)', () => {
  let prisma: any;
  let service: JobReportsService;
  let job: { id: string; institutionId: string; companyId: null } | null;
  let stored: Map<string, any>;
  let openCount: number;

  beforeEach(() => {
    job = { id: JOB, institutionId: INSTITUTION, companyId: null };
    stored = new Map();
    openCount = 1;
    const ledger = withIdempotencyLedger({
      user: { findUnique: vi.fn(async () => ({ id: STUDENT, institutionId: INSTITUTION })) },
      jobOpening: { findFirst: vi.fn(async () => job) },
      report: {
        findUnique: vi.fn(
          async ({ where }: any) =>
            stored.get(where.reporterId_targetType_targetId.reporterId) ?? null,
        ),
        create: vi.fn(async ({ data }: any) => {
          const row = {
            id: 'rep-1',
            status: 'OPEN',
            createdAt: new Date('2026-09-25T00:00:00Z'),
            ...data,
          };
          stored.set(data.reporterId, row);
          return row;
        }),
        count: vi.fn(async () => openCount),
      },
      hiddenJob: { upsert: vi.fn(async () => ({})) },
    });
    prisma = ledger.prisma;
    service = new JobReportsService(prisma, ledger.idempotency);
  });

  it('creates a report, hides the job for the reporter and audits', async () => {
    const report = await service.create(STUDENT, {
      key: 'k1',
      body: body({ details: 'Asks for a fee' }),
    });
    expect(report).toMatchObject({
      targetType: 'JOB',
      targetId: JOB,
      reason: 'SCAM',
      status: 'OPEN',
      alreadyReported: false,
    });
    expect(prisma.hiddenJob.upsert.mock.calls[0]?.[0].create).toMatchObject({
      studentId: STUDENT,
      jobId: JOB,
    });
    const audit = prisma.auditLog.create.mock.calls[0]?.[0].data;
    expect(audit).toMatchObject({ action: 'job.reported', actorId: STUDENT, reasonCode: 'SCAM' });
  });

  it('a repeat report on the same job returns the existing one and creates nothing', async () => {
    const first = await service.create(STUDENT, { key: 'k1', body: body() });
    const repeat = await service.create(STUDENT, {
      key: 'k2',
      body: body({ reason: 'MISLEADING' }),
    });
    expect(repeat).toMatchObject({ id: first.id, reason: 'SCAM', alreadyReported: true });
    expect(prisma.report.create).toHaveBeenCalledTimes(1);
  });

  it('a retry with the same Idempotency-Key does not duplicate anything', async () => {
    const first = await service.create(STUDENT, { key: 'same', body: body() });
    const retry = await service.create(STUDENT, { key: 'same', body: body() });
    expect(retry).toEqual(first);
    expect(prisma.report.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('404s a job the student cannot see', async () => {
    job = null;
    await expect(service.create(STUDENT, { key: 'k1', body: body() })).rejects.toMatchObject({
      status: 404,
    });
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it('flags the job for moderation exactly when the open reports reach the threshold', async () => {
    openCount = REPORT_ESCALATION_THRESHOLD - 1;
    await service.create(STUDENT, { key: 'k1', body: body() });
    expect(prisma.auditLog.create.mock.calls.map((c: any) => c[0].data.action)).toEqual([
      'job.reported',
    ]);

    stored.clear();
    prisma.auditLog.create.mockClear();
    openCount = REPORT_ESCALATION_THRESHOLD;
    await service.create(STUDENT, { key: 'k2', body: body() });
    expect(prisma.auditLog.create.mock.calls.map((c: any) => c[0].data.action)).toEqual([
      'job.reported',
      'job.report_threshold_reached',
    ]);

    stored.clear();
    prisma.auditLog.create.mockClear();
    openCount = REPORT_ESCALATION_THRESHOLD + 1;
    await service.create(STUDENT, { key: 'k3', body: body() });
    expect(prisma.auditLog.create.mock.calls.map((c: any) => c[0].data.action)).toEqual([
      'job.reported',
    ]);
  });

  it('validates the payload (422): reason enum, uuid target, details required for OTHER', () => {
    const parse = (over: Record<string, unknown>) =>
      CreateReportRequestSchema.safeParse({
        targetType: 'JOB',
        targetId: JOB,
        reason: 'SCAM',
        ...over,
      });
    expect(parse({}).success).toBe(true);
    expect(parse({ reason: 'RUDE' }).success).toBe(false);
    expect(parse({ targetId: 'x' }).success).toBe(false);
    expect(parse({ targetType: 'USER' }).success).toBe(false);
    const other = parse({ reason: 'OTHER' });
    expect(other.success).toBe(false);
    expect(other.error?.issues[0]?.path).toEqual(['details']);
    expect(parse({ reason: 'OTHER', details: 'Sends unsolicited messages.' }).success).toBe(true);
    expect(parse({ details: 'x'.repeat(1001) }).success).toBe(false);
  });
});
