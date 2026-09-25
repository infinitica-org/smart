import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { MODERATION_PURGE_BATCH_SIZE, REDACTED_BODY } from './messaging.constants.js';

export interface PurgeResult {
  readonly redacted: number;
  readonly released: number;
}

/**
 * Th6-428 — ends moderation holds whose retention period has passed.
 *  - a message the sender deleted is redacted (its text removed), because nothing justifies keeping it;
 *  - a message that is still live keeps its text and simply stops being held.
 * Only unreleased holds are read, so running it again straight away finds nothing to do.
 */
@Injectable()
export class ModerationRetentionService {
  private readonly logger = new Logger(ModerationRetentionService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async purgeExpired(now: Date = new Date()): Promise<PurgeResult> {
    let redacted = 0;
    let released = 0;
    for (;;) {
      const holds = await this.prisma.moderationHold.findMany({
        where: { releasedAt: null, heldUntil: { lte: now } },
        include: { message: { select: { id: true, deletedAt: true } } },
        take: MODERATION_PURGE_BATCH_SIZE,
      });
      if (holds.length === 0) break;

      let batchRedacted = 0;
      await this.prisma.$transaction(async (tx) => {
        for (const hold of holds) {
          const deleted = hold.message.deletedAt !== null;
          if (deleted) {
            await tx.message.update({
              where: { id: hold.messageId },
              data: { body: REDACTED_BODY },
            });
            batchRedacted += 1;
          }
          await tx.moderationHold.update({
            where: { id: hold.id },
            // The snapshot copies message text too, so it goes with the redaction.
            data: { releasedAt: now, ...(deleted ? { snapshot: { redacted: true } } : {}) },
          });
          const stillHeld = await tx.moderationHold.count({
            where: { messageId: hold.messageId, releasedAt: null, id: { not: hold.id } },
          });
          if (stillHeld === 0) {
            await tx.message.update({
              where: { id: hold.messageId },
              data: { moderationStatus: 'NONE' },
            });
          }
        }
        await tx.auditLog.create({
          data: {
            actorId: null,
            action: 'messaging.moderation.purged',
            resourceType: 'moderation_hold',
            resourceId: null,
            reasonCode: 'RETENTION_EXPIRED',
            metadata: {
              source: 'retention_job',
              holds: holds.length,
              redacted: batchRedacted,
              released: holds.length,
            },
          },
        });
      });
      redacted += batchRedacted;
      released += holds.length;
    }
    if (released > 0) {
      this.logger.log(
        `Moderation retention: released ${released} hold(s), redacted ${redacted} message(s)`,
      );
    }
    return { redacted, released };
  }
}
