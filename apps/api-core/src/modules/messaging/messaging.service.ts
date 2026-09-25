import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  type ConversationCounterpart,
  type ConversationSummary,
  type ListConversationsQuery,
  type ListConversationsResponse,
  type ListMessagesQuery,
  type ListMessagesResponse,
  type MarkReadResponse,
  type Message,
  type MessageSearchHit,
  type MuteConversationResponse,
  type SearchMessagesQuery,
  type SearchMessagesResponse,
  type SendMessageRequest,
  type SendMessageResponse,
  type StartConversationRequest,
  type UnreadCountResponse,
  type DeleteMessageResponse,
} from '@smart/contracts';
import { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { requireCompanyActor } from '../company-profile/company-access.js';
import {
  ContactRulesService,
  participantRoleOf,
  refusal,
  type MessagingUser,
} from './contact-rules.service.js';
import { UNREAD_CACHE_TTL_MS } from './messaging.constants.js';

interface MessageRow {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export function pairKeyOf(a: string, b: string): string {
  return [a, b].sort().join(':');
}

export function encodeCursor(at: Date, id: string): string {
  return Buffer.from(`${at.toISOString()}|${id}`).toString('base64url');
}

export function decodeCursor(cursor: string | undefined): { at: Date; id: string } | null {
  if (!cursor) return null;
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const at = new Date(iso ?? '');
  return id && !Number.isNaN(at.getTime()) ? { at, id } : null;
}

export function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    body: row.deletedAt ? '' : row.body,
    deleted: row.deletedAt !== null,
    createdAt: row.createdAt.toISOString(),
  };
}

const NOTIFICATION_PREVIEW_LENGTH = 140;

/** Th6-422/424/425/426 — conversations, messages, unread counts and search. */
@Injectable()
export class MessagingService {
  private readonly unreadCache = new Map<string, { count: number; expiresAt: number }>();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ContactRulesService) private readonly rules: ContactRulesService,
  ) {}

  /* ----------------------------------- Th6-422 ----------------------------------- */

  private async resolveRecipientId(
    sender: MessagingUser,
    body: StartConversationRequest,
  ): Promise<string> {
    if (body.recipientId) return body.recipientId;
    // An employer names the applicant; the student's user id is resolved inside their own company.
    const actor = await requireCompanyActor(this.prisma, sender.id, 'company.applicants.manage');
    const application = await this.prisma.application.findFirst({
      where: { id: body.applicationId, opening: { companyId: actor.companyId } },
      select: { studentId: true },
    });
    if (!application) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Applicant not found.',
        statusCode: 404,
      });
    }
    return application.studentId;
  }

  private async findByKey(senderId: string, key: string) {
    return this.prisma.message.findUnique({
      where: { senderId_idempotencyKey: { senderId, idempotencyKey: key } },
    });
  }

  async start(
    userId: string,
    params: { key: string; body: StartConversationRequest },
  ): Promise<SendMessageResponse> {
    const replay = await this.findByKey(userId, params.key);
    if (replay) return { conversationId: replay.conversationId, message: toMessage(replay) };

    const sender = await this.rules.loadUser(userId);
    if (!sender) throw ContactRulesService.notFound();
    const recipientId = await this.resolveRecipientId(sender, params.body);
    const recipient = await this.rules.loadUser(recipientId);
    if (!recipient) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'User not found.',
        statusCode: 404,
      });
    }

    const pairKey = pairKeyOf(userId, recipientId);
    let conversation = await this.prisma.conversation.findUnique({ where: { pairKey } });
    const decision = await this.rules.canStart(sender, recipient, {
      existing: conversation !== null,
    });
    if (!decision.allowed) throw refusal(decision);

    if (!conversation) {
      try {
        conversation = await this.prisma.conversation.create({
          data: {
            pairKey,
            participants: {
              create: [await this.participantData(sender), await this.participantData(recipient)],
            },
          },
        });
      } catch (error) {
        // Two first messages raced: the other request created the conversation, so use it.
        if ((error as { code?: string }).code !== 'P2002') throw error;
        conversation = await this.prisma.conversation.findUnique({ where: { pairKey } });
        if (!conversation) throw error;
      }
    }
    const message = await this.persist({
      conversationId: conversation.id,
      sender,
      recipientId,
      body: params.body.body,
      key: params.key,
    });
    return { conversationId: conversation.id, message };
  }

  private async participantData(user: MessagingUser) {
    return {
      userId: user.id,
      role: participantRoleOf(user.role) ?? 'STUDENT',
      orgId: user.companyId ?? user.institutionId ?? null,
    };
  }

  async send(
    userId: string,
    conversationId: string,
    params: { key: string; body: SendMessageRequest },
  ): Promise<SendMessageResponse> {
    const mine = await this.activeParticipant(userId, conversationId);
    const replay = await this.findByKey(userId, params.key);
    if (replay) return { conversationId, message: toMessage(replay) };

    const other = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
    });
    const [sender, recipient] = await Promise.all([
      this.rules.loadUser(mine.userId),
      other ? this.rules.loadUser(other.userId) : null,
    ]);
    if (!sender || !recipient) throw ContactRulesService.notFound();
    const decision = await this.rules.canSend(sender, recipient);
    if (!decision.allowed) throw refusal(decision);

    const message = await this.persist({
      conversationId,
      sender,
      recipientId: recipient.id,
      body: params.body.body,
      key: params.key,
    });
    return { conversationId, message };
  }

  /** Writes the message and its single in-app notification; a retried key never reaches this. */
  private async persist(params: {
    conversationId: string;
    sender: MessagingUser;
    recipientId: string;
    body: string;
    key: string;
  }): Promise<Message> {
    const { conversationId, sender, recipientId, body, key } = params;
    const [recipientPart, senderRow] = await Promise.all([
      this.prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: recipientId } },
        select: { mutedAt: true },
      }),
      this.prisma.user.findUnique({ where: { id: sender.id }, select: { fullName: true } }),
    ]);
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const row = await tx.message.create({
          data: { conversationId, senderId: sender.id, body, idempotencyKey: key },
        });
        await tx.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: row.createdAt },
        });
        if (!recipientPart?.mutedAt) {
          await tx.notification.create({
            data: {
              userId: recipientId,
              kind: 'MESSAGE',
              title: `New message from ${senderRow?.fullName ?? 'someone'}`,
              body: body.slice(0, NOTIFICATION_PREVIEW_LENGTH),
              linkUrl: `/messages?conversation=${conversationId}`,
              dedupeKey: `message:${row.id}`,
            },
          });
        }
        return row;
      });
      this.unreadCache.delete(recipientId);
      return toMessage(created);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        const raced = await this.findByKey(sender.id, key);
        if (raced) return toMessage(raced);
      }
      throw error;
    }
  }

  /* ----------------------------------- Th6-424 ----------------------------------- */

  /** The caller's participant row, or 404: someone else's conversation looks like it does not exist. */
  private async participantRow(userId: string, conversationId: string) {
    const row = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!row) throw ContactRulesService.notFound();
    return row;
  }

  /** Someone who has left may read up to when they left, but not send. */
  private async activeParticipant(userId: string, conversationId: string) {
    const row = await this.participantRow(userId, conversationId);
    if (row.leftAt) throw ContactRulesService.notFound();
    return row;
  }

  async listMessages(
    userId: string,
    conversationId: string,
    query: ListMessagesQuery,
  ): Promise<ListMessagesResponse> {
    const mine = await this.participantRow(userId, conversationId);
    const cursor = decodeCursor(query.cursor);
    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(mine.leftAt ? { createdAt: { lte: mine.leftAt } } : {}),
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.at } },
                { createdAt: cursor.at, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const oldest = page.at(-1);
    return {
      messages: page.map(toMessage).reverse(),
      nextCursor:
        rows.length > query.limit && oldest ? encodeCursor(oldest.createdAt, oldest.id) : null,
    };
  }

  private async counterpartFor(conversationIds: string[], me: string) {
    const rows = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: { in: conversationIds }, userId: { not: me } },
      select: {
        conversationId: true,
        role: true,
        user: {
          select: {
            id: true,
            fullName: true,
            company: { select: { name: true } },
            institution: { select: { name: true } },
          },
        },
      },
    });
    const byConversation = new Map<string, ConversationCounterpart>();
    for (const row of rows) {
      byConversation.set(row.conversationId, {
        userId: row.user.id,
        name: row.user.fullName,
        role: row.role,
        orgName: row.user.company?.name ?? row.user.institution?.name ?? null,
        // TODO: signed photo URLs are minted per request elsewhere; messaging shows initials for now.
        avatarUrl: null,
      });
    }
    return byConversation;
  }

  async listConversations(
    userId: string,
    query: ListConversationsQuery,
  ): Promise<ListConversationsResponse> {
    const mine = await this.prisma.conversationParticipant.findMany({
      where: { userId, hiddenAt: null },
      select: { conversationId: true, mutedAt: true, leftAt: true },
    });
    const mineById = new Map(mine.map((row) => [row.conversationId, row]));
    const cursor = decodeCursor(query.cursor);
    const conversations = await this.prisma.conversation.findMany({
      where: {
        id: { in: [...mineById.keys()] },
        ...(cursor
          ? {
              OR: [
                { lastMessageAt: { lt: cursor.at } },
                { lastMessageAt: cursor.at, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = conversations.slice(0, query.limit);
    if (page.length === 0) return { conversations: [], nextCursor: null };
    const ids = page.map((c) => c.id);

    const [counterparts, latest, unread, blocks] = await Promise.all([
      this.counterpartFor(ids, userId),
      this.prisma.message.findMany({
        where: { conversationId: { in: ids }, deletedAt: null },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        distinct: ['conversationId'],
      }),
      this.unreadByConversation(userId),
      this.prisma.block.findMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
        select: { blockerId: true, blockedId: true },
      }),
    ]);
    const blockedIds = new Set(blocks.flatMap((b) => [b.blockerId, b.blockedId]));
    const latestBy = new Map(latest.map((m) => [m.conversationId, m]));

    const summaries: ConversationSummary[] = [];
    for (const conversation of page) {
      const counterpart = counterparts.get(conversation.id);
      const membership = mineById.get(conversation.id);
      if (!counterpart || !membership) continue;
      const last = latestBy.get(conversation.id);
      const visible =
        last && (!membership.leftAt || last.createdAt <= membership.leftAt) ? last : null;
      summaries.push({
        id: conversation.id,
        counterpart,
        lastMessage: visible
          ? {
              body: visible.body,
              senderId: visible.senderId,
              createdAt: visible.createdAt.toISOString(),
            }
          : null,
        lastMessageAt: conversation.lastMessageAt.toISOString(),
        unreadCount: unread.get(conversation.id) ?? 0,
        muted: membership.mutedAt !== null,
        canSend: !membership.leftAt && !blockedIds.has(counterpart.userId),
      });
    }
    const last = page.at(-1);
    return {
      conversations: summaries,
      nextCursor:
        conversations.length > query.limit && last
          ? encodeCursor(last.lastMessageAt, last.id)
          : null,
    };
  }

  /* ----------------------------------- Th6-426 ----------------------------------- */

  /** Unread = not mine, not deleted, newer than my lastReadAt, inside a conversation I can still see. */
  private async unreadByConversation(userId: string): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRaw<
      { conversation_id: string; n: bigint | number }[]
    >(Prisma.sql`
      SELECT m.conversation_id, COUNT(*) AS n
      FROM messages m
      JOIN conversation_participants p
        ON p.conversation_id = m.conversation_id AND p.user_id = ${userId}::uuid
      WHERE m.sender_id <> ${userId}::uuid
        AND m.deleted_at IS NULL
        AND p.hidden_at IS NULL
        AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)
        AND (p.left_at IS NULL OR m.created_at <= p.left_at)
      GROUP BY m.conversation_id`);
    return new Map(rows.map((row) => [row.conversation_id, Number(row.n)]));
  }

  async unreadCount(userId: string): Promise<UnreadCountResponse> {
    const cached = this.unreadCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return { count: cached.count };
    let count = 0;
    for (const n of (await this.unreadByConversation(userId)).values()) count += n;
    this.unreadCache.set(userId, { count, expiresAt: Date.now() + UNREAD_CACHE_TTL_MS });
    return { count };
  }

  async markRead(userId: string, conversationId: string): Promise<MarkReadResponse> {
    await this.participantRow(userId, conversationId);
    const now = new Date();
    // Only ever moves forward, so a late retry cannot un-read newer messages.
    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
        OR: [{ lastReadAt: null }, { lastReadAt: { lt: now } }],
      },
      data: { lastReadAt: now },
    });
    this.unreadCache.delete(userId);
    const row = await this.participantRow(userId, conversationId);
    return { conversationId, lastReadAt: (row.lastReadAt ?? now).toISOString() };
  }

  async setMuted(
    userId: string,
    conversationId: string,
    muted: boolean,
  ): Promise<MuteConversationResponse> {
    await this.participantRow(userId, conversationId);
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { mutedAt: muted ? new Date() : null },
    });
    return { conversationId, muted };
  }

  /* ----------------------------------- Th6-425 ----------------------------------- */

  async search(userId: string, query: SearchMessagesQuery): Promise<SearchMessagesResponse> {
    const cursor = decodeCursor(query.cursor);
    const after = cursor
      ? Prisma.sql`AND (m.created_at, m.id) < (${cursor.at}::timestamptz, ${cursor.id}::uuid)`
      : Prisma.empty;
    // Always joined to the caller's own participant rows: there is no way to search anyone else's.
    const rows = await this.prisma.$queryRaw<
      { id: string; conversation_id: string; created_at: Date; snippet: string }[]
    >(Prisma.sql`
      SELECT m.id, m.conversation_id, m.created_at,
        ts_headline('simple', m.body, plainto_tsquery('simple', ${query.q}),
          'StartSel=<mark>,StopSel=</mark>,MaxWords=24,MinWords=6') AS snippet
      FROM messages m
      JOIN conversation_participants p
        ON p.conversation_id = m.conversation_id AND p.user_id = ${userId}::uuid
      WHERE m.search_vector @@ plainto_tsquery('simple', ${query.q})
        AND m.deleted_at IS NULL
        AND p.hidden_at IS NULL
        AND (p.left_at IS NULL OR m.created_at <= p.left_at)
        ${after}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${query.limit + 1}`);
    const page = rows.slice(0, query.limit);
    if (page.length === 0) return { hits: [], nextCursor: null };
    const names = await this.counterpartFor(
      [...new Set(page.map((r) => r.conversation_id))],
      userId,
    );
    const hits: MessageSearchHit[] = page.map((row) => ({
      messageId: row.id,
      conversationId: row.conversation_id,
      snippet: row.snippet,
      counterpartName: names.get(row.conversation_id)?.name ?? 'Unknown',
      createdAt: row.created_at.toISOString(),
    }));
    const last = page.at(-1);
    return {
      hits,
      nextCursor: rows.length > query.limit && last ? encodeCursor(last.created_at, last.id) : null,
    };
  }

  /* ----------------------------------- Th6-428 ----------------------------------- */

  /**
   * The sender deletes their own message. It disappears for both participants at once; if it was
   * reported, the moderation hold still keeps it for moderators until the retention period ends.
   */
  async deleteMessage(
    userId: string,
    conversationId: string,
    messageId: string,
  ): Promise<DeleteMessageResponse> {
    await this.activeParticipant(userId, conversationId);
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId, senderId: userId },
    });
    if (!message) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Message not found.',
        statusCode: 404,
      });
    }
    if (!message.deletedAt) {
      const now = new Date();
      await this.prisma.$transaction(async (tx) => {
        await tx.message.update({
          where: { id: messageId },
          data: { deletedAt: now, deletedBy: userId },
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'messaging.message.deleted',
            resourceType: 'message',
            resourceId: messageId,
            metadata: {
              conversationId,
              source: 'api',
              prior: { deleted: false },
              next: { deleted: true },
              moderationStatus: message.moderationStatus,
            },
          },
        });
      });
      this.unreadCache.clear();
    }
    return { messageId, deleted: true };
  }
}
