import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type {
  ImpersonateRequest,
  SupportDiagnosticResponse,
  SupportGrantRequest,
  SupportGrantResponse,
  SupportHistoryQuery,
  SupportHistoryResponse,
  SupportSessionResponse,
} from '@smart/contracts';
import { SUPPORT_TICKET_ID_REGEX } from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import type { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';
import type { RedisService } from '../../platform/redis/redis.service.js';

interface RedisGrantPayload {
  grantId: string;
  actorId: string;
  actorRole: string;
  targetUserId: string;
  ticketId: string;
  rationale: string;
  expiresAt: string;
}

interface RedisSessionPayload {
  sessionId: string;
  grantId: string;
  actorId: string;
  actorRole: string;
  targetUserId: string;
  ticketId: string;
  expiresAt: string;
}

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditPublisherService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Story 1 — Lookup user by approved identifiers
   */
  async lookupUser(queryStr: string) {
    const trimmed = queryStr.trim();
    if (!trimmed) {
      throw new BadRequestException({
        error: 'invalid_query',
        message: 'Lookup query string cannot be empty.',
        statusCode: 400,
      });
    }

    const lower = trimmed.toLowerCase();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          ...(isUuid ? [{ id: trimmed }, { institutionId: trimmed }, { companyId: trimmed }] : []),
          { email: lower },
          { usernameNormalized: lower },
          { publicProfileSlug: trimmed },
          { fullName: { contains: trimmed, mode: 'insensitive' as const } },
        ],
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        institutionId: true,
        companyId: true,
        publicProfileSlug: true,
        username: true,
        heldAt: true,
        deactivatedAt: true,
      },
      take: 20,
    });

    return users;
  }

  /**
   * Story 3 & 4 & 6 — Create time-boxed support grant
   */
  async createGrant(
    actorId: string,
    actorRole: string,
    dto: SupportGrantRequest,
  ): Promise<SupportGrantResponse> {
    if (!SUPPORT_TICKET_ID_REGEX.test(dto.ticketId)) {
      throw new BadRequestException({
        error: 'invalid_ticket_id',
        message: 'Ticket ID must be 3-64 alphanumeric, hyphen, or underscore characters.',
        statusCode: 400,
      });
    }

    if (!dto.rationale || dto.rationale.trim().length < 8) {
      throw new BadRequestException({
        error: 'invalid_rationale',
        message: 'Rationale must be at least 8 characters long.',
        statusCode: 400,
      });
    }

    const requestedTtl = dto.ttlSeconds ?? 900;
    if (requestedTtl < 60 || requestedTtl > 3600) {
      throw new BadRequestException({
        error: 'invalid_ttl',
        message: 'Grant TTL must be between 60 seconds (1 min) and 3600 seconds (60 mins).',
        statusCode: 400,
      });
    }

    if (actorId === dto.targetUserId) {
      throw new BadRequestException({
        error: 'self_impersonation_forbidden',
        message: 'Support agents cannot impersonate themselves.',
        statusCode: 400,
      });
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Target user not found.',
        statusCode: 404,
      });
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      throw new ForbiddenException({
        error: 'super_admin_impersonation_forbidden',
        message: 'Impersonation of SUPER_ADMIN accounts is strictly forbidden.',
        statusCode: 403,
      });
    }

    const grantId = crypto.randomUUID();
    const expiresAtMs = Date.now() + requestedTtl * 1000;
    const expiresAt = new Date(expiresAtMs).toISOString();

    const payload: RedisGrantPayload = {
      grantId,
      actorId,
      actorRole,
      targetUserId: targetUser.id,
      ticketId: dto.ticketId,
      rationale: dto.rationale,
      expiresAt,
    };

    await this.redis.setex(`support_grant:${grantId}`, requestedTtl, JSON.stringify(payload));

    await this.audit.record({
      actorId,
      action: 'support.access_granted',
      resourceType: 'user',
      resourceId: targetUser.id,
      reasonCode: dto.ticketId,
      metadata: {
        grantId,
        ticketId: dto.ticketId,
        rationale: dto.rationale,
        ttlSeconds: requestedTtl,
        actorRole,
      },
    });

    return {
      grantId,
      expiresAt,
    };
  }

  /**
   * Story 4 — Revoke active support grant
   */
  async revokeGrant(actorId: string, grantId: string): Promise<{ success: true }> {
    const key = `support_grant:${grantId}`;
    const raw = await this.redis.get(key);

    if (raw) {
      try {
        const grant: RedisGrantPayload = JSON.parse(raw);
        await this.redis.del(key);

        await this.audit.record({
          actorId,
          action: 'support.access_revoked',
          resourceType: 'support_grant',
          resourceId: grantId,
          reasonCode: grant.ticketId ?? null,
          metadata: { grantId, targetUserId: grant.targetUserId },
        });
      } catch {
        await this.redis.del(key);
      }
    }

    return { success: true };
  }

  /**
   * Story 3 — Exchange grant for delegated session token
   */
  async impersonateUser(
    actorId: string,
    actorRole: string,
    dto: ImpersonateRequest,
  ): Promise<SupportSessionResponse> {
    const grantKey = `support_grant:${dto.grantId}`;
    const rawGrant = await this.redis.get(grantKey);

    if (!rawGrant) {
      throw new UnauthorizedException({
        error: 'grant_expired_or_invalid',
        message: 'Support grant is invalid or has expired.',
        statusCode: 401,
      });
    }

    const grant: RedisGrantPayload = JSON.parse(rawGrant);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: grant.targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Target user no longer exists.',
        statusCode: 404,
      });
    }

    const sessionId = crypto.randomUUID();
    const expiresAtMs = new Date(grant.expiresAt).getTime();
    const remainingTtlSeconds = Math.max(60, Math.floor((expiresAtMs - Date.now()) / 1000));

    const delegatedAccessToken = await this.jwt.signAsync({
      sub: targetUser.id,
      role: targetUser.role,
      inst: targetUser.institutionId ?? null,
      companyId: targetUser.companyId ?? undefined,
      isDelegated: true,
      actorId,
      actorRole,
      ticketId: grant.ticketId,
      supportSessionId: sessionId,
    });

    const sessionPayload: RedisSessionPayload = {
      sessionId,
      grantId: dto.grantId,
      actorId,
      actorRole,
      targetUserId: targetUser.id,
      ticketId: grant.ticketId,
      expiresAt: grant.expiresAt,
    };

    await this.redis.setex(
      `support_session:${sessionId}`,
      remainingTtlSeconds,
      JSON.stringify(sessionPayload),
    );

    // Consume grant so it cannot be re-used
    await this.redis.del(grantKey);

    await this.audit.record({
      actorId,
      action: 'support.session_started',
      resourceType: 'user',
      resourceId: targetUser.id,
      reasonCode: grant.ticketId,
      metadata: {
        sessionId,
        grantId: dto.grantId,
        ticketId: grant.ticketId,
        actorRole,
      },
    });

    return {
      sessionId,
      grantId: dto.grantId,
      targetUserId: targetUser.id,
      delegatedAccessToken,
      expiresAt: grant.expiresAt,
    };
  }

  /**
   * Story 3 & 5 — End active delegated session
   */
  async endSession(requestUser: RequestUser): Promise<{ success: true }> {
    const sessionId = requestUser.supportSessionId;

    if (sessionId) {
      const sessionKey = `support_session:${sessionId}`;
      const rawSession = await this.redis.get(sessionKey);

      await this.redis.del(sessionKey);

      let ticketId = requestUser.ticketId ?? null;
      let targetUserId = requestUser.sub;
      let actorId = requestUser.actorId ?? requestUser.sub;

      if (rawSession) {
        try {
          const session: RedisSessionPayload = JSON.parse(rawSession);
          ticketId = session.ticketId;
          targetUserId = session.targetUserId;
          actorId = session.actorId;
        } catch {
          // ignore parse errors
        }
      }

      await this.audit.record({
        actorId,
        action: 'support.session_ended',
        resourceType: 'support_session',
        resourceId: sessionId,
        reasonCode: ticketId,
        metadata: {
          sessionId,
          targetUserId,
          actorId,
        },
      });
    }

    return { success: true };
  }

  /**
   * Story 2 — Review account and workflow status
   */
  async getDiagnosticSummary(targetUserId: string): Promise<SupportDiagnosticResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        institution: true,
        skillClaims: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Target user not found.',
        statusCode: 404,
      });
    }

    let accountState: 'ACTIVE' | 'HELD' | 'DEACTIVATED' = 'ACTIVE';
    if (user.deactivatedAt || user.institution?.deactivatedAt) {
      accountState = 'DEACTIVATED';
    } else if (user.heldAt || user.institution?.heldAt) {
      accountState = 'HELD';
    }

    const verifiedSkillCount = user.skillClaims.filter(
      (claim) => claim.status === 'VERIFIED',
    ).length;

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accountState,
      heldAt: user.heldAt?.toISOString() ?? user.institution?.heldAt?.toISOString() ?? null,
      institutionId: user.institutionId ?? null,
      onboardingCompleted: user.onboardingCompleted,
      verifiedSkillCount,
      enrolledTracks: user.primaryTrackId ? [user.primaryTrackId] : [],
    };
  }

  /**
   * Story 7 — Support History
   */
  async getSupportHistory(query: SupportHistoryQuery = {}): Promise<SupportHistoryResponse> {
    const actions = [
      'support.access_granted',
      'support.session_started',
      'support.access_revoked',
      'support.session_ended',
    ];

    const where: Prisma.AuditLogWhereInput = {
      action: { in: actions },
    };

    if (query.actorId) {
      where.actorId = query.actorId;
    }

    if (query.targetUserId) {
      where.resourceId = query.targetUserId;
    }

    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const take = query.take ?? 50;

    const rows = await this.prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    const items = rows.map((row) => ({
      auditLogId: row.id,
      actorId: row.actorId,
      actorEmail: row.actor?.email ?? null,
      actorRole: row.actor?.role ?? null,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      reasonCode: row.reasonCode,
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : null,
      createdAt: row.createdAt.toISOString(),
    }));

    return { items };
  }
}
