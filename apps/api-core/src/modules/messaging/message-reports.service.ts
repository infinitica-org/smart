import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  MODERATION_CONTEXT_MESSAGES,
  type CreateReportRequest,
  type Report,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { MESSAGE_MODERATION_RETENTION_DAYS } from './messaging.constants.js';

interface ReportRow {
  id: string;
  targetId: string;
  reason: CreateReportRequest['reason'];
  status: Report['status'];
  createdAt: Date;
}

function toReport(row: ReportRow, alreadyReported: boolean): Report {
  return {
    id: row.id,
    targetType: 'MESSAGE',
    targetId: row.targetId,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    alreadyReported,
  };
}

const notFound = () =>
  new NotFoundException({ error: 'not_found', message: 'Message not found.', statusCode: 404 });

/**
 * Th6-427/428 — reporting a message. The report snapshots the message with the messages around it and
 * places a moderation hold, so moderators still see it if the sender deletes it afterwards.
 */
@Injectable()
export class MessageReportsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
  ) {}

  async create(
    reporterId: string,
    params: { key: string; body: CreateReportRequest },
  ): Promise<Report> {
    const message = await this.prisma.message.findUnique({ where: { id: params.body.targetId } });
    // Only a participant can see a message, so a stranger's report is indistinguishable from a bad id.
    const member = message
      ? await this.prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: { conversationId: message.conversationId, userId: reporterId },
          },
        })
      : null;
    if (!message || !member) throw notFound();
    if (message.senderId === reporterId) {
      throw new UnprocessableEntityException({
        error: 'validation_failed',
        message: "You can't report your own message.",
        statusCode: 422,
      });
    }

    return this.idempotency.run({
      userId: reporterId,
      scope: 'messaging.reports.create',
      key: params.key,
      request: params.body,
      execute: async (tx) => {
        const existing = await tx.report.findUnique({
          where: {
            reporterId_targetType_targetId: {
              reporterId,
              targetType: 'MESSAGE',
              targetId: message.id,
            },
          },
        });
        if (existing) return { result: toReport(existing, true) };

        const report = await tx.report.create({
          data: {
            reporterId,
            targetType: 'MESSAGE',
            targetId: message.id,
            reason: params.body.reason,
            details: params.body.details ?? null,
          },
        });

        // Context: the reported message and the messages on either side, deleted ones included.
        const around = await tx.message.findMany({
          where: { conversationId: message.conversationId },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
        const index = around.findIndex((m) => m.id === message.id);
        const context = around.slice(
          Math.max(0, index - MODERATION_CONTEXT_MESSAGES),
          index + MODERATION_CONTEXT_MESSAGES + 1,
        );
        await tx.moderationHold.create({
          data: {
            messageId: message.id,
            reportId: report.id,
            snapshot: {
              reportedMessageId: message.id,
              conversationId: message.conversationId,
              messages: context.map((m) => ({
                id: m.id,
                senderId: m.senderId,
                body: m.body,
                createdAt: m.createdAt.toISOString(),
                deletedAt: m.deletedAt?.toISOString() ?? null,
              })),
            },
            heldUntil: new Date(Date.now() + MESSAGE_MODERATION_RETENTION_DAYS * 86_400_000),
          },
        });
        await tx.message.update({
          where: { id: message.id },
          data: { moderationStatus: 'REPORTED' },
        });
        await tx.auditLog.create({
          data: {
            actorId: reporterId,
            action: 'messaging.message.reported',
            resourceType: 'message',
            resourceId: message.id,
            reasonCode: params.body.reason,
            metadata: {
              reportId: report.id,
              conversationId: message.conversationId,
              source: 'api',
              prior: { moderationStatus: message.moderationStatus },
              next: { moderationStatus: 'REPORTED' },
            },
          },
        });
        return { result: toReport(report, false) };
      },
    });
  }
}
