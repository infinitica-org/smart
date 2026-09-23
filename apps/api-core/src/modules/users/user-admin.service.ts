import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AssignRoleRequest } from '@smart/contracts';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';

type AssignableRole = AssignRoleRequest['role'];

export interface HeldUserDto {
  readonly userId: string;
  readonly heldAt: string | null;
}

@Injectable()
export class UserAdminService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
  ) {}

  async assignRole(
    userId: string,
    role: AssignableRole,
  ): Promise<{ userId: string; role: AssignableRole }> {
    const user = await this.requireUser(userId);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { role },
    });
    return { userId: updated.id, role: updated.role as AssignableRole };
  }

  async holdUser(userId: string, reason: string, actorId: string): Promise<HeldUserDto> {
    const user = await this.requireUser(userId);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { heldAt: new Date(), heldReason: reason },
    });
    await this.auditPublisher.record({
      actorId,
      action: 'user.held',
      resourceType: 'user',
      resourceId: user.id,
      reasonCode: reason,
      metadata: { role: user.role },
    });
    // Held users must lose access immediately, not on their next request's
    // SessionHoldGuard check — an already-issued access token stays valid
    // until it expires otherwise.
    await this.auth.revokeAllForUser(user.id);
    return { userId: updated.id, heldAt: updated.heldAt?.toISOString() ?? null };
  }

  async releaseUser(userId: string, reason: string, actorId: string): Promise<HeldUserDto> {
    const user = await this.requireUser(userId);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { heldAt: null, heldReason: null },
    });
    await this.auditPublisher.record({
      actorId,
      action: 'user.hold_released',
      resourceType: 'user',
      resourceId: user.id,
      reasonCode: reason,
      metadata: { role: user.role },
    });
    return { userId: updated.id, heldAt: null };
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'User not found.',
        statusCode: 404,
      });
    }
    return user;
  }
}
