import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  MODERATION_CONTEXT_MESSAGES,
  type AdminConversationQuery,
  type AdminConversationView,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

const forbidden = () =>
  new ForbiddenException({
    error: 'forbidden',
    message: 'There is no reported message for you to review here.',
    statusCode: 403,
  });

/**
 * Th6-430 — a moderator reads the conversation a report points at. Read-only, and every read is written
 * to the audit log with the reason the moderator gave.
 */
@Injectable()
export class AdminConversationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async view(
    adminId: string,
    reportId: string,
    query: AdminConversationQuery,
  ): Promise<AdminConversationView> {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report || report.targetType !== 'MESSAGE') throw forbidden();
    const reported = await this.prisma.message.findUnique({ where: { id: report.targetId } });
    if (!reported) throw forbidden();

    const hold = await this.prisma.moderationHold.findUnique({ where: { reportId } });
    const holdActive = hold !== null && hold.releasedAt === null;

    const [all, members] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId: reported.conversationId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.conversationParticipant.findMany({
        where: { conversationId: reported.conversationId },
        select: {
          userId: true,
          role: true,
          user: {
            select: {
              fullName: true,
              company: { select: { name: true } },
              institution: { select: { name: true } },
            },
          },
        },
      }),
    ]);
    const index = all.findIndex((m) => m.id === reported.id);
    const window = all.slice(
      Math.max(0, index - MODERATION_CONTEXT_MESSAGES),
      index + MODERATION_CONTEXT_MESSAGES + 1,
    );
    const names = new Map(members.map((m) => [m.userId, m.user.fullName]));

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'messaging.conversation.admin_viewed',
        resourceType: 'conversation',
        resourceId: reported.conversationId,
        reasonCode: 'MODERATION_REVIEW',
        metadata: {
          reportId,
          conversationId: reported.conversationId,
          reason: query.reason,
          source: 'api',
          at: new Date().toISOString(),
        },
      },
    });

    return {
      reportId,
      conversationId: reported.conversationId,
      reportedMessageId: reported.id,
      reportReason: report.reason,
      participants: members.map((m) => ({
        userId: m.userId,
        name: m.user.fullName,
        role: m.role,
        orgName: m.user.company?.name ?? m.user.institution?.name ?? null,
      })),
      messages: window.map((m) => {
        const deletedByParticipant = m.deletedAt !== null;
        return {
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          senderName: names.get(m.senderId) ?? 'Unknown',
          // A deleted message stays readable only while a moderation hold is preserving it.
          body: deletedByParticipant && !holdActive ? '' : m.body,
          deleted: deletedByParticipant,
          deletedByParticipant,
          reported: m.id === reported.id,
          createdAt: m.createdAt.toISOString(),
        };
      }),
      readOnly: true,
    };
  }
}
