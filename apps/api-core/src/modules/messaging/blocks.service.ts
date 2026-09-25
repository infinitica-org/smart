import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { BlockedUser, ListBlocksResponse } from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { ADVISOR_ROLES } from './messaging.constants.js';
import { pairKeyOf } from './messaging.service.js';

/** Th6-427 — block and unblock. A block stops new messages both ways and hides the blocker's thread. */
@Injectable()
export class BlocksService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<ListBlocksResponse> {
    const rows = await this.prisma.block.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: 'desc' },
      select: { blockedId: true, createdAt: true, blocked: { select: { fullName: true } } },
    });
    const blocks: BlockedUser[] = rows.map((row) => ({
      userId: row.blockedId,
      name: row.blocked.fullName,
      blockedAt: row.createdAt.toISOString(),
    }));
    return { blocks };
  }

  async block(userId: string, targetId: string): Promise<BlockedUser> {
    const [me, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, institutionId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetId },
        select: { fullName: true, role: true, institutionId: true },
      }),
    ]);
    if (!me || !target || targetId === userId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'User not found.',
        statusCode: 404,
      });
    }
    // Th6-423 — a student can mute their own institution's advisors, but not block them.
    if (
      me.role === 'STUDENT' &&
      ADVISOR_ROLES.includes(target.role as never) &&
      me.institutionId !== null &&
      me.institutionId === target.institutionId
    ) {
      throw new UnprocessableEntityException({
        error: 'cannot_block_advisor',
        message:
          "You can't block your own institution's advisors. You can mute the conversation instead.",
        statusCode: 422,
        reasonCode: 'CANNOT_BLOCK_ADVISOR',
      });
    }
    const existing = await this.prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
    });
    if (existing) {
      return {
        userId: targetId,
        name: target.fullName,
        blockedAt: existing.createdAt.toISOString(),
      };
    }
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.block.create({ data: { blockerId: userId, blockedId: targetId } });
      // Hide the blocker's side of the thread; the blocked user is not told anything.
      await tx.conversationParticipant.updateMany({
        where: { userId, conversation: { pairKey: pairKeyOf(userId, targetId) } },
        data: { hiddenAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'messaging.block.created',
          resourceType: 'user',
          resourceId: targetId,
          metadata: { source: 'api', prior: { blocked: false }, next: { blocked: true } },
        },
      });
      return row;
    });
    return { userId: targetId, name: target.fullName, blockedAt: created.createdAt.toISOString() };
  }

  async unblock(userId: string, targetId: string): Promise<{ userId: string; blocked: false }> {
    const existing = await this.prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
    });
    if (existing) {
      await this.prisma.$transaction(async (tx) => {
        await tx.block.delete({
          where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
        });
        await tx.conversationParticipant.updateMany({
          where: { userId, conversation: { pairKey: pairKeyOf(userId, targetId) } },
          data: { hiddenAt: null },
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'messaging.block.removed',
            resourceType: 'user',
            resourceId: targetId,
            metadata: { source: 'api', prior: { blocked: true }, next: { blocked: false } },
          },
        });
      });
    }
    return { userId: targetId, blocked: false };
  }
}
