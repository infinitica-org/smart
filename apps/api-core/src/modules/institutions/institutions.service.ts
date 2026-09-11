import { Readable } from 'node:stream';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AddBatchMemberRequestSchema } from '@smart/contracts';
import type {
  AddBatchMemberRequest,
  BatchDto,
  BatchImportMapping,
  BatchImportPreviewRowDto,
  BatchImportResultDto,
  BatchMemberDto,
  CreateBatchRequest,
  CreateInstitutionRequest,
  GlobalStudentHitDto,
  InstitutionAdminDto,
  InstitutionDto,
  InstitutionStudentDto,
  InviteUserRequest,
  ListAuditLogsQuery,
  ListInstitutionStudentsQuery,
  ListInstitutionsQuery,
  SendBatchInvitesResultDto,
  SubscriptionPlanDto,
  TenantActionReason,
  TenantEntitlementsDto,
  UpdateBatchRequest,
  UpdateInstitutionRequest,
  UpdatePlanEntitlementsRequest,
  ViewCandidateRequest,
  CandidateBriefDto,
  AdminDashboardDto,
  AuditLogDto,
  AuditLogSection,
  InvitePlatformAdminRequest,
  PlatformAdminDto,
  PlanCode,
  SetFeatureFlagOverrideRequest,
  ResolveVerificationRequest,
  UpdatePlanCapacityRequest,
  VerificationQueueItemDto,
} from '@smart/contracts';
import { REDIS_TTL_SECONDS } from '@smart/contracts';
import type { Prisma, UserRole as PrismaUserRole } from '../../generated/prisma/index.js';
import ExcelJS from 'exceljs';
import { batchImportRows, cacheOperations, quotaExceeded } from '@smart/observability';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { InvitationsService, toInvitationDto } from '../invitations/invitations.service.js';

const MAX_BATCH_IMPORT_ROWS = 10_000;
const ENTITLEMENTS_CACHE_KEY = (institutionId: string): string =>
  `entitlements:institution:${institutionId}`;

/** Groups the raw UserRole enum into the three audit-log tabs the superadmin UI shows. */
const AUDIT_LOG_SECTION_ROLES: Record<AuditLogSection, PrismaUserRole[]> = {
  STUDENT: ['STUDENT'],
  TPO: ['INSTITUTION_ADMIN', 'PLACEMENT_STAFF'],
  SUPER_ADMIN: ['SUPER_ADMIN'],
};

interface ParsedBatchImport {
  rows: BatchImportPreviewRowDto[];
  errors: BatchImportResultDto['errors'];
}

@Injectable()
export class InstitutionsService {
  private readonly logger = new Logger(InstitutionsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(InvitationsService) private readonly invitations: InvitationsService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  /* ----------------------------- platform admin ----------------------------- */

  async createInstitution(body: CreateInstitutionRequest): Promise<InstitutionDto> {
    const domain = body.domain.toLowerCase();
    const existing = await this.prisma.institution.findUnique({ where: { domain } });
    if (existing) {
      throw new ConflictException({
        error: 'conflict',
        message: 'An institution with this domain already exists.',
        statusCode: 409,
      });
    }
    const freePlan = await this.prisma.subscriptionPlan.findUnique({ where: { code: 'FREE' } });
    if (!freePlan) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Subscription plans have not been seeded.',
        statusCode: 404,
      });
    }
    const institution = await this.prisma.institution.create({
      data: { name: body.name, domain, planId: freePlan.id },
      include: { plan: true },
    });
    const [created] = await this.toInstitutionDtos([institution]);
    if (!created) {
      throw new Error('Institution DTO mapping returned no rows for a freshly created institution');
    }
    return created;
  }

  async listInstitutions(query: ListInstitutionsQuery = {}): Promise<InstitutionDto[]> {
    const where: Prisma.InstitutionWhereInput = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { domain: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.planCode) {
      where.plan = { code: query.planCode };
    }
    if (query.status === 'HELD') {
      where.heldAt = { not: null };
      where.deactivatedAt = null;
    } else if (query.status === 'DEACTIVATED') {
      where.deactivatedAt = { not: null };
    } else if (query.status === 'ACTIVE') {
      where.heldAt = null;
      where.deactivatedAt = null;
    } else {
      where.deactivatedAt = null;
    }

    const rows = await this.prisma.institution.findMany({
      where,
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    return this.toInstitutionDtos(rows);
  }

  async getInstitution(institutionId: string): Promise<InstitutionDto> {
    const institution = await this.requireInstitution(institutionId);
    const [dto] = await this.toInstitutionDtos([institution]);
    if (!dto) {
      throw new Error('Institution DTO mapping returned no rows for an existing institution');
    }
    return dto;
  }

  async updateInstitution(
    institutionId: string,
    body: UpdateInstitutionRequest,
    actorId: string,
  ): Promise<InstitutionDto> {
    await this.requireInstitution(institutionId);
    const data: Prisma.InstitutionUpdateInput = {};
    if (body.name) data.name = body.name;
    if (body.domain) {
      const domain = body.domain.toLowerCase();
      const clash = await this.prisma.institution.findFirst({
        where: { domain, id: { not: institutionId } },
      });
      if (clash) {
        throw new ConflictException({
          error: 'conflict',
          message: 'An institution with this domain already exists.',
          statusCode: 409,
        });
      }
      data.domain = domain;
    }
    if (body.planCode) {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { code: body.planCode },
      });
      if (!plan) {
        throw new NotFoundException({
          error: 'not_found',
          message: 'Plan not found.',
          statusCode: 404,
        });
      }
      data.plan = { connect: { id: plan.id } };
    }
    await this.prisma.institution.update({ where: { id: institutionId }, data });
    if (body.planCode) {
      // A plan reassignment changes this institution's effective entitlements
      // immediately, unlike a plan-level entitlement edit — bust its cache now
      // rather than waiting out the TTL.
      await this.redis.del(ENTITLEMENTS_CACHE_KEY(institutionId));
      await this.writeAudit(
        actorId,
        'institution.plan_changed',
        'institution',
        institutionId,
        body.planCode,
        { planCode: body.planCode },
      );
    }
    return this.getInstitution(institutionId);
  }

  async holdInstitution(
    institutionId: string,
    body: TenantActionReason,
    actorId: string,
  ): Promise<InstitutionDto> {
    await this.requireInstitution(institutionId);
    await this.prisma.institution.update({
      where: { id: institutionId },
      data: { heldAt: new Date() },
    });
    await this.writeAudit(
      actorId,
      'institution.held',
      'institution',
      institutionId,
      body.reason,
      {},
    );
    return this.getInstitution(institutionId);
  }

  async releaseHold(
    institutionId: string,
    body: TenantActionReason,
    actorId: string,
  ): Promise<InstitutionDto> {
    await this.requireInstitution(institutionId);
    await this.prisma.institution.update({
      where: { id: institutionId },
      data: { heldAt: null },
    });
    await this.writeAudit(
      actorId,
      'institution.hold_released',
      'institution',
      institutionId,
      body.reason,
      {},
    );
    return this.getInstitution(institutionId);
  }

  async deactivateInstitution(
    institutionId: string,
    body: TenantActionReason,
    actorId: string,
  ): Promise<InstitutionDto> {
    await this.requireInstitution(institutionId);
    await this.prisma.institution.update({
      where: { id: institutionId },
      data: { deactivatedAt: new Date() },
    });
    await this.writeAudit(
      actorId,
      'institution.deactivated',
      'institution',
      institutionId,
      body.reason,
      {},
    );
    return this.getInstitution(institutionId);
  }

  async restoreInstitution(
    institutionId: string,
    body: TenantActionReason,
    actorId: string,
  ): Promise<InstitutionDto> {
    await this.requireInstitution(institutionId);
    await this.prisma.institution.update({
      where: { id: institutionId },
      data: { deactivatedAt: null, heldAt: null },
    });
    await this.writeAudit(
      actorId,
      'institution.restored',
      'institution',
      institutionId,
      body.reason,
      {},
    );
    return this.getInstitution(institutionId);
  }

  async listInstitutionStudents(
    institutionId: string,
    query: ListInstitutionStudentsQuery,
  ): Promise<InstitutionStudentDto[]> {
    await this.requireInstitution(institutionId);
    const where: Prisma.UserWhereInput = { institutionId, role: 'STUDENT' };
    if (query.batchId) where.batchId = query.batchId;
    if (query.q) {
      where.OR = [
        { fullName: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const users = await this.prisma.user.findMany({
      where,
      include: { batch: true },
      orderBy: { fullName: 'asc' },
    });
    const invitations = await this.prisma.invitation.findMany({
      where: { userId: { in: users.map((user) => user.id) } },
      orderBy: { createdAt: 'desc' },
    });
    const latestByUser = new Map<string, (typeof invitations)[number]>();
    for (const invitation of invitations) {
      if (!latestByUser.has(invitation.userId)) latestByUser.set(invitation.userId, invitation);
    }

    const rows: InstitutionStudentDto[] = users.map((user) => {
      const invitation = latestByUser.get(user.id);
      const socialUrls = socialUrlsFromOnboarding(user.onboardingDetails);
      return {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        batchId: user.batchId,
        batchName: user.batch?.name ?? null,
        inviteStatus: invitation?.status ?? null,
        lastSentAt: invitation?.lastSentAt?.toISOString() ?? null,
        acceptedAt: invitation?.acceptedAt?.toISOString() ?? null,
        heldAt: user.heldAt?.toISOString() ?? null,
        linkedinUrl: socialUrls.linkedinUrl,
        githubUrl: socialUrls.githubUrl,
      };
    });

    if (!query.inviteStatus) return rows;
    if (query.inviteStatus === 'NONE') return rows.filter((row) => row.inviteStatus === null);
    return rows.filter((row) => row.inviteStatus === query.inviteStatus);
  }

  async searchStudents(q: string): Promise<GlobalStudentHitDto[]> {
    const users = await this.prisma.user.findMany({
      where: {
        role: 'STUDENT',
        institutionId: { not: null },
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { institution: true },
      take: 50,
      orderBy: { fullName: 'asc' },
    });
    const invitations = await this.prisma.invitation.findMany({
      where: { userId: { in: users.map((user) => user.id) } },
      orderBy: { createdAt: 'desc' },
    });
    const latestByUser = new Map<string, (typeof invitations)[number]>();
    for (const invitation of invitations) {
      if (!latestByUser.has(invitation.userId)) latestByUser.set(invitation.userId, invitation);
    }
    return users.flatMap((user) => {
      if (!user.institutionId || !user.institution) return [];
      return [
        {
          userId: user.id,
          email: user.email,
          fullName: user.fullName,
          institutionId: user.institutionId,
          institutionName: user.institution.name,
          inviteStatus: latestByUser.get(user.id)?.status ?? null,
          heldAt: user.heldAt?.toISOString() ?? null,
        },
      ];
    });
  }

  async listPlans(): Promise<SubscriptionPlanDto[]> {
    const plans = await this.prisma.subscriptionPlan.findMany({
      include: {
        entitlements: { include: { featureFlag: true } },
        _count: { select: { institutions: true } },
      },
      orderBy: { code: 'asc' },
    });
    return plans.map((plan) => ({
      planId: plan.id,
      code: plan.code,
      name: plan.name,
      candidateCapacity: plan.candidateCapacity,
      institutionCount: plan._count.institutions,
      entitlements: plan.entitlements.map((row) => ({
        key: row.featureFlag.key,
        name: row.featureFlag.name,
        enabled: row.enabled,
      })),
    }));
  }

  async updatePlanEntitlements(
    planId: string,
    body: UpdatePlanEntitlementsRequest,
    actorId: string,
  ): Promise<SubscriptionPlanDto> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: { entitlements: { include: { featureFlag: true } } },
    });
    if (!plan) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Plan not found.',
        statusCode: 404,
      });
    }
    for (const item of body.entitlements) {
      const flag = await this.prisma.featureFlag.findUnique({ where: { key: item.key } });
      if (!flag) continue;
      await this.prisma.planEntitlement.upsert({
        where: { planId_featureFlagId: { planId: plan.id, featureFlagId: flag.id } },
        create: { planId: plan.id, featureFlagId: flag.id, enabled: item.enabled },
        update: { enabled: item.enabled },
      });
    }
    await this.writeAudit(actorId, 'plan.entitlements_updated', 'plan', planId, 'plan matrix', {
      entitlements: body.entitlements,
    });
    const updated = (await this.listPlans()).find((row) => row.planId === planId);
    if (!updated) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Plan not found.',
        statusCode: 404,
      });
    }
    return updated;
  }

  async updatePlanCapacity(
    planId: string,
    body: UpdatePlanCapacityRequest,
    actorId: string,
  ): Promise<SubscriptionPlanDto> {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Plan not found.',
        statusCode: 404,
      });
    }
    await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: { candidateCapacity: body.candidateCapacity },
    });
    await this.writeAudit(actorId, 'plan.capacity_updated', 'plan', planId, 'candidate capacity', {
      candidateCapacity: body.candidateCapacity,
    });
    // Plan-level edits are rare admin actions; tenants on this plan see the
    // change once their 60s entitlement cache entry naturally expires rather
    // than us enumerating and busting every tenant's key here.
    const updated = (await this.listPlans()).find((row) => row.planId === planId);
    if (!updated) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Plan not found.',
        statusCode: 404,
      });
    }
    return updated;
  }

  async setInstitutionFlagOverride(
    institutionId: string,
    body: SetFeatureFlagOverrideRequest,
    actorId: string,
  ): Promise<TenantEntitlementsDto> {
    await this.requireInstitution(institutionId);
    const flag = await this.prisma.featureFlag.findUnique({ where: { key: body.key } });
    if (!flag) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Feature flag not found.',
        statusCode: 404,
      });
    }
    const existing = await this.prisma.featureFlagOverride.findFirst({
      where: { institutionId, featureFlagId: flag.id },
    });
    if (existing) {
      await this.prisma.featureFlagOverride.update({
        where: { id: existing.id },
        data: { enabled: body.enabled },
      });
    } else {
      await this.prisma.featureFlagOverride.create({
        data: { institutionId, featureFlagId: flag.id, enabled: body.enabled },
      });
    }
    await this.writeAudit(
      actorId,
      'institution.flag_override',
      'institution',
      institutionId,
      body.key,
      {
        key: body.key,
        enabled: body.enabled,
      },
    );
    await this.redis.del(ENTITLEMENTS_CACHE_KEY(institutionId));
    return this.resolveInstitutionEntitlements(institutionId);
  }

  async resolveInstitutionEntitlements(institutionId: string): Promise<TenantEntitlementsDto> {
    const cacheKey = ENTITLEMENTS_CACHE_KEY(institutionId);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      cacheOperations.inc({ namespace: 'entitlements', result: 'hit' });
      return JSON.parse(cached) as TenantEntitlementsDto;
    }
    cacheOperations.inc({ namespace: 'entitlements', result: 'miss' });

    const institution = await this.requireInstitution(institutionId);
    const [flags, candidateUsage] = await Promise.all([
      this.prisma.featureFlag.findMany({
        include: { entitlements: true, overrides: true },
        orderBy: { key: 'asc' },
      }),
      this.prisma.user.count({ where: { institutionId, role: 'STUDENT' } }),
    ]);
    const resolved: TenantEntitlementsDto = {
      planCode: institution.plan.code,
      institutionName: institution.name,
      domain: institution.domain,
      verificationStatus: institution.verificationStatus,
      candidateCapacity: institution.plan.candidateCapacity,
      candidateUsage,
      flags: flags.map((flag) => {
        const override = flag.overrides.find((row) => row.institutionId === institutionId);
        const entitlement = flag.entitlements.find((row) => row.planId === institution.planId);
        return {
          key: flag.key,
          name: flag.name,
          enabled: override ? override.enabled : (entitlement?.enabled ?? false),
        };
      }),
    };
    await this.redis.setex(
      cacheKey,
      REDIS_TTL_SECONDS.entitlementsResolve,
      JSON.stringify(resolved),
    );
    return resolved;
  }

  async assertInstitutionFlag(institutionId: string, key: string): Promise<void> {
    const resolved = await this.resolveInstitutionEntitlements(institutionId);
    const flag = resolved.flags.find((item) => item.key === key);
    if (!flag?.enabled) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: `This institution's plan does not include ${key}.`,
        statusCode: 403,
      });
    }
  }

  /**
   * Throws when adding `additionalCount` more students would exceed the
   * institution's plan capacity. A null capacity means unlimited (PRO today).
   */
  async assertCandidateCapacity(institutionId: string, additionalCount = 1): Promise<void> {
    const resolved = await this.resolveInstitutionEntitlements(institutionId);
    if (resolved.candidateCapacity == null) return;
    const projected = (resolved.candidateUsage ?? 0) + additionalCount;
    if (projected > resolved.candidateCapacity) {
      quotaExceeded.inc({
        tenant_type: 'institution',
        plan_code: resolved.planCode ?? 'FREE',
        dimension: 'candidateCapacity',
      });
      throw new ForbiddenException({
        error: 'quota_exceeded',
        message: `This institution's plan allows up to ${String(resolved.candidateCapacity)} candidates.`,
        statusCode: 403,
      });
    }
  }

  async getDashboard(): Promise<AdminDashboardDto> {
    const [
      total,
      held,
      deactivated,
      studentsHeld,
      companyTotal,
      companyPending,
      institutionPending,
      flaggedAttempts,
      plans,
      recent,
    ] = await Promise.all([
      this.prisma.institution.count(),
      this.prisma.institution.count({ where: { heldAt: { not: null }, deactivatedAt: null } }),
      this.prisma.institution.count({ where: { deactivatedAt: { not: null } } }),
      this.prisma.user.count({ where: { role: 'STUDENT', heldAt: { not: null } } }),
      this.prisma.company.count(),
      this.prisma.company.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.institution.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.attempt.count({
        where: {
          integrityFlag: {
            in: [
              'FLAGGED_TIMING',
              'FLAGGED_PROCTOR',
              'FLAGGED_SIMILARITY',
              'FLAGGED_AUDIO',
              'UNDER_REVIEW',
            ],
          },
        },
      }),
      this.prisma.subscriptionPlan.findMany({
        include: { _count: { select: { institutions: true } } },
      }),
      this.prisma.auditLog.findMany({
        include: { actor: { select: { email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);
    return {
      institutions: {
        total,
        active: total - held - deactivated,
        held,
        deactivated,
      },
      companies: { total: companyTotal, pendingVerification: companyPending },
      planMix: plans.map((plan) => ({ code: plan.code, count: plan._count.institutions })),
      openHolds: { institutions: held, students: studentsHeld },
      pendingVerifications: companyPending + institutionPending,
      flaggedAttempts,
      recentAudit: recent.map((row) => this.toAuditDto(row)),
    };
  }

  async listAuditLogs(query: ListAuditLogsQuery = {}): Promise<AuditLogDto[]> {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.resourceType) where.resourceType = query.resourceType;
    if (query.resourceId) where.resourceId = query.resourceId;
    if (query.actorId) where.actorId = query.actorId;
    if (query.section) {
      where.actor = { is: { role: { in: AUDIT_LOG_SECTION_ROLES[query.section] } } };
    }
    if (query.q) {
      where.OR = [
        { action: { contains: query.q, mode: 'insensitive' } },
        { reasonCode: { contains: query.q, mode: 'insensitive' } },
        { resourceId: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.auditLog.findMany({
      where,
      include: { actor: { select: { email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => this.toAuditDto(row));
  }

  async viewCandidateBrief(
    userId: string,
    body: ViewCandidateRequest,
    actorId: string,
  ): Promise<CandidateBriefDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { institution: true, skillClaims: true, projects: true, invitationsReceived: true },
    });
    if (!user || user.role !== 'STUDENT' || !user.institution) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Student not found.',
        statusCode: 404,
      });
    }
    await this.writeAudit(actorId, 'candidate.profile_viewed', 'user', user.id, body.reason, {
      reasonCode: body.reasonCode,
    });
    const latestInvite = user.invitationsReceived.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];
    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      institutionId: user.institution.id,
      institutionName: user.institution.name,
      inviteStatus: latestInvite?.status ?? null,
      heldAt: user.heldAt?.toISOString() ?? null,
      heldReason: user.heldReason,
      skillClaimCount: user.skillClaims.length,
      verifiedSkillCount: user.skillClaims.filter((claim) => claim.status === 'VERIFIED').length,
      projectCount: user.projects.length,
      viewedAt: new Date().toISOString(),
    };
  }

  async listVerificationQueue(): Promise<VerificationQueueItemDto[]> {
    const [institutions, companies] = await Promise.all([
      this.prisma.institution.findMany({
        where: { verificationStatus: { in: ['PENDING', 'REJECTED'] } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.findMany({
        where: { verificationStatus: { in: ['PENDING', 'REJECTED'] } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return [
      ...institutions.map((row) => ({
        tenantType: 'institution' as const,
        tenantId: row.id,
        name: row.name,
        domain: row.domain,
        verificationStatus: row.verificationStatus,
        verificationReason: row.verificationReason,
        createdAt: row.createdAt.toISOString(),
      })),
      ...companies.map((row) => ({
        tenantType: 'company' as const,
        tenantId: row.id,
        name: row.name,
        domain: row.taxonomyDomain,
        verificationStatus: row.verificationStatus,
        verificationReason: row.verificationReason,
        createdAt: row.createdAt.toISOString(),
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async resolveVerification(
    tenantId: string,
    body: ResolveVerificationRequest,
    actorId: string,
  ): Promise<VerificationQueueItemDto> {
    if (body.tenantType === 'institution') {
      const plan =
        body.decision === 'APPROVED'
          ? await this.prisma.subscriptionPlan.findUnique({ where: { code: 'PRO' } })
          : null;
      const row = await this.prisma.institution.update({
        where: { id: tenantId },
        data: {
          verificationStatus: body.decision,
          verificationReason: body.reason,
          ...(plan ? { planId: plan.id } : {}),
        },
      });
      if (plan) await this.redis.del(ENTITLEMENTS_CACHE_KEY(tenantId));
      await this.writeAudit(
        actorId,
        'institution.verification',
        'institution',
        tenantId,
        body.reason,
        {
          decision: body.decision,
        },
      );
      return {
        tenantType: 'institution',
        tenantId: row.id,
        name: row.name,
        domain: row.domain,
        verificationStatus: row.verificationStatus,
        verificationReason: row.verificationReason,
        createdAt: row.createdAt.toISOString(),
      };
    }
    const pro =
      body.decision === 'APPROVED'
        ? await this.prisma.subscriptionPlan.findUnique({ where: { code: 'PRO' } })
        : null;
    const row = await this.prisma.company.update({
      where: { id: tenantId },
      data: {
        verificationStatus: body.decision,
        verificationReason: body.reason,
        ...(pro ? { planId: pro.id } : {}),
      },
    });
    if (pro) await this.redis.del(`entitlements:company:${tenantId}`);
    await this.writeAudit(actorId, 'company.verification', 'company', tenantId, body.reason, {
      decision: body.decision,
    });
    return {
      tenantType: 'company',
      tenantId: row.id,
      name: row.name,
      domain: row.taxonomyDomain,
      verificationStatus: row.verificationStatus,
      verificationReason: row.verificationReason,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toAuditDto(row: {
    id: string;
    actorId: string | null;
    actor?: { email: string; role?: AuditLogDto['actorRole'] } | null;
    action: string;
    resourceType: string;
    resourceId: string | null;
    reasonCode: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }): AuditLogDto {
    return {
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
    };
  }

  async holdStudent(
    userId: string,
    body: TenantActionReason,
    actorId: string,
    institutionId: string | null,
  ): Promise<InstitutionStudentDto> {
    const user = await this.requireStudent(userId, institutionId);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { heldAt: new Date(), heldReason: body.reason },
    });
    await this.writeAudit(actorId, 'student.held', 'user', user.id, body.reason, {
      institutionId: user.institutionId,
    });
    if (!user.institutionId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Student not found.',
        statusCode: 404,
      });
    }
    const [row] = await this.listInstitutionStudents(user.institutionId, { q: user.email });
    return row ?? this.emptyStudent(user);
  }

  async releaseStudent(
    userId: string,
    body: TenantActionReason,
    actorId: string,
    institutionId: string | null,
  ): Promise<InstitutionStudentDto> {
    const user = await this.requireStudent(userId, institutionId);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { heldAt: null, heldReason: null },
    });
    await this.writeAudit(actorId, 'student.hold_released', 'user', user.id, body.reason, {
      institutionId: user.institutionId,
    });
    if (!user.institutionId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Student not found.',
        statusCode: 404,
      });
    }
    const [row] = await this.listInstitutionStudents(user.institutionId, { q: user.email });
    return row ?? this.emptyStudent({ ...user, heldAt: null });
  }

  /** TPO "copy invite link" action — never emailed, just handed to the caller to share offline. */
  async getStudentInviteLink(
    userId: string,
    institutionId: string | null,
  ): Promise<{ inviteUrl: string }> {
    const user = await this.requireStudent(userId, institutionId);
    if (!user.institutionId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Student not found.',
        statusCode: 404,
      });
    }
    const inviteUrl = await this.invitations.mintLinkForUser(user.id, user.institutionId);
    return { inviteUrl };
  }

  private emptyStudent(user: {
    id: string;
    email: string;
    fullName: string;
    batchId: string | null;
    heldAt: Date | null;
    onboardingDetails?: unknown;
  }): InstitutionStudentDto {
    const socialUrls = socialUrlsFromOnboarding(user.onboardingDetails);
    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      batchId: user.batchId,
      batchName: null,
      inviteStatus: null,
      lastSentAt: null,
      acceptedAt: null,
      heldAt: user.heldAt?.toISOString() ?? null,
      linkedinUrl: socialUrls.linkedinUrl,
      githubUrl: socialUrls.githubUrl,
    };
  }

  private async requireStudent(userId: string, institutionId: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'STUDENT' || !user.institutionId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Student not found.',
        statusCode: 404,
      });
    }
    if (institutionId && user.institutionId !== institutionId) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Student is not in your institution.',
        statusCode: 403,
      });
    }
    return user;
  }

  async inviteInstitutionAdmin(
    institutionId: string,
    body: InviteUserRequest,
    invitedById: string,
  ): Promise<InstitutionAdminDto> {
    await this.requireInstitution(institutionId);
    const { invitation } = await this.invitations.createAndEnqueue({
      email: body.email,
      fullName: body.fullName,
      role: 'INSTITUTION_ADMIN',
      institutionId,
      invitedById,
    });
    const dbUser = await this.prisma.user.findFirstOrThrow({
      where: { email: body.email.toLowerCase() },
    });
    return {
      userId: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      emailVerified: dbUser.emailVerified,
      invitation,
    };
  }

  async listInstitutionAdmins(institutionId: string): Promise<InstitutionAdminDto[]> {
    await this.requireInstitution(institutionId);
    const users = await this.prisma.user.findMany({
      where: { institutionId, role: 'INSTITUTION_ADMIN' },
      orderBy: { createdAt: 'desc' },
    });
    const result: InstitutionAdminDto[] = [];
    for (const user of users) {
      const invitation = await this.prisma.invitation.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      result.push({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        emailVerified: user.emailVerified,
        invitation: invitation ? toInvitationDto(invitation) : null,
      });
    }
    return result;
  }

  async resendAdminInvitation(
    invitationId: string,
  ): Promise<ReturnType<InvitationsService['resend']>> {
    return this.invitations.resend(invitationId, null);
  }

  /* ------------------------------ platform admins ---------------------------- */

  async listPlatformAdmins(): Promise<PlatformAdminDto[]> {
    const users = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      orderBy: { createdAt: 'desc' },
    });
    const result: PlatformAdminDto[] = [];
    for (const user of users) {
      const invitation = await this.prisma.invitation.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      result.push({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        emailVerified: user.emailVerified,
        invitation: invitation ? toInvitationDto(invitation) : null,
      });
    }
    return result;
  }

  async invitePlatformAdmin(
    body: InvitePlatformAdminRequest,
    invitedById: string,
  ): Promise<PlatformAdminDto> {
    const { invitation } = await this.invitations.createAndEnqueue({
      email: body.email,
      fullName: body.fullName,
      role: 'SUPER_ADMIN',
      institutionId: null,
      invitedById,
    });
    const dbUser = await this.prisma.user.findFirstOrThrow({
      where: { email: body.email.toLowerCase() },
    });
    await this.writeAudit(invitedById, 'platform_admin.invited', 'user', dbUser.id, body.reason, {
      email: dbUser.email,
    });
    return {
      userId: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      emailVerified: dbUser.emailVerified,
      invitation,
    };
  }

  /* ----------------------------------- TPO ---------------------------------- */

  async createBatch(
    institutionId: string,
    body: CreateBatchRequest,
    createdById: string,
  ): Promise<BatchDto> {
    try {
      const batch = await this.prisma.batch.create({
        data: {
          institutionId,
          name: body.name,
          code: body.code ?? null,
          createdById,
        },
      });
      return toBatchDto(batch, 0, 0);
    } catch {
      throw new ConflictException({
        error: 'conflict',
        message: 'A batch with this name already exists for the institution.',
        statusCode: 409,
      });
    }
  }

  async listBatches(institutionId: string): Promise<BatchDto[]> {
    const batches = await this.prisma.batch.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      batches.map(async (batch) => {
        const memberCount = await this.prisma.user.count({
          where: { batchId: batch.id, role: 'STUDENT' },
        });
        const pendingInviteCount = await this.prisma.invitation.count({
          where: { batchId: batch.id, status: 'PENDING' },
        });
        return toBatchDto(batch, memberCount, pendingInviteCount);
      }),
    );
  }

  async getBatch(batchId: string, institutionId: string): Promise<BatchDto> {
    const batch = await this.requireBatch(batchId, institutionId);
    const memberCount = await this.prisma.user.count({
      where: { batchId: batch.id, role: 'STUDENT' },
    });
    const pendingInviteCount = await this.prisma.invitation.count({
      where: { batchId: batch.id, status: 'PENDING' },
    });
    return toBatchDto(batch, memberCount, pendingInviteCount);
  }

  async updateBatch(
    batchId: string,
    institutionId: string,
    body: UpdateBatchRequest,
  ): Promise<BatchDto> {
    await this.requireBatch(batchId, institutionId);
    const batch = await this.prisma.batch.update({
      where: { id: batchId },
      data: {
        name: body.name,
        code: body.code === null ? null : body.code,
      },
    });
    const memberCount = await this.prisma.user.count({ where: { batchId, role: 'STUDENT' } });
    const pendingInviteCount = await this.prisma.invitation.count({
      where: { batchId, status: 'PENDING' },
    });
    return toBatchDto(batch, memberCount, pendingInviteCount);
  }

  async addBatchMember(
    batchId: string,
    institutionId: string,
    body: AddBatchMemberRequest,
    invitedById: string,
    opts?: { skipCapacityCheck?: boolean },
  ): Promise<BatchMemberDto> {
    await this.requireBatch(batchId, institutionId);

    const email = body.email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    // Adding an existing student to a batch doesn't grow headcount; only a
    // brand-new account draws down the plan's candidate capacity.
    if (!existingUser && !opts?.skipCapacityCheck) {
      await this.assertCandidateCapacity(institutionId);
    }

    if (existingUser) {
      if (existingUser.institutionId !== institutionId) {
        throw new ForbiddenException({
          error: 'forbidden',
          message: 'User belongs to another institution.',
          statusCode: 403,
        });
      }
      if (existingUser.role !== 'STUDENT') {
        throw new ConflictException({
          error: 'conflict',
          message: 'Only student accounts can be members of a batch.',
          statusCode: 409,
        });
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          batchId,
          groupLabel: body.groupLabel !== undefined ? body.groupLabel : existingUser.groupLabel,
        },
      });

      const invitation = await this.prisma.invitation.findFirst({
        where: { userId: existingUser.id },
        orderBy: { createdAt: 'desc' },
      });

      if (invitation && invitation.batchId !== batchId) {
        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: { batchId },
        });
      }

      return toBatchMember(
        updatedUser,
        invitation ? toInvitationDto({ ...invitation, batchId }) : null,
      );
    }

    const { invitation } = await this.invitations.createAndEnqueue({
      email: body.email,
      fullName: body.fullName,
      role: 'STUDENT',
      institutionId,
      batchId,
      groupLabel: body.groupLabel ?? null,
      invitedById,
      sendEmail: false,
    });
    const user = await this.prisma.user.findFirstOrThrow({
      where: { email: body.email.toLowerCase() },
    });
    return toBatchMember(user, invitation);
  }

  async listBatchMembers(batchId: string, institutionId: string): Promise<BatchMemberDto[]> {
    await this.requireBatch(batchId, institutionId);
    const users = await this.prisma.user.findMany({
      where: { batchId, role: 'STUDENT' },
      orderBy: { createdAt: 'desc' },
    });
    const result: BatchMemberDto[] = [];
    for (const user of users) {
      const invitation = await this.prisma.invitation.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      result.push(toBatchMember(user, invitation ? toInvitationDto(invitation) : null));
    }
    return result;
  }

  async previewBatchImport(
    batchId: string,
    institutionId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    mapping?: BatchImportMapping,
  ): Promise<BatchImportResultDto> {
    await this.requireBatch(batchId, institutionId);
    const sheet = await this.readImportSheet(fileBuffer, fileName, mimeType);
    const headers = this.readImportHeaders(sheet);
    if (!mapping) return { imported: 0, skipped: 0, errors: [], headers };
    return this.toImportResult(await this.parseImportRows(sheet, mapping, institutionId), headers);
  }

  async importBatchMembers(
    batchId: string,
    institutionId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    invitedById: string,
    mapping?: BatchImportMapping,
  ): Promise<BatchImportResultDto> {
    await this.requireBatch(batchId, institutionId);
    const sheet = await this.readImportSheet(fileBuffer, fileName, mimeType);
    const headers = this.readImportHeaders(sheet);
    const resolved =
      mapping ?? this.suggestImportMapping(headers) ?? this.positionalMapping(headers);
    const parsed = resolved
      ? await this.parseImportRows(sheet, resolved, institutionId)
      : this.invalidImport('Map the Full Name and Email columns before importing.');

    let imported = 0;
    let existingStudents = 0;
    let newAccounts = 0;
    const errors = [...parsed.errors];
    const newAccountRows = parsed.rows.filter((row) => row.valid && !row.existingStudent).length;
    if (newAccountRows > 0) {
      await this.assertCandidateCapacity(institutionId, newAccountRows);
    }
    for (const row of parsed.rows) {
      if (!row.valid) continue;
      try {
        await this.addBatchMember(
          batchId,
          institutionId,
          {
            fullName: row.fullName,
            email: row.email,
            ...(row.groupLabel ? { groupLabel: row.groupLabel } : {}),
          },
          invitedById,
          { skipCapacityCheck: true },
        );
        imported += 1;
        if (row.existingStudent) existingStudents += 1;
        else newAccounts += 1;
      } catch {
        errors.push({
          row: row.row,
          email: row.email,
          message: 'Candidate could not be imported.',
        });
      }
    }
    // enqueueForBatch sends every pending invitation in the tenant-scoped batch,
    // so the confirmation count must use the same batch-wide semantics.
    const pendingInvitations = await this.prisma.invitation.count({
      where: { batchId, status: 'PENDING' },
    });
    batchImportRows.inc({ outcome: 'imported' }, imported);
    batchImportRows.inc({ outcome: 'skipped' }, errors.length);
    await this.writeAudit(
      invitedById,
      'batch.members_imported',
      'batch',
      batchId,
      'bulk_provisioning',
      {
        institutionId,
        imported,
        skipped: errors.length,
        existingStudents,
        newAccounts,
        pendingInvitations,
      },
    );
    this.logger.log(
      {
        event: 'tpo.batch_import.completed',
        batchId,
        institutionId,
        imported,
        skipped: errors.length,
        existingStudents,
        newAccounts,
        pendingInvitations,
      },
      'TPO batch import completed',
    );
    return {
      ...this.toImportResult(parsed, headers),
      imported,
      skipped: errors.length,
      errors,
      existingStudents,
      newAccounts,
      pendingInvitations,
    };
  }

  private async readImportSheet(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<ExcelJS.Worksheet> {
    const extension = fileName.toLowerCase().match(/\.([^.]+)$/)?.[1];
    if (!extension || !['csv', 'xlsx'].includes(extension)) {
      throw new BadRequestException('Unsupported file type. Upload a .csv or .xlsx file.');
    }
    if (buffer.length === 0) throw new BadRequestException('The uploaded file is empty.');
    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('The uploaded file exceeds the 5 MB limit.');
    }

    const workbook = new ExcelJS.Workbook();
    const hasZipSignature =
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
        (buffer[2] === 0x05 && buffer[3] === 0x06) ||
        (buffer[2] === 0x07 && buffer[3] === 0x08));
    try {
      if (extension === 'xlsx') {
        if (!hasZipSignature) throw new Error('signature');
        await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
      } else {
        const text = buffer.toString('utf8');
        const unsupportedSignature =
          buffer.subarray(0, 4).equals(Buffer.from('%PDF')) ||
          buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
          buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ||
          buffer.subarray(0, 4).equals(Buffer.from('GIF8')) ||
          buffer.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
        const unsupportedMime = /pdf|image|msword|wordprocessingml/i.test(mimeType);
        const controlBytes = [...buffer.subarray(0, 4096)].filter(
          (byte) => byte < 0x20 && ![0x09, 0x0a, 0x0d].includes(byte),
        ).length;
        if (
          hasZipSignature ||
          unsupportedSignature ||
          unsupportedMime ||
          controlBytes > 0 ||
          text.includes('\ufffd')
        ) {
          throw new Error('content');
        }
        await workbook.csv.read(Readable.from(text.replace(/^\uFEFF/, '')));
      }
    } catch {
      throw new BadRequestException(
        `Could not read ${extension.toUpperCase()} file. Check that it is not corrupted or mislabeled.`,
      );
    }
    const sheet = workbook.worksheets[0];
    if (!sheet)
      throw new BadRequestException('The uploaded spreadsheet has no readable worksheet.');
    if (sheet.rowCount - 1 > MAX_BATCH_IMPORT_ROWS) {
      throw new BadRequestException(
        `The spreadsheet exceeds the ${String(MAX_BATCH_IMPORT_ROWS)} candidate row limit.`,
      );
    }
    return sheet;
  }

  private readImportHeaders(sheet: ExcelJS.Worksheet): string[] {
    const headers: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
      const header = String(cell.text ?? '').trim();
      if (header) headers.push(header);
    });
    if (headers.length === 0) throw new BadRequestException('Row 1 must contain column headers.');
    const normalized = headers.map((header) => header.toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      throw new BadRequestException('Column headers must be unique.');
    }
    return headers;
  }

  private suggestImportMapping(headers: string[]): BatchImportMapping | undefined {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const find = (aliases: string[]) =>
      headers.find((header) => aliases.includes(normalize(header)));
    const fullName = find(['name', 'fullname', 'studentname', 'candidatename']);
    const email = find(['email', 'emailaddress', 'mail']);
    const groupLabel = find(['group', 'department', 'section', 'class', 'division']);
    if (!fullName || !email) return undefined;
    return { fullName, email, ...(groupLabel ? { groupLabel } : {}) };
  }

  private positionalMapping(headers: string[]): BatchImportMapping | undefined {
    if (headers.length < 2) return undefined;
    return {
      fullName: headers[0] ?? '',
      email: headers[1] ?? '',
      ...(headers[2] ? { groupLabel: headers[2] } : {}),
    };
  }

  private async parseImportRows(
    sheet: ExcelJS.Worksheet,
    mapping: BatchImportMapping,
    institutionId: string,
  ): Promise<ParsedBatchImport> {
    const headerColumns = new Map<string, number>();
    sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, column) => {
      const header = String(cell.text ?? '').trim();
      if (header) headerColumns.set(header, column);
    });
    const nameColumn = headerColumns.get(mapping.fullName);
    const emailColumn = headerColumns.get(mapping.email);
    const groupColumn = mapping.groupLabel ? headerColumns.get(mapping.groupLabel) : undefined;
    if (!nameColumn || !emailColumn || (mapping.groupLabel && !groupColumn)) {
      return this.invalidImport('One or more mapped columns are not present in row 1.');
    }
    if (sheet.rowCount < 2) return this.invalidImport('The spreadsheet has no candidate rows.');

    const rows: BatchImportPreviewRowDto[] = [];
    const errors: BatchImportResultDto['errors'] = [];
    const seenEmails = new Set<string>();
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const source = sheet.getRow(rowNumber);
      const fullName = String(source.getCell(nameColumn).text ?? '').trim();
      const email = String(source.getCell(emailColumn).text ?? '')
        .trim()
        .toLowerCase();
      const groupLabel = groupColumn
        ? String(source.getCell(groupColumn).text ?? '').trim() || undefined
        : undefined;
      let message: string | undefined;
      const candidate = AddBatchMemberRequestSchema.safeParse({ fullName, email, groupLabel });
      if (!fullName && !email && !groupLabel) message = 'Row is empty.';
      else if (!fullName) message = 'Full Name is required.';
      else if (!email) message = 'Email is required.';
      else if (!candidate.success) {
        if (candidate.error.issues.some((issue) => issue.path[0] === 'email')) {
          message = 'Invalid email address.';
        } else if (candidate.error.issues.some((issue) => issue.path[0] === 'fullName')) {
          message = 'Full Name must be between 2 and 200 characters.';
        } else if (candidate.error.issues.some((issue) => issue.path[0] === 'groupLabel')) {
          message = 'Group must be 80 characters or fewer.';
        } else {
          message = 'Row contains invalid data.';
        }
      } else if (seenEmails.has(email)) message = 'Duplicate email in this upload.';
      if (!message) seenEmails.add(email);
      rows.push({
        row: rowNumber,
        fullName,
        email,
        ...(groupLabel ? { groupLabel } : {}),
        valid: !message,
        existingStudent: false,
        ...(message ? { message } : {}),
      });
    }

    const existingUsers = await this.prisma.user.findMany({
      where: { email: { in: rows.filter((row) => row.valid).map((row) => row.email) } },
    });
    const usersByEmail = new Map(existingUsers.map((user) => [user.email.toLowerCase(), user]));
    for (const row of rows) {
      if (!row.valid) continue;
      const existing = usersByEmail.get(row.email);
      if (!existing) continue;
      if (existing.institutionId !== institutionId) {
        row.valid = false;
        row.message = 'Candidate belongs to another institution.';
      } else if (existing.role !== 'STUDENT') {
        row.valid = false;
        row.message = 'Email belongs to a non-student account.';
      } else {
        row.existingStudent = true;
      }
    }
    for (const row of rows) {
      if (!row.valid) {
        errors.push({
          row: row.row,
          ...(row.email ? { email: row.email } : {}),
          message: row.message ?? 'Invalid row.',
        });
      }
    }
    return { rows, errors };
  }

  private invalidImport(message: string): ParsedBatchImport {
    return { rows: [], errors: [{ row: 1, message }] };
  }

  private toImportResult(parsed: ParsedBatchImport, headers: string[]): BatchImportResultDto {
    const validRows = parsed.rows.filter((row) => row.valid).length;
    return {
      imported: 0,
      skipped: parsed.errors.length,
      errors: parsed.errors,
      headers,
      preview: parsed.rows.slice(0, 50),
      totalRows: parsed.rows.length,
      validRows,
      invalidRows: parsed.errors.length,
      existingStudents: parsed.rows.filter((row) => row.valid && row.existingStudent).length,
      newAccounts: parsed.rows.filter((row) => row.valid && !row.existingStudent).length,
      previewTruncated: parsed.rows.length > 50,
    };
  }

  async buildImportTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');
    sheet.addRow(['fullName', 'email', 'group']);
    sheet.addRow(['Jane Doe', 'jane@example.edu', 'Section A']);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async sendBatchInvites(
    batchId: string,
    institutionId: string,
  ): Promise<SendBatchInvitesResultDto> {
    await this.requireBatch(batchId, institutionId);
    const enqueued = await this.invitations.enqueueForBatch(batchId, institutionId);
    return { enqueued };
  }

  async resendStudentInvitation(
    invitationId: string,
    institutionId: string,
  ): Promise<ReturnType<InvitationsService['resend']>> {
    return this.invitations.resend(invitationId, institutionId);
  }

  async revokeStudentInvitation(
    invitationId: string,
    institutionId: string,
  ): Promise<ReturnType<InvitationsService['revoke']>> {
    return this.invitations.revoke(invitationId, institutionId);
  }

  assertInstitutionAccess(userInstitutionId: string | null, institutionId: string): void {
    if (!userInstitutionId || userInstitutionId !== institutionId) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You do not have access to this institution.',
        statusCode: 403,
      });
    }
  }

  private async requireInstitution(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      include: { plan: true },
    });
    if (!institution) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Institution not found.',
        statusCode: 404,
      });
    }
    return institution;
  }

  private async writeAudit(
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    reason: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.auditPublisher.record({
      actorId,
      action,
      resourceType,
      resourceId,
      reasonCode: reason,
      metadata,
    });
  }

  private async toInstitutionDtos(
    rows: Array<{
      id: string;
      name: string;
      domain: string;
      verificationStatus: InstitutionDto['verificationStatus'];
      heldAt: Date | null;
      deactivatedAt: Date | null;
      createdAt: Date;
      plan: { code: PlanCode };
    }>,
  ): Promise<InstitutionDto[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const [users, invitations, batches] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['institutionId', 'role'],
        where: { institutionId: { in: ids }, role: { in: ['STUDENT', 'INSTITUTION_ADMIN'] } },
        _count: { _all: true },
      }),
      this.prisma.invitation.groupBy({
        by: ['institutionId', 'status'],
        where: { institutionId: { in: ids }, role: 'STUDENT' },
        _count: { _all: true },
      }),
      this.prisma.batch.groupBy({
        by: ['institutionId'],
        where: { institutionId: { in: ids } },
        _count: { _all: true },
      }),
    ]);

    return rows.map((row) => {
      const studentCount =
        users.find((item) => item.institutionId === row.id && item.role === 'STUDENT')?._count
          ._all ?? 0;
      const adminCount =
        users.find((item) => item.institutionId === row.id && item.role === 'INSTITUTION_ADMIN')
          ?._count._all ?? 0;
      const invitePendingCount =
        invitations.find((item) => item.institutionId === row.id && item.status === 'PENDING')
          ?._count._all ?? 0;
      const inviteAcceptedCount =
        invitations.find((item) => item.institutionId === row.id && item.status === 'ACCEPTED')
          ?._count._all ?? 0;
      const batchCount = batches.find((item) => item.institutionId === row.id)?._count._all ?? 0;
      return {
        institutionId: row.id,
        name: row.name,
        domain: row.domain,
        planCode: row.plan.code,
        verificationStatus: row.verificationStatus,
        heldAt: row.heldAt?.toISOString() ?? null,
        deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
        studentCount,
        adminCount,
        batchCount,
        invitePendingCount,
        inviteAcceptedCount,
        createdAt: row.createdAt.toISOString(),
      };
    });
  }

  private async requireBatch(batchId: string, institutionId: string) {
    const batch = await this.prisma.batch.findFirst({ where: { id: batchId, institutionId } });
    if (!batch) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Batch not found.',
        statusCode: 404,
      });
    }
    return batch;
  }
}

function toBatchDto(
  batch: { id: string; institutionId: string; name: string; code: string | null; createdAt: Date },
  memberCount: number,
  pendingInviteCount: number,
): BatchDto {
  return {
    batchId: batch.id,
    institutionId: batch.institutionId,
    name: batch.name,
    code: batch.code,
    memberCount,
    pendingInviteCount,
    createdAt: batch.createdAt.toISOString(),
  };
}

function socialUrlsFromOnboarding(onboardingDetails: unknown): {
  linkedinUrl: string | null;
  githubUrl: string | null;
} {
  if (!onboardingDetails || typeof onboardingDetails !== 'object') {
    return { linkedinUrl: null, githubUrl: null };
  }
  const details = onboardingDetails as Record<string, unknown>;
  const linkedin =
    typeof details.linkedinUrl === 'string' && details.linkedinUrl.trim()
      ? details.linkedinUrl.trim()
      : null;
  const github =
    typeof details.githubUrl === 'string' && details.githubUrl.trim()
      ? details.githubUrl.trim()
      : null;
  return { linkedinUrl: linkedin, githubUrl: github };
}

function toBatchMember(
  user: {
    id: string;
    email: string;
    fullName: string;
    groupLabel: string | null;
    emailVerified: boolean;
    heldAt: Date | null;
  },
  invitation: ReturnType<typeof toInvitationDto> | null,
): BatchMemberDto {
  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    groupLabel: user.groupLabel,
    emailVerified: user.emailVerified,
    invitation,
    heldAt: user.heldAt?.toISOString() ?? null,
  };
}
