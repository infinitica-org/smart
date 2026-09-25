/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLES_KEY } from '../../common/guards/roles.decorator.js';
import { withIdempotencyLedger } from '../company-profile/test-utils.js';
import { AdminConversationService } from './admin-conversation.service.js';
import { BlocksService } from './blocks.service.js';
import { MessageReportsService } from './message-reports.service.js';
import { AdminConversationController } from './admin-conversation.controller.js';
import { MessagingController } from './messaging.controller.js';
import { REDACTED_BODY } from './messaging.constants.js';
import { ModerationRetentionService } from './moderation-retention.service.js';

const INSTITUTION = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const STUDENT = '22222222-2222-4222-8222-222222222222';
const ADVISOR = '55555555-5555-4555-8555-555555555555';
const EMPLOYER = '11111111-1111-4111-8111-111111111111';
const ADMIN = '66666666-6666-4666-8666-666666666666';
const CONV = '44444444-4444-4444-8444-444444444444';
const MESSAGE = '77777777-7777-4777-8777-777777777777';
const REPORT = '88888888-8888-4888-8888-888888888888';

describe('BlocksService (Th6-423/427)', () => {
  let prisma: any;
  let service: BlocksService;
  let users: Record<string, any>;
  let blocks: any[];

  beforeEach(() => {
    blocks = [];
    users = {
      [STUDENT]: { fullName: 'Sam', role: 'STUDENT', institutionId: INSTITUTION },
      [ADVISOR]: { fullName: 'Adam', role: 'PLACEMENT_STAFF', institutionId: INSTITUTION },
      [EMPLOYER]: { fullName: 'Erin', role: 'COMPANY', institutionId: null },
    };
    const tx: any = {
      block: {
        create: vi.fn(async ({ data }: any) => {
          const row = { ...data, createdAt: new Date() };
          blocks.push(row);
          return row;
        }),
        delete: vi.fn(async () => blocks.pop()),
      },
      conversationParticipant: { updateMany: vi.fn(async () => ({ count: 1 })) },
      auditLog: { create: vi.fn(async () => ({})) },
    };
    prisma = {
      ...tx,
      user: { findUnique: vi.fn(async ({ where }: any) => users[where.id] ?? null) },
      block: {
        ...tx.block,
        findUnique: vi.fn(async () => blocks[0] ?? null),
        findMany: vi.fn(async () => []),
      },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
      __tx: tx,
    };
    service = new BlocksService(prisma);
  });

  it('blocks a user, hides the blocker’s conversation and audits it', async () => {
    const result = await service.block(STUDENT, EMPLOYER);
    expect(result.userId).toBe(EMPLOYER);
    expect(
      prisma.__tx.conversationParticipant.updateMany.mock.calls[0][0].data.hiddenAt,
    ).toBeInstanceOf(Date);
    expect(prisma.__tx.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('blocking twice changes nothing', async () => {
    await service.block(STUDENT, EMPLOYER);
    await service.block(STUDENT, EMPLOYER);
    expect(prisma.__tx.block.create).toHaveBeenCalledTimes(1);
  });

  it('refuses a student blocking their own institution’s advisor with 422', async () => {
    await expect(service.block(STUDENT, ADVISOR)).rejects.toMatchObject({
      status: 422,
      response: { reasonCode: 'CANNOT_BLOCK_ADVISOR' },
    });
    expect(prisma.__tx.block.create).not.toHaveBeenCalled();
  });

  it('lets a student block an advisor from a different institution', async () => {
    users[ADVISOR] = { ...users[ADVISOR], institutionId: 'other' };
    await expect(service.block(STUDENT, ADVISOR)).resolves.toMatchObject({ userId: ADVISOR });
  });

  it('cannot block yourself or a missing user', async () => {
    await expect(service.block(STUDENT, STUDENT)).rejects.toMatchObject({ status: 404 });
    await expect(service.block(STUDENT, 'missing')).rejects.toMatchObject({ status: 404 });
  });

  it('unblocking shows the conversation again', async () => {
    await service.block(STUDENT, EMPLOYER);
    await service.unblock(STUDENT, EMPLOYER);
    const calls = prisma.__tx.conversationParticipant.updateMany.mock.calls;
    expect(calls.at(-1)[0].data).toEqual({ hiddenAt: null });
  });
});

describe('MessageReportsService (Th6-427)', () => {
  let prisma: any;
  let service: MessageReportsService;
  let reports: any[];
  let holds: any[];
  let thread: any[];

  beforeEach(() => {
    reports = [];
    holds = [];
    thread = Array.from({ length: 25 }, (_, i) => ({
      id: i === 12 ? MESSAGE : `msg-${i}`,
      conversationId: CONV,
      senderId: i % 2 ? STUDENT : EMPLOYER,
      body: `body ${i}`,
      createdAt: new Date(Date.UTC(2026, 8, 25, 10, i)),
      deletedAt: i === 11 ? new Date() : null,
      moderationStatus: 'NONE',
    }));
    const ledger = withIdempotencyLedger({
      message: {
        findUnique: vi.fn(async ({ where }: any) => thread.find((m) => m.id === where.id) ?? null),
        findMany: vi.fn(async () => thread),
        update: vi.fn(async ({ data }: any) => Object.assign(thread[12]!, data)),
      },
      conversationParticipant: {
        findUnique: vi.fn(async ({ where }: any) =>
          where.conversationId_userId.userId === 'stranger'
            ? null
            : { userId: where.conversationId_userId.userId },
        ),
      },
      report: {
        findUnique: vi.fn(async () => reports[0] ?? null),
        create: vi.fn(async ({ data }: any) => {
          const row = { id: REPORT, status: 'OPEN', createdAt: new Date(), ...data };
          reports.push(row);
          return row;
        }),
      },
      moderationHold: { create: vi.fn(async ({ data }: any) => holds.push(data)) },
    });
    prisma = ledger.prisma;
    service = new MessageReportsService(prisma, ledger.idempotency);
  });

  // The reported message (index 12) is sent by EMPLOYER (even index), so the student reports it.
  const body = { targetType: 'MESSAGE' as const, targetId: MESSAGE, reason: 'SCAM' as const };

  it('stores the report, a hold with 10 messages of context each side, and marks the message', async () => {
    const report = await service.create(STUDENT, { key: 'r1', body });
    expect(report).toMatchObject({ id: REPORT, targetType: 'MESSAGE', alreadyReported: false });
    const snapshot = holds[0].snapshot;
    expect(snapshot.messages).toHaveLength(21);
    expect(snapshot.messages.map((m: any) => m.id)).toContain(MESSAGE);
    // a soft-deleted neighbour is kept in the evidence
    expect(snapshot.messages.find((m: any) => m.id === 'msg-11').deletedAt).not.toBeNull();
    expect(holds[0].heldUntil.getTime()).toBeGreaterThan(Date.now());
    expect(thread[12].moderationStatus).toBe('REPORTED');
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('ignores a duplicate report by the same person', async () => {
    const first = await service.create(STUDENT, { key: 'r1', body });
    const second = await service.create(STUDENT, { key: 'r2', body });
    expect(second.id).toBe(first.id);
    expect(second.alreadyReported).toBe(true);
    expect(reports).toHaveLength(1);
    expect(holds).toHaveLength(1);
  });

  it('answers 404 for someone outside the conversation and 422 for reporting yourself', async () => {
    await expect(service.create('stranger', { key: 'r3', body })).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.create(EMPLOYER, { key: 'r4', body })).rejects.toMatchObject({
      status: 422,
    });
    expect(reports).toHaveLength(0);
  });
});

describe('AdminConversationService (Th6-430)', () => {
  let prisma: any;
  let service: AdminConversationService;
  let reportRow: any;
  let hold: any;

  beforeEach(() => {
    reportRow = { id: REPORT, targetType: 'MESSAGE', targetId: MESSAGE, reason: 'SCAM' };
    hold = { releasedAt: null };
    prisma = {
      report: { findUnique: vi.fn(async () => reportRow) },
      message: {
        findUnique: vi.fn(async () => ({ id: MESSAGE, conversationId: CONV })),
        findMany: vi.fn(async () => [
          {
            id: 'a',
            conversationId: CONV,
            senderId: EMPLOYER,
            body: 'before',
            createdAt: new Date(1),
            deletedAt: null,
          },
          {
            id: MESSAGE,
            conversationId: CONV,
            senderId: EMPLOYER,
            body: 'reported text',
            createdAt: new Date(2),
            deletedAt: new Date(3),
          },
        ]),
      },
      moderationHold: { findUnique: vi.fn(async () => hold) },
      conversationParticipant: {
        findMany: vi.fn(async () => [
          {
            userId: EMPLOYER,
            role: 'EMPLOYER',
            user: { fullName: 'Erin', company: { name: 'Co' }, institution: null },
          },
          {
            userId: STUDENT,
            role: 'STUDENT',
            user: { fullName: 'Sam', company: null, institution: null },
          },
        ]),
      },
      auditLog: { create: vi.fn(async () => ({})) },
    };
    service = new AdminConversationService(prisma);
  });

  it('refuses when the report does not exist or does not point at a message', async () => {
    prisma.report.findUnique.mockResolvedValue(null);
    await expect(
      service.view(ADMIN, REPORT, { reason: 'Investigating a report' }),
    ).rejects.toMatchObject({ status: 403 });
    prisma.report.findUnique.mockResolvedValue({ ...reportRow, targetType: 'JOB' });
    await expect(
      service.view(ADMIN, REPORT, { reason: 'Investigating a report' }),
    ).rejects.toMatchObject({ status: 403 });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('writes exactly one audit row per access, with the reason', async () => {
    await service.view(ADMIN, REPORT, { reason: 'Investigating a scam report' });
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({
      actorId: ADMIN,
      action: 'messaging.conversation.admin_viewed',
      resourceId: CONV,
      metadata: { reportId: REPORT, conversationId: CONV, reason: 'Investigating a scam report' },
    });
  });

  it('is read-only and shows a sender-deleted message while the hold is active', async () => {
    const view = await service.view(ADMIN, REPORT, { reason: 'Investigating a scam report' });
    expect(view.readOnly).toBe(true);
    expect(view.messages.find((m) => m.id === MESSAGE)).toMatchObject({
      reported: true,
      deletedByParticipant: true,
      body: 'reported text',
      senderName: 'Erin',
    });
  });

  it('hides a deleted message’s text once the hold has been released', async () => {
    hold = { releasedAt: new Date() };
    const view = await service.view(ADMIN, REPORT, { reason: 'Investigating a scam report' });
    expect(view.messages.find((m) => m.id === MESSAGE)?.body).toBe('');
  });
});

describe('ModerationRetentionService (Th6-428)', () => {
  let prisma: any;
  let service: ModerationRetentionService;
  let holds: any[];
  let messages: Record<string, any>;

  beforeEach(() => {
    messages = {
      del: { id: 'del', body: 'secret', deletedAt: new Date(), moderationStatus: 'REPORTED' },
      live: { id: 'live', body: 'fine', deletedAt: null, moderationStatus: 'REPORTED' },
    };
    holds = [
      {
        id: 'h1',
        messageId: 'del',
        releasedAt: null,
        heldUntil: new Date('2026-01-01'),
        message: messages.del,
      },
      {
        id: 'h2',
        messageId: 'live',
        releasedAt: null,
        heldUntil: new Date('2026-01-01'),
        message: messages.live,
      },
      {
        id: 'h3',
        messageId: 'live',
        releasedAt: null,
        heldUntil: new Date('2099-01-01'),
        message: messages.live,
      },
    ];
    const tx: any = {
      message: {
        update: vi.fn(async ({ where, data }: any) => Object.assign(messages[where.id], data)),
      },
      moderationHold: {
        update: vi.fn(async ({ where, data }: any) =>
          Object.assign(
            holds.find((h) => h.id === where.id)!,
            data,
          ),
        ),
        count: vi.fn(
          async ({ where }: any) =>
            holds.filter(
              (h) => h.messageId === where.messageId && !h.releasedAt && h.id !== where.id.not,
            ).length,
        ),
      },
      auditLog: { create: vi.fn(async () => ({})) },
    };
    prisma = {
      moderationHold: {
        findMany: vi.fn(async ({ where }: any) =>
          holds.filter((h) => !h.releasedAt && h.heldUntil <= where.heldUntil.lte),
        ),
      },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
      __tx: tx,
    };
    service = new ModerationRetentionService(prisma);
  });

  it('does nothing before the retention period ends', async () => {
    expect(await service.purgeExpired(new Date('2025-01-01'))).toEqual({
      redacted: 0,
      released: 0,
    });
    expect(messages.del.body).toBe('secret');
  });

  it('redacts a deleted message, releases a live one, and leaves later holds alone', async () => {
    const result = await service.purgeExpired(new Date('2026-06-01'));
    expect(result).toEqual({ redacted: 1, released: 2 });
    expect(messages.del.body).toBe(REDACTED_BODY);
    expect(messages.live.body).toBe('fine');
    // 'live' still has hold h3 running, so it stays REPORTED; 'del' has none left.
    expect(messages.live.moderationStatus).toBe('REPORTED');
    expect(messages.del.moderationStatus).toBe('NONE');
    expect(prisma.__tx.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('running it again straight away is a no-op', async () => {
    await service.purgeExpired(new Date('2026-06-01'));
    prisma.__tx.auditLog.create.mockClear();
    expect(await service.purgeExpired(new Date('2026-06-01'))).toEqual({
      redacted: 0,
      released: 0,
    });
    expect(prisma.__tx.auditLog.create).not.toHaveBeenCalled();
  });
});

describe('who may call what', () => {
  it('lets only the four participant roles reach messaging', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, MessagingController) as string[];
    expect([...roles].sort()).toEqual([
      'COMPANY',
      'INSTITUTION_ADMIN',
      'PLACEMENT_STAFF',
      'STUDENT',
    ]);
  });
  it('lets only SUPER_ADMIN read a reported conversation', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminConversationController)).toEqual(['SUPER_ADMIN']);
  });
});
