import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContactRulesService } from './contact-rules.service.js';
import { MessagingService, decodeCursor, encodeCursor, pairKeyOf } from './messaging.service.js';

const EMPLOYER = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';
const STRANGER = '33333333-3333-4333-8333-333333333333';
const CONV = '44444444-4444-4444-8444-444444444444';

const employerUser = {
  id: EMPLOYER,
  role: 'COMPANY',
  institutionId: null,
  companyId: 'c',
  deactivatedAt: null,
};
const studentUser = {
  id: STUDENT,
  role: 'STUDENT',
  institutionId: 'i',
  companyId: null,
  deactivatedAt: null,
};

describe('MessagingService (Th6-422/424/425/426)', () => {
  let prisma: any;
  let rules: any;
  let service: MessagingService;
  let messages: any[];
  let notifications: any[];
  let participants: Record<string, any>;
  let existingConversation: { id: string } | null;
  let unreadRows: { conversation_id: string; n: number }[];

  beforeEach(() => {
    messages = [];
    notifications = [];
    existingConversation = null;
    unreadRows = [];
    participants = {
      [`${CONV}:${EMPLOYER}`]: {
        userId: EMPLOYER,
        conversationId: CONV,
        leftAt: null,
        mutedAt: null,
      },
      [`${CONV}:${STUDENT}`]: {
        userId: STUDENT,
        conversationId: CONV,
        leftAt: null,
        mutedAt: null,
      },
    };
    const tx: any = {
      message: {
        create: vi.fn(async ({ data }: any) => {
          const row = {
            id: `m${messages.length + 1}`,
            createdAt: new Date(Date.UTC(2026, 8, 25, 10, messages.length)),
            deletedAt: null,
            ...data,
          };
          messages.push(row);
          return row;
        }),
        update: vi.fn(async ({ where, data }: any) =>
          Object.assign(
            messages.find((m) => m.id === where.id),
            data,
          ),
        ),
      },
      conversation: { update: vi.fn(async () => ({})) },
      notification: { create: vi.fn(async ({ data }: any) => notifications.push(data)) },
      auditLog: { create: vi.fn(async () => ({})) },
    };
    prisma = {
      ...tx,
      $transaction: vi.fn(async (fn: any) => fn(tx)),
      $queryRaw: vi.fn(async () => unreadRows),
      message: {
        ...tx.message,
        findUnique: vi.fn(
          async ({ where }: any) =>
            messages.find(
              (m) =>
                m.senderId === where.senderId_idempotencyKey.senderId &&
                m.idempotencyKey === where.senderId_idempotencyKey.idempotencyKey,
            ) ?? null,
        ),
        findFirst: vi.fn(
          async ({ where }: any) =>
            messages.find((m) => m.id === where.id && m.senderId === where.senderId) ?? null,
        ),
        findMany: vi.fn(async () => []),
      },
      user: {
        findUnique: vi.fn(async () => ({
          fullName: 'Erin Employer',
          role: 'COMPANY',
          companyId: 'c',
          companyRole: 'OWNER',
          deactivatedAt: null,
        })),
      },
      application: { findFirst: vi.fn(async () => ({ studentId: STUDENT })) },
      conversation: {
        ...tx.conversation,
        findUnique: vi.fn(async () => existingConversation),
        create: vi.fn(async () => ({ id: CONV })),
      },
      conversationParticipant: {
        findUnique: vi.fn(async ({ where }: any) => {
          const key = `${where.conversationId_userId.conversationId}:${where.conversationId_userId.userId}`;
          return participants[key] ?? null;
        }),
        findFirst: vi.fn(
          async ({ where }: any) =>
            Object.values(participants).find(
              (p: any) =>
                p.conversationId === where.conversationId && p.userId !== where.userId.not,
            ) ?? null,
        ),
        update: vi.fn(async () => ({})),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    };
    rules = {
      loadUser: vi.fn(async (id: string) =>
        id === EMPLOYER ? employerUser : id === STUDENT ? studentUser : null,
      ),
      canStart: vi.fn(async () => ({ allowed: true, reasonCode: 'OK', message: '' })),
      canSend: vi.fn(async () => ({ allowed: true, reasonCode: 'OK', message: '' })),
    };
    service = new MessagingService(prisma, rules as ContactRulesService);
  });

  describe('starting a conversation', () => {
    it('creates the conversation with both participants, stores the message and notifies once', async () => {
      const result = await service.start(EMPLOYER, {
        key: 'k1',
        body: { recipientId: STUDENT, body: 'Hello there' },
      });
      expect(result.conversationId).toBe(CONV);
      expect(result.message).toMatchObject({
        body: 'Hello there',
        senderId: EMPLOYER,
        deleted: false,
      });
      expect(prisma.conversation.create).toHaveBeenCalledTimes(1);
      const created = prisma.conversation.create.mock.calls[0][0].data;
      expect(created.pairKey).toBe(pairKeyOf(EMPLOYER, STUDENT));
      expect(created.participants.create).toHaveLength(2);
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({ userId: STUDENT, kind: 'MESSAGE' });
    });

    it('reuses the existing conversation for the same pair', async () => {
      existingConversation = { id: CONV };
      const result = await service.start(EMPLOYER, {
        key: 'k2',
        body: { recipientId: STUDENT, body: 'Again' },
      });
      expect(prisma.conversation.create).not.toHaveBeenCalled();
      expect(result.conversationId).toBe(CONV);
      expect(rules.canStart).toHaveBeenCalledWith(employerUser, studentUser, { existing: true });
    });

    it('returns the same message and sends no second notification when the key is retried', async () => {
      const first = await service.start(EMPLOYER, {
        key: 'same',
        body: { recipientId: STUDENT, body: 'Hi' },
      });
      const retry = await service.start(EMPLOYER, {
        key: 'same',
        body: { recipientId: STUDENT, body: 'Hi' },
      });
      expect(retry.message.id).toBe(first.message.id);
      expect(messages).toHaveLength(1);
      expect(notifications).toHaveLength(1);
    });

    it('refuses when the contact rules say no', async () => {
      rules.canStart.mockResolvedValue({
        allowed: false,
        reasonCode: 'EMPLOYER_NOT_VERIFIED',
        message: 'nope',
      });
      await expect(
        service.start(EMPLOYER, { key: 'k3', body: { recipientId: STUDENT, body: 'Hi' } }),
      ).rejects.toMatchObject({ status: 403, response: { reasonCode: 'EMPLOYER_NOT_VERIFIED' } });
      expect(messages).toHaveLength(0);
    });
  });

  describe('starting from an applicant (Th6-422)', () => {
    const APPLICATION = '99999999-9999-4999-8999-999999999999';

    it('resolves the student from the application inside the employer own company', async () => {
      const result = await service.start(EMPLOYER, {
        key: 'app1',
        body: { applicationId: APPLICATION, body: 'Hi from the board' },
      });
      expect(prisma.application.findFirst.mock.calls[0][0].where.opening).toEqual({
        companyId: 'c',
      });
      expect(prisma.conversation.create.mock.calls[0][0].data.pairKey).toBe(
        pairKeyOf(EMPLOYER, STUDENT),
      );
      expect(result.message.body).toBe('Hi from the board');
    });

    it('answers 404 when the application belongs to another company', async () => {
      prisma.application.findFirst.mockResolvedValue(null);
      await expect(
        service.start(EMPLOYER, { key: 'app2', body: { applicationId: APPLICATION, body: 'Hi' } }),
      ).rejects.toMatchObject({ status: 404 });
      expect(messages).toHaveLength(0);
    });
  });

  describe('replying', () => {
    it('stores a reply, and a retried key stores one message and one notification', async () => {
      await service.send(STUDENT, CONV, { key: 'r1', body: { body: 'Sure' } });
      await service.send(STUDENT, CONV, { key: 'r1', body: { body: 'Sure' } });
      expect(messages).toHaveLength(1);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].userId).toBe(EMPLOYER);
    });

    it('answers 404 to someone who is not in the conversation', async () => {
      await expect(
        service.send(STRANGER, CONV, { key: 'x', body: { body: 'hi' } }),
      ).rejects.toMatchObject({
        status: 404,
      });
      await expect(service.listMessages(STRANGER, CONV, { limit: 10 })).rejects.toMatchObject({
        status: 404,
      });
      await expect(service.markRead(STRANGER, CONV)).rejects.toMatchObject({ status: 404 });
    });

    it('does not notify a recipient who muted the conversation, but still stores the message', async () => {
      participants[`${CONV}:${EMPLOYER}`].mutedAt = new Date();
      await service.send(STUDENT, CONV, { key: 'r2', body: { body: 'quiet' } });
      expect(messages).toHaveLength(1);
      expect(notifications).toHaveLength(0);
    });

    it('does not let someone who left send', async () => {
      participants[`${CONV}:${STUDENT}`].leftAt = new Date();
      await expect(
        service.send(STUDENT, CONV, { key: 'r3', body: { body: 'hi' } }),
      ).rejects.toMatchObject({
        status: 404,
      });
    });

    it('is refused by canSend for a blocked pair', async () => {
      rules.canSend.mockResolvedValue({
        allowed: false,
        reasonCode: 'BLOCKED',
        message: "You can't message this user.",
      });
      await expect(
        service.send(STUDENT, CONV, { key: 'r4', body: { body: 'hi' } }),
      ).rejects.toMatchObject({
        status: 403,
        response: { message: "You can't message this user." },
      });
    });
  });

  describe('history (Th6-424)', () => {
    it('limits a participant who left to what was said before they left', async () => {
      const leftAt = new Date('2026-09-20T00:00:00Z');
      participants[`${CONV}:${STUDENT}`].leftAt = leftAt;
      await service.listMessages(STUDENT, CONV, { limit: 10 });
      expect(prisma.message.findMany.mock.calls[0][0].where.createdAt).toEqual({ lte: leftAt });
    });

    it('returns oldest-first inside a page and a cursor when there are more', async () => {
      const rows = [3, 2, 1].map((n) => ({
        id: `m${n}`,
        conversationId: CONV,
        senderId: EMPLOYER,
        body: `b${n}`,
        createdAt: new Date(Date.UTC(2026, 8, 25, 10, n)),
        deletedAt: null,
      }));
      prisma.message.findMany.mockResolvedValue(rows);
      const page = await service.listMessages(STUDENT, CONV, { limit: 2 });
      expect(page.messages.map((m) => m.id)).toEqual(['m2', 'm3']);
      expect(decodeCursor(page.nextCursor ?? undefined)).toMatchObject({ id: 'm2' });
    });

    it('shows a deleted message as an empty tombstone', async () => {
      prisma.message.findMany.mockResolvedValue([
        {
          id: 'm1',
          conversationId: CONV,
          senderId: EMPLOYER,
          body: 'secret',
          createdAt: new Date(),
          deletedAt: new Date(),
        },
      ]);
      const page = await service.listMessages(STUDENT, CONV, { limit: 5 });
      expect(page.messages[0]).toMatchObject({ body: '', deleted: true });
    });

    it('round-trips a cursor', () => {
      const at = new Date('2026-09-25T10:00:00.000Z');
      expect(decodeCursor(encodeCursor(at, 'abc'))).toEqual({ at, id: 'abc' });
      expect(decodeCursor('not-a-cursor')).toBeNull();
    });
  });

  describe('unread count (Th6-426)', () => {
    it('adds up the unread messages across conversations', async () => {
      unreadRows = [
        { conversation_id: 'a', n: 2 },
        { conversation_id: 'b', n: 3 },
      ];
      expect(await service.unreadCount(STUDENT)).toEqual({ count: 5 });
    });

    it('serves a short cache, and marking read invalidates it', async () => {
      unreadRows = [{ conversation_id: CONV, n: 1 }];
      await service.unreadCount(STUDENT);
      await service.unreadCount(STUDENT);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      prisma.conversationParticipant.findUnique.mockResolvedValue({
        ...participants[`${CONV}:${STUDENT}`],
        lastReadAt: new Date(),
      });
      await service.markRead(STUDENT, CONV);
      unreadRows = [];
      expect(await service.unreadCount(STUDENT)).toEqual({ count: 0 });
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('a new message invalidates the recipient’s cached count', async () => {
      unreadRows = [];
      expect(await service.unreadCount(EMPLOYER)).toEqual({ count: 0 });
      await service.send(STUDENT, CONV, { key: 'c1', body: { body: 'hello' } });
      unreadRows = [{ conversation_id: CONV, n: 1 }];
      expect(await service.unreadCount(EMPLOYER)).toEqual({ count: 1 });
    });
  });

  describe('search (Th6-425)', () => {
    it('returns an empty list when nothing matches', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      expect(await service.search(STUDENT, { q: 'nothing', limit: 20 })).toEqual({
        hits: [],
        nextCursor: null,
      });
    });
  });

  describe('deleting (Th6-428)', () => {
    it('lets the sender delete their own message and audits it', async () => {
      await service.send(STUDENT, CONV, { key: 'd1', body: { body: 'oops' } });
      const id = messages[0].id;
      await expect(service.deleteMessage(STUDENT, CONV, id)).resolves.toEqual({
        messageId: id,
        deleted: true,
      });
      expect(messages[0].deletedAt).toBeInstanceOf(Date);
      expect(messages[0].deletedBy).toBe(STUDENT);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('does not let someone delete another person’s message', async () => {
      await service.send(STUDENT, CONV, { key: 'd2', body: { body: 'mine' } });
      await expect(service.deleteMessage(EMPLOYER, CONV, messages[0].id)).rejects.toMatchObject({
        status: 404,
      });
      expect(messages[0].deletedAt).toBeNull();
    });
  });
});
