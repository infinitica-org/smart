/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../generated/prisma/index.js';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { BlocksService } from './blocks.service.js';
import { ContactRulesService } from './contact-rules.service.js';
import { MessageReportsService } from './message-reports.service.js';
import { MessagingService } from './messaging.service.js';
import { ModerationRetentionService } from './moderation-retention.service.js';
import { AdminConversationService } from './admin-conversation.service.js';

/**
 * Runs the raw SQL (search, unread counts, unique keys) against a real Postgres. Opt in with
 *   MESSAGING_IT_DATABASE_URL=postgresql://…  (a database with all migrations applied)
 * It is skipped otherwise, so CI without a database is unaffected.
 */
const URL = process.env.MESSAGING_IT_DATABASE_URL;

describe.skipIf(!URL)('COM-01 messaging against Postgres', () => {
  let db: PrismaClient;
  let messaging: MessagingService;
  let blocks: BlocksService;
  let reports: MessageReportsService;
  let retention: ModerationRetentionService;
  let admin: AdminConversationService;
  const tag = Date.now().toString(36);
  const ids: Record<string, string> = {};
  let key = 0;
  const k = () => `it-${tag}-${++key}`;

  beforeAll(async () => {
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: URL! }) });
    const svc = db as unknown as PrismaService;
    messaging = new MessagingService(svc, new ContactRulesService(svc));
    blocks = new BlocksService(svc);
    reports = new MessageReportsService(svc, new IdempotencyService(svc));
    retention = new ModerationRetentionService(svc);
    admin = new AdminConversationService(svc);

    const plan = await db.subscriptionPlan.upsert({
      where: { code: 'FREE' },
      update: {},
      create: { code: 'FREE', name: 'Free' },
    });
    const institution = await db.institution.create({
      data: { name: `Inst ${tag}`, domain: `inst-${tag}.test`, planId: plan.id },
    });
    const company = await db.company.create({
      data: {
        name: `Co ${tag}`,
        domain: `co-${tag}.test`,
        planId: plan.id,
        verificationStatus: 'APPROVED',
      },
    });
    const mk = (
      name: string,
      role: 'STUDENT' | 'COMPANY' | 'PLACEMENT_STAFF' | 'SUPER_ADMIN',
      extra = {},
    ) =>
      db.user.create({
        data: { email: `${name}-${tag}@x.test`, fullName: name, role, ...extra },
      });
    const student = await mk('Sam Student', 'STUDENT', { institutionId: institution.id });
    const student2 = await mk('Sue Student', 'STUDENT', { institutionId: institution.id });
    const employer = await mk('Erin Employer', 'COMPANY', {
      companyId: company.id,
      companyRole: 'OWNER',
    });
    const advisor = await mk('Adam Advisor', 'PLACEMENT_STAFF', { institutionId: institution.id });
    const superAdmin = await mk('Root Admin', 'SUPER_ADMIN');
    Object.assign(ids, {
      student: student.id,
      student2: student2.id,
      employer: employer.id,
      advisor: advisor.id,
      admin: superAdmin.id,
      company: company.id,
    });
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  it('starts a conversation; a retry with the same key stores one message and one notification', async () => {
    const key1 = k();
    const first = await messaging.start(ids.employer!, {
      key: key1,
      body: { recipientId: ids.student!, body: 'Hello Sam, we liked your profile' },
    });
    const retry = await messaging.start(ids.employer!, {
      key: key1,
      body: { recipientId: ids.student!, body: 'Hello Sam, we liked your profile' },
    });
    expect(retry.message.id).toBe(first.message.id);
    expect(await db.message.count({ where: { conversationId: first.conversationId } })).toBe(1);
    expect(await db.notification.count({ where: { userId: ids.student!, kind: 'MESSAGE' } })).toBe(
      1,
    );
    ids.conv = first.conversationId;
  });

  it('reuses the conversation for the same pair', async () => {
    const again = await messaging.start(ids.employer!, {
      key: k(),
      body: { recipientId: ids.student!, body: 'Are you free on Monday?' },
    });
    expect(again.conversationId).toBe(ids.conv);
  });

  it('counts unread for the recipient only, and opening the thread resets it', async () => {
    expect((await messaging.unreadCount(ids.employer!)).count).toBe(0);
    const studentSeen = (await messaging.listConversations(ids.student!, { limit: 20 }))
      .conversations[0];
    expect(studentSeen?.unreadCount).toBe(2);
    await messaging.markRead(ids.student!, ids.conv!);
    expect(
      (await messaging.listConversations(ids.student!, { limit: 20 })).conversations[0]
        ?.unreadCount,
    ).toBe(0);
  });

  it('searches only the caller’s own conversations', async () => {
    const mine = await messaging.search(ids.student!, { q: 'Monday', limit: 20 });
    expect(mine.hits.map((h) => h.conversationId)).toEqual([ids.conv]);
    expect(mine.hits[0]?.snippet).toContain('<mark>');
    const stranger = await messaging.search(ids.student2!, { q: 'Monday', limit: 20 });
    expect(stranger.hits).toEqual([]);
  });

  it('pages history backwards without gaps or repeats', async () => {
    for (let i = 0; i < 4; i += 1) {
      await messaging.send(ids.student!, ids.conv!, { key: k(), body: { body: `reply ${i}` } });
    }
    const first = await messaging.listMessages(ids.student!, ids.conv!, { limit: 3 });
    const second = await messaging.listMessages(ids.student!, ids.conv!, {
      limit: 3,
      cursor: first.nextCursor ?? undefined,
    });
    const seen = [...second.messages, ...first.messages].map((m) => m.id);
    expect(new Set(seen).size).toBe(6);
  });

  it('returns 404 for a non-participant', async () => {
    await expect(messaging.listMessages(ids.student2!, ids.conv!, { limit: 10 })).rejects.toThrow(
      /not found/i,
    );
  });

  it('a block stops messages both ways and hides the thread for the blocker', async () => {
    await blocks.block(ids.student!, ids.employer!);
    await expect(
      messaging.send(ids.employer!, ids.conv!, { key: k(), body: { body: 'still there?' } }),
    ).rejects.toMatchObject({ response: { message: "You can't message this user." } });
    await expect(
      messaging.send(ids.student!, ids.conv!, { key: k(), body: { body: 'hi' } }),
    ).rejects.toThrow();
    expect(
      (await messaging.listConversations(ids.student!, { limit: 20 })).conversations,
    ).toHaveLength(0);
    await blocks.unblock(ids.student!, ids.employer!);
    expect(
      (await messaging.listConversations(ids.student!, { limit: 20 })).conversations,
    ).toHaveLength(1);
  });

  it('a student cannot block their own institution’s advisor', async () => {
    await expect(blocks.block(ids.student!, ids.advisor!)).rejects.toMatchObject({
      response: { reasonCode: 'CANNOT_BLOCK_ADVISOR' },
    });
  });

  it('reports a message with context, then a deleted reported message stays visible to moderators only', async () => {
    const thread = await messaging.listMessages(ids.student!, ids.conv!, { limit: 50 });
    const target = thread.messages.find((m) => m.senderId === ids.employer!)!;
    const reportKey = k();
    const body = { targetType: 'MESSAGE' as const, targetId: target.id, reason: 'SCAM' as const };
    const report = await reports.create(ids.student!, { key: reportKey, body });
    const dup = await reports.create(ids.student!, { key: k(), body });
    expect(dup.id).toBe(report.id);
    expect(dup.alreadyReported).toBe(true);
    expect(await db.moderationHold.count({ where: { messageId: target.id } })).toBe(1);

    await messaging.deleteMessage(ids.employer!, ids.conv!, target.id);
    const participantView = await messaging.listMessages(ids.student!, ids.conv!, { limit: 50 });
    expect(participantView.messages.find((m) => m.id === target.id)).toMatchObject({
      deleted: true,
      body: '',
    });

    const view = await admin.view(ids.admin!, report.id, { reason: 'Investigating a scam report' });
    expect(view.readOnly).toBe(true);
    expect(view.messages.find((m) => m.id === target.id)).toMatchObject({
      reported: true,
      deletedByParticipant: true,
    });
    expect(view.messages.find((m) => m.id === target.id)?.body).not.toBe('');
    expect(
      await db.auditLog.count({
        where: { action: 'messaging.conversation.admin_viewed', actorId: ids.admin! },
      }),
    ).toBe(1);

    // Retention: nothing happens early; after the period the deleted message is redacted; a rerun is a no-op.
    expect(await retention.purgeExpired(new Date())).toEqual({ redacted: 0, released: 0 });
    const later = new Date(Date.now() + 200 * 86_400_000);
    expect(await retention.purgeExpired(later)).toEqual({ redacted: 1, released: 1 });
    expect(await retention.purgeExpired(later)).toEqual({ redacted: 0, released: 0 });
    const gone = await db.message.findUnique({ where: { id: target.id } });
    expect(gone?.body).toContain('removed');
  });
  it('an advisor can message a student of their own institution, and the student can reply', async () => {
    const first = await messaging.start(ids.advisor!, {
      key: k(),
      body: { recipientId: ids.student2!, body: 'Please book a career session' },
    });
    const reply = await messaging.send(ids.student2!, first.conversationId, {
      key: k(),
      body: { body: 'Thanks, will do' },
    });
    expect(reply.conversationId).toBe(first.conversationId);
    ids.advisorConv = first.conversationId;
  });

  it('an advisor from another institution is refused (403)', async () => {
    const plan = await db.subscriptionPlan.findFirstOrThrow();
    const otherInst = await db.institution.create({
      data: { name: `Other ${tag}`, domain: `other-${tag}.test`, planId: plan.id },
    });
    const outsider = await db.user.create({
      data: {
        email: `outsider-${tag}@x.test`,
        fullName: 'Olly Outsider',
        role: 'PLACEMENT_STAFF',
        institutionId: otherInst.id,
      },
    });
    await expect(
      messaging.start(outsider.id, {
        key: k(),
        body: { recipientId: ids.student2!, body: 'hello' },
      }),
    ).rejects.toMatchObject({ status: 403, response: { reasonCode: 'ADVISOR_OUT_OF_SCOPE' } });
  });

  it('an unverified company cannot start a conversation, and its existing thread is closed to it too', async () => {
    await db.company.update({
      where: { id: ids.company! },
      data: { verificationStatus: 'PENDING' },
    });
    try {
      await expect(
        messaging.start(ids.employer!, {
          key: k(),
          body: { recipientId: ids.student2!, body: 'hi' },
        }),
      ).rejects.toMatchObject({ status: 403, response: { reasonCode: 'EMPLOYER_NOT_VERIFIED' } });
      await expect(
        messaging.send(ids.employer!, ids.conv!, { key: k(), body: { body: 'still me' } }),
      ).rejects.toMatchObject({ status: 403 });
    } finally {
      await db.company.update({
        where: { id: ids.company! },
        data: { verificationStatus: 'APPROVED' },
      });
    }
  });

  it('muting stops notifications but the messages still count as unread', async () => {
    await messaging.setMuted(ids.student2!, ids.advisorConv!, true);
    const before = await db.notification.count({
      where: { userId: ids.student2!, kind: 'MESSAGE' },
    });
    await messaging.send(ids.advisor!, ids.advisorConv!, {
      key: k(),
      body: { body: 'a muted note' },
    });
    expect(await db.notification.count({ where: { userId: ids.student2!, kind: 'MESSAGE' } })).toBe(
      before,
    );
    const seen = (
      await messaging.listConversations(ids.student2!, { limit: 20 })
    ).conversations.find((c) => c.id === ids.advisorConv!);
    expect(seen).toMatchObject({ muted: true });
    expect(seen?.unreadCount).toBeGreaterThan(0);
  });

  it('counts unread across several conversations and never counts my own messages', async () => {
    await messaging.markRead(ids.student2!, ids.advisorConv!);
    await messaging.send(ids.advisor!, ids.advisorConv!, { key: k(), body: { body: 'one' } });
    await messaging.start(ids.employer!, {
      key: k(),
      body: { recipientId: ids.student2!, body: 'two' },
    });
    await messaging.send(ids.student2!, ids.advisorConv!, {
      key: k(),
      body: { body: 'my own reply' },
    });
    expect((await messaging.unreadCount(ids.student2!)).count).toBe(2);
  });

  it('orders conversations by latest activity', async () => {
    const list = (await messaging.listConversations(ids.student2!, { limit: 20 })).conversations;
    const times = list.map((c) => c.lastMessageAt);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it('a participant who left cannot read what was said afterwards', async () => {
    const before = await messaging.listMessages(ids.student2!, ids.advisorConv!, { limit: 50 });
    await db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: ids.advisorConv!, userId: ids.student2! } },
      data: { leftAt: new Date() },
    });
    await new Promise((resolve) => setTimeout(resolve, 15));
    await db.message.create({
      data: {
        conversationId: ids.advisorConv!,
        senderId: ids.advisor!,
        body: 'after they left',
        idempotencyKey: k(),
      },
    });
    const after = await messaging.listMessages(ids.student2!, ids.advisorConv!, { limit: 50 });
    expect(after.messages.map((m) => m.id)).toEqual(before.messages.map((m) => m.id));
    await expect(
      messaging.send(ids.student2!, ids.advisorConv!, { key: k(), body: { body: 'hello?' } }),
    ).rejects.toMatchObject({ status: 404 });
    expect((await messaging.search(ids.student2!, { q: 'after', limit: 10 })).hits).toEqual([]);
  });

  it('admin access without a report is refused and writes no audit row', async () => {
    const before = await db.auditLog.count({
      where: { action: 'messaging.conversation.admin_viewed' },
    });
    await expect(
      admin.view(ids.admin!, '00000000-0000-4000-8000-000000000000', {
        reason: 'Investigating something',
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      await db.auditLog.count({ where: { action: 'messaging.conversation.admin_viewed' } }),
    ).toBe(before);
  });
});
