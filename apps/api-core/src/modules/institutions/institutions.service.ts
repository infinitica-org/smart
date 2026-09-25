import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AddBatchMemberRequestSchema } from '@smart/contracts';
import type {
  AddBatchMemberRequest,
  AuthenticatedUser,
  BatchDto,
  BatchImportMapping,
  BatchImportPreviewRowDto,
  BatchImportResultDto,
  BatchMemberDto,
  CreateBatchRequest,
  CreateInstitutionRequest,
  ConfigureInstitutionSettings,
  CreatePartnershipRequest,
  ListPartnershipRequestsQuery,
  PartnershipDecisionResponse,
  PartnershipRequest,
  ReviewPartnershipRequest,
  GlobalStudentHitDto,
  GlobalStudentSearchQuery,
  InstitutionAdminDto,
  InstitutionDto,
  InstitutionStudentDto,
  InviteUserRequest,
  InviteStaffRequest,
  PartnerUniversityOptionDto,
  StudentInstitutionPartnershipStatusDto,
  UniversityContactRequestDto,
  UniversityContactRequestStatus,
  StaffMemberDto,
  StaffRole,
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
  InvitePlatformAdminRequest,
  PlatformAdminDto,
  PlanCode,
  SetFeatureFlagOverrideRequest,
  CompanyVerificationReviewDetailDto,
  ResolveVerificationRequest,
  UpdatePlanCapacityRequest,
  VerificationQueueItemDto,
  FeatureFlagDto,
  FeatureFlagOverrideDto,
  FeatureFlagOverrideTenantType,
} from '@smart/contracts';
import { REDIS_TTL_SECONDS } from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import ExcelJS from 'exceljs';
import { batchImportRows, cacheOperations, quotaExceeded } from '@smart/observability';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { resolveRecordActors } from './record-actors.js';
import { buildAuditLogWhere } from './audit-log-query.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { InvitationsService, toInvitationDto } from '../invitations/invitations.service.js';
import { toAuthenticatedUser } from '../auth/auth.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import {
  getCompanyVerificationReviewDetail,
  mapCompanyVerificationQueueItems,
  resolveCompanyVerification,
} from './company-verification-review.js';

const MAX_BATCH_IMPORT_ROWS = 10_000;
const ENTITLEMENTS_CACHE_KEY = (institutionId: string): string =>
  `entitlements:institution:${institutionId}`;

interface ParsedBatchImport {
  rows: BatchImportPreviewRowDto[];
  errors: BatchImportResultDto['errors'];
}

@Injectable()
export class InstitutionsService {
  private readonly logger = new Logger(InstitutionsService.name);
  private readonly partnershipRequests = new Map<string, PartnershipRequest>();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(InvitationsService) private readonly invitations: InvitationsService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  /* -------------------------- partnership requests -------------------------- */

  async createPartnershipRequest(body: CreatePartnershipRequest): Promise<PartnershipRequest> {
    const domain = body.domain.toLowerCase();
    const existingReq = Array.from(this.partnershipRequests.values()).find(
      (r) => r.domain.toLowerCase() === domain && r.status === 'PENDING',
    );
    if (existingReq) {
      throw new ConflictException({
        error: 'conflict',
        message: 'A pending partnership request for this domain already exists.',
        statusCode: 409,
      });
    }

    const now = new Date().toISOString();
    const request: PartnershipRequest = {
      id: randomUUID(),
      name: body.name,
      domain,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      estimatedStudents: body.estimatedStudents,
      notes: body.notes,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    this.partnershipRequests.set(request.id, request);
    this.logger.log(`Partnership request created for ${request.name} (${request.domain})`);
    return request;
  }

  async listPartnershipRequests(
    query: ListPartnershipRequestsQuery,
  ): Promise<{ items: PartnershipRequest[]; total: number }> {
    let requests = Array.from(this.partnershipRequests.values());
    if (query.status) {
      requests = requests.filter((r) => r.status === query.status);
    }
    if (query.query) {
      const q = query.query.toLowerCase();
      requests = requests.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.domain.toLowerCase().includes(q) ||
          r.contactName.toLowerCase().includes(q) ||
          r.contactEmail.toLowerCase().includes(q),
      );
    }
    requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = requests.length;
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const items = requests.slice(offset, offset + limit);
    return { items, total };
  }

  async getPartnershipRequestById(id: string): Promise<PartnershipRequest> {
    const req = this.partnershipRequests.get(id);
    if (!req) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Partnership request not found.',
        statusCode: 404,
      });
    }
    return req;
  }

  async reviewPartnershipRequest(
    id: string,
    body: ReviewPartnershipRequest,
    adminUserId: string,
  ): Promise<PartnershipRequest> {
    const req = await this.getPartnershipRequestById(id);
    const now = new Date().toISOString();
    const updated: PartnershipRequest = {
      ...req,
      status: body.decision,
      reviewNotes: body.reviewNotes ?? req.reviewNotes,
      updatedAt: now,
    };
    this.partnershipRequests.set(id, updated);
    this.logger.log(`Partnership request ${id} updated to ${body.decision} by ${adminUserId}`);
    return updated;
  }

  async provisionUniversityAccount(
    id: string,
    adminUserId: string,
  ): Promise<{ partnershipRequest: PartnershipRequest; institution: InstitutionDto }> {
    const req = await this.getPartnershipRequestById(id);
    if (req.status !== 'APPROVED' && req.status !== 'PENDING') {
      throw new BadRequestException({
        error: 'bad_request',
        message: `Cannot provision an account for a request in status ${req.status}. Must be PENDING or APPROVED.`,
        statusCode: 400,
      });
    }

    const institution = await this.createInstitution({
      name: req.name,
      domain: req.domain,
    });

    const now = new Date().toISOString();
    const updatedReq: PartnershipRequest = {
      ...req,
      status: 'PROVISIONED',
      provisionedInstitutionId: institution.institutionId,
      updatedAt: now,
    };
    this.partnershipRequests.set(id, updatedReq);
    this.logger.log(
      `University account provisioned for ${req.name} (${institution.institutionId}) by ${adminUserId}`,
    );
    return { partnershipRequest: updatedReq, institution };
  }

  async getPartnershipDecision(id: string): Promise<PartnershipDecisionResponse> {
    const req = await this.getPartnershipRequestById(id);

    let nextSteps = 'Your partnership application is currently under review by the SMART team.';
    if (req.status === 'APPROVED') {
      nextSteps =
        'Your partnership request has been approved! SMART is provisioning your university tenant workspace.';
    } else if (req.status === 'PROVISIONED') {
      nextSteps =
        'Your university workspace has been successfully provisioned. Check your email for activation instructions.';
    } else if (req.status === 'MORE_INFO_NEEDED') {
      nextSteps =
        req.reviewNotes ??
        'Additional details are required for your partnership application. Please contact support.';
    } else if (req.status === 'REJECTED') {
      nextSteps =
        req.reviewNotes ?? 'Unfortunately, your partnership request was not approved at this time.';
    }

    return {
      id: req.id,
      name: req.name,
      domain: req.domain,
      status: req.status,
      reviewNotes: req.reviewNotes,
      decisionDate: req.status !== 'PENDING' ? req.updatedAt : undefined,
      nextSteps,
      provisionedInstitutionId: req.provisionedInstitutionId,
    };
  }

  async updateInstitutionConfiguration(
    institutionId: string,
    body: ConfigureInstitutionSettings,
    adminUserId: string,
  ): Promise<InstitutionDto> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!institution) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Institution not found.',
        statusCode: 404,
      });
    }

    const primaryDomain = body.domains?.[0] ?? institution.domain;
    const updated = await this.prisma.institution.update({
      where: { id: institutionId },
      data: {
        name: body.name ?? institution.name,
        domain: primaryDomain,
        updatedById: adminUserId,
      },
      include: { plan: true },
    });

    this.logger.log(
      `Institution settings updated for ${updated.name} (${institutionId}) by ${adminUserId}`,
    );

    const [dto] = await this.toInstitutionDtos([updated]);
    if (!dto) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Institution DTO mapping failed.',
        statusCode: 404,
      });
    }
    return dto;
  }

  /* ----------------------------- platform admin ----------------------------- */

  async createInstitution(
    body: CreateInstitutionRequest,
    actorId: string | null = null,
  ): Promise<InstitutionDto> {
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
      data: {
        name: body.name,
        domain,
        planId: freePlan.id,
        createdById: actorId,
        updatedById: actorId,
      },
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

  /* ----------------------------- partner universities ----------------------------- */

  async listPartnerUniversities(query?: { q?: string }): Promise<PartnerUniversityOptionDto[]> {
    const where: Prisma.InstitutionWhereInput = {
      verificationStatus: 'APPROVED',
      deactivatedAt: null,
      heldAt: null,
    };
    if (query?.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { domain: { contains: q, mode: 'insensitive' } },
      ];
    }

    const institutions = await this.prisma.institution.findMany({
      where,
      select: {
        id: true,
        name: true,
        domain: true,
      },
      orderBy: { name: 'asc' },
    });

    return institutions.map((inst) => ({
      institutionId: inst.id,
      name: inst.name,
      domain: inst.domain,
    }));
  }

  async connectStudentUniversity(
    studentUserId: string,
    institutionId: string,
  ): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      include: {
        institution: true,
        primaryTrack: true,
        secondaryTrack: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Student user not found.',
        statusCode: 404,
      });
    }

    // Idempotency: if student is already connected to this university
    if (user.institutionId === institutionId) {
      return toAuthenticatedUser(user);
    }

    // Verify selected university is an active partner university
    const partnerUniversity = await this.prisma.institution.findFirst({
      where: {
        id: institutionId,
        verificationStatus: 'APPROVED',
        deactivatedAt: null,
        heldAt: null,
      },
    });

    if (!partnerUniversity) {
      throw new UnprocessableEntityException({
        error: 'invalid_partner_university',
        message: 'Selected university is not an active partner university.',
        statusCode: 422,
      });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: studentUserId },
      data: { institutionId },
      include: {
        institution: true,
        primaryTrack: true,
        secondaryTrack: true,
      },
    });

    await this.auditPublisher.record({
      actorId: studentUserId,
      action: 'student.university_connected',
      resourceType: 'user',
      resourceId: studentUserId,
      reasonCode: null,
    });

    return toAuthenticatedUser(updatedUser);
  }

  async getStudentInstitutionPartnershipStatus(
    studentUserId: string,
  ): Promise<StudentInstitutionPartnershipStatusDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      include: { institution: true },
    });

    if (!user) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Student user not found.',
        statusCode: 404,
      });
    }

    if (!user.institutionId || !user.institution) {
      return {
        institutionId: null,
        institutionName: null,
        isPartnered: false,
      };
    }

    const isPartnered =
      user.institution.verificationStatus === 'APPROVED' &&
      user.institution.deactivatedAt === null &&
      user.institution.heldAt === null;

    return {
      institutionId: user.institution.id,
      institutionName: user.institution.name,
      isPartnered,
    };
  }

  async requestUniversityContact(
    studentUserId: string,
    universityName: string,
  ): Promise<UniversityContactRequestDto> {
    const trimmedName = universityName.trim();
    const normalizedUniversityName = trimmedName.toLowerCase();

    // Idempotency: the same student asking SMART to contact the same university
    // name again returns the existing request rather than creating a duplicate.
    const existing = await this.prisma.universityContactRequest.findUnique({
      where: {
        studentUserId_normalizedUniversityName: {
          studentUserId,
          normalizedUniversityName,
        },
      },
    });
    if (existing) {
      return toUniversityContactRequestDto(existing);
    }

    let created;
    try {
      created = await this.prisma.universityContactRequest.create({
        data: {
          studentUserId,
          universityName: trimmedName,
          normalizedUniversityName,
        },
      });
    } catch (err: unknown) {
      // Race: two concurrent submissions for the same (student, university) pair.
      // The unique constraint rejects the loser; treat it as the same idempotent hit.
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        const raced = await this.prisma.universityContactRequest.findUniqueOrThrow({
          where: {
            studentUserId_normalizedUniversityName: {
              studentUserId,
              normalizedUniversityName,
            },
          },
        });
        return toUniversityContactRequestDto(raced);
      }
      throw err;
    }

    await this.auditPublisher.record({
      actorId: studentUserId,
      action: 'student.university_contact_requested',
      resourceType: 'university_contact_request',
      resourceId: created.id,
      reasonCode: null,
      metadata: { universityName: trimmedName },
    });

    return toUniversityContactRequestDto(created);
  }

  async getInstitution(institutionId: string): Promise<InstitutionDto> {
    const institution = await this.requireInstitution(institutionId);
    const [dto] = await this.toInstitutionDtos([institution]);
    if (!dto) {
      throw new Error('Institution DTO mapping returned no rows for an existing institution');
    }
    const [activeStudents30d, actors] = await Promise.all([
      this.countActiveStudents30d(institutionId),
      resolveRecordActors(this.prisma, institution),
    ]);
    return { ...dto, activeStudents30d, ...actors };
  }

  /**
   * Lightweight usage snapshot for the Institution Control Center: distinct students
   * with at least one assessment Attempt started in the trailing 30 days. Deliberately
   * a single current-state number, not a time series — cheap enough for the detail
   * view, not meant for the institutions list (which stays fleet-wide and unfiltered).
   */
  private async countActiveStudents30d(institutionId: string): Promise<number> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeStudents = await this.prisma.attempt.groupBy({
      by: ['userId'],
      where: { startedAt: { gte: cutoff }, user: { institutionId, role: 'STUDENT' } },
      _count: { _all: true },
    });
    return activeStudents.length;
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
    data.updatedBy = { connect: { id: actorId } };
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
      data: { heldAt: new Date(), updatedById: actorId },
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
      data: { heldAt: null, updatedById: actorId },
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
      data: { deactivatedAt: new Date(), updatedById: actorId },
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
      data: { deactivatedAt: null, heldAt: null, updatedById: actorId },
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

  async listAssignedStudents(
    institutionId: string,
    advisorUserId: string,
  ): Promise<InstitutionStudentDto[]> {
    await this.requireInstitution(institutionId);
    const advisor = await this.prisma.user.findFirst({
      where: {
        id: advisorUserId,
        institutionId,
        role: { in: ['PLACEMENT_STAFF', 'INSTITUTION_ADMIN'] },
      },
    });

    if (!advisor) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Advisor user not found for this institution.',
        statusCode: 404,
      });
    }

    const where: Prisma.UserWhereInput = {
      institutionId,
      role: 'STUDENT',
    };

    if (advisor.groupLabel) {
      where.groupLabel = advisor.groupLabel;
    }

    const users = await this.prisma.user.findMany({
      where,
      include: { batch: true },
      orderBy: { fullName: 'asc' },
    });

    if (users.length === 0) return [];

    const invitations = await this.prisma.invitation.findMany({
      where: { userId: { in: users.map((user) => user.id) } },
      orderBy: { createdAt: 'desc' },
    });
    const latestByUser = new Map<string, (typeof invitations)[number]>();
    for (const invitation of invitations) {
      if (!latestByUser.has(invitation.userId)) latestByUser.set(invitation.userId, invitation);
    }

    return users.map((user) => {
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
  }

  async searchStudents(query: GlobalStudentSearchQuery): Promise<GlobalStudentHitDto[]> {
    const { q, institutionId, skillCode, proficiency, verificationStatus } = query;

    const where: Prisma.UserWhereInput = {
      role: 'STUDENT',
      institutionId: institutionId ?? { not: null },
    };
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    const skillClaimWhere: Prisma.SkillClaimWhereInput = {};
    if (skillCode) skillClaimWhere.skill = { code: skillCode };
    if (proficiency) skillClaimWhere.proficiency = proficiency;
    if (verificationStatus) skillClaimWhere.status = verificationStatus;
    if (Object.keys(skillClaimWhere).length > 0) {
      where.skillClaims = { some: skillClaimWhere };
    }

    const users = await this.prisma.user.findMany({
      where,
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

  /** The `FeatureFlag` catalog itself — read-only here; flags are seeded, not admin-authored. */
  async listFeatureFlags(): Promise<FeatureFlagDto[]> {
    const flags = await this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    return flags.map((flag) => ({
      id: flag.id,
      key: flag.key,
      name: flag.name,
      description: flag.description,
      createdAt: flag.createdAt.toISOString(),
    }));
  }

  /**
   * Every `FeatureFlagOverride` row across every institution and company, for the
   * consolidated cross-tenant Overrides view. Per-tenant creation/editing still
   * happens from the institution/company detail pages.
   */
  async listFeatureFlagOverrides(): Promise<FeatureFlagOverrideDto[]> {
    const overrides = await this.prisma.featureFlagOverride.findMany({
      include: { featureFlag: true, institution: true, company: true },
      orderBy: { createdAt: 'desc' },
    });
    return overrides
      .filter((row) => row.institutionId ?? row.companyId)
      .map((row) => {
        const tenantType: FeatureFlagOverrideTenantType = row.institutionId
          ? 'institution'
          : 'company';
        return {
          id: row.id,
          flagKey: row.featureFlag.key,
          flagName: row.featureFlag.name,
          tenantType,
          tenantId: (row.institutionId ?? row.companyId) as string,
          tenantName: row.institution?.name ?? row.company?.name ?? 'Unknown tenant',
          enabled: row.enabled,
          createdAt: row.createdAt.toISOString(),
        };
      });
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
      studentsTotal,
      studentsHeld,
      studentsBlockedByTenant,
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
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      this.prisma.user.count({ where: { role: 'STUDENT', heldAt: { not: null } } }),
      // Mirrors resolveSessionHold(): a student can't log in if their own account is
      // held OR their institution is held/deactivated, even when their own heldAt is null.
      this.prisma.user.count({
        where: {
          role: 'STUDENT',
          heldAt: null,
          institution: { OR: [{ heldAt: { not: null } }, { deactivatedAt: { not: null } }] },
        },
      }),
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
      students: {
        total: studentsTotal,
        active: studentsTotal - studentsHeld - studentsBlockedByTenant,
        held: studentsHeld + studentsBlockedByTenant,
      },
      planMix: plans.map((plan) => ({ code: plan.code, count: plan._count.institutions })),
      openHolds: { institutions: held, students: studentsHeld },
      pendingVerifications: companyPending + institutionPending,
      flaggedAttempts,
      recentAudit: recent.map((row) => this.toAuditDto(row)),
    };
  }

  async listAuditLogs(query: ListAuditLogsQuery = {}): Promise<AuditLogDto[]> {
    const where = buildAuditLogWhere(query);
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
      ...(await mapCompanyVerificationQueueItems(this.prisma, companies)),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getCompanyVerificationReview(
    companyId: string,
  ): Promise<CompanyVerificationReviewDetailDto> {
    return getCompanyVerificationReviewDetail(this.prisma, this.storage, companyId);
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
          updatedById: actorId,
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
    const resolved = await resolveCompanyVerification(
      this.prisma,
      tenantId,
      body,
      actorId,
      async ({ action, resourceType, resourceId, reason, metadata }) => {
        await this.writeAudit(actorId, action, resourceType, resourceId, reason, metadata);
      },
    );
    if (body.decision === 'APPROVED') {
      await this.redis.del(`entitlements:company:${tenantId}`);
      if (resolved.activationEmail) {
        await this.invitations.enqueueCompanyActivationEmail(resolved.activationEmail);
      }
    }
    return resolved.queueItem;
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

  async inviteStaff(
    institutionId: string,
    body: InviteStaffRequest,
    invitedById: string,
  ): Promise<StaffMemberDto> {
    await this.requireInstitution(institutionId);
    const fullName = `${body.firstName.trim()} ${body.lastName.trim()}`;
    const { invitation } = await this.invitations.createAndEnqueue({
      email: body.email,
      fullName,
      role: body.role,
      institutionId,
      groupLabel: body.department ?? null,
      invitedById,
    });
    const dbUser = await this.prisma.user.findFirstOrThrow({
      where: { email: body.email.toLowerCase() },
    });

    await this.writeAudit(
      invitedById,
      'staff.invited',
      'user',
      dbUser.id,
      `Invited university staff member (${body.role})`,
      {
        institutionId,
        email: body.email,
        fullName,
        role: body.role,
        department: body.department ?? null,
      },
    );

    return {
      userId: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      role: body.role as StaffRole,
      groupLabel: dbUser.groupLabel,
      inviteStatus: invitation.status,
      lastSentAt: invitation.lastSentAt,
      acceptedAt: invitation.acceptedAt,
      createdAt: dbUser.createdAt.toISOString(),
    };
  }

  async listInstitutionStaff(institutionId: string): Promise<StaffMemberDto[]> {
    await this.requireInstitution(institutionId);
    const users = await this.prisma.user.findMany({
      where: {
        institutionId,
        role: { in: ['PLACEMENT_STAFF', 'INSTITUTION_ADMIN'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    const result: StaffMemberDto[] = [];
    for (const user of users) {
      const invitation = await this.prisma.invitation.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      result.push({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role as StaffRole,
        groupLabel: user.groupLabel,
        inviteStatus: invitation?.status ?? null,
        lastSentAt: invitation?.lastSentAt?.toISOString() ?? null,
        acceptedAt: invitation?.acceptedAt?.toISOString() ?? null,
        heldAt: user.heldAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      });
    }
    return result;
  }

  async updateStaffRole(
    institutionId: string,
    targetUserId: string,
    newRole: StaffRole,
    actorId: string,
  ): Promise<StaffMemberDto> {
    await this.requireInstitution(institutionId);
    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        institutionId,
        role: { in: ['PLACEMENT_STAFF', 'INSTITUTION_ADMIN'] },
      },
    });

    if (!targetUser) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Staff member not found for this institution.',
        statusCode: 404,
      });
    }

    const invitation = await this.prisma.invitation.findFirst({
      where: { userId: targetUser.id },
      orderBy: { createdAt: 'desc' },
    });

    const previousRole = targetUser.role as StaffRole;

    if (previousRole === newRole) {
      return {
        userId: targetUser.id,
        email: targetUser.email,
        fullName: targetUser.fullName,
        role: previousRole,
        groupLabel: targetUser.groupLabel,
        inviteStatus: invitation?.status ?? null,
        lastSentAt: invitation?.lastSentAt?.toISOString() ?? null,
        acceptedAt: invitation?.acceptedAt?.toISOString() ?? null,
        heldAt: targetUser.heldAt?.toISOString() ?? null,
        createdAt: targetUser.createdAt.toISOString(),
      };
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    await this.writeAudit(
      actorId,
      'staff.role_updated',
      'user',
      targetUserId,
      `Updated staff role from ${previousRole} to ${newRole}`,
      {
        institutionId,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        previousRole,
        newRole,
      },
    );

    return {
      userId: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      role: updatedUser.role as StaffRole,
      groupLabel: updatedUser.groupLabel,
      inviteStatus: invitation?.status ?? null,
      lastSentAt: invitation?.lastSentAt?.toISOString() ?? null,
      acceptedAt: invitation?.acceptedAt?.toISOString() ?? null,
      heldAt: updatedUser.heldAt?.toISOString() ?? null,
      createdAt: updatedUser.createdAt.toISOString(),
    };
  }

  async deactivateStaffAccess(
    institutionId: string,
    targetUserId: string,
    actorId: string,
  ): Promise<StaffMemberDto> {
    await this.requireInstitution(institutionId);
    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        institutionId,
        role: { in: ['PLACEMENT_STAFF', 'INSTITUTION_ADMIN'] },
      },
    });

    if (!targetUser) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Staff member not found for this institution.',
        statusCode: 404,
      });
    }

    const invitation = await this.prisma.invitation.findFirst({
      where: { userId: targetUser.id },
      orderBy: { createdAt: 'desc' },
    });

    if (targetUser.heldAt !== null) {
      return {
        userId: targetUser.id,
        email: targetUser.email,
        fullName: targetUser.fullName,
        role: targetUser.role as StaffRole,
        groupLabel: targetUser.groupLabel,
        inviteStatus: invitation?.status ?? null,
        lastSentAt: invitation?.lastSentAt?.toISOString() ?? null,
        acceptedAt: invitation?.acceptedAt?.toISOString() ?? null,
        heldAt: targetUser.heldAt.toISOString(),
        createdAt: targetUser.createdAt.toISOString(),
      };
    }

    const heldAt = new Date();
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        heldAt,
        heldReason: 'Deactivated by administrator',
      },
    });

    await this.writeAudit(
      actorId,
      'staff.access_deactivated',
      'user',
      targetUserId,
      'Deactivated staff access',
      {
        institutionId,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        previousState: 'ACTIVE',
        newState: 'DEACTIVATED',
        role: updatedUser.role,
      },
    );

    return {
      userId: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      role: updatedUser.role as StaffRole,
      groupLabel: updatedUser.groupLabel,
      inviteStatus: invitation?.status ?? null,
      lastSentAt: invitation?.lastSentAt?.toISOString() ?? null,
      acceptedAt: invitation?.acceptedAt?.toISOString() ?? null,
      heldAt: heldAt.toISOString(),
      createdAt: updatedUser.createdAt.toISOString(),
    };
  }

  async updateStaffCampusAccess(
    institutionId: string,
    targetUserId: string,
    campusLabel: string | null | undefined,
    actorId: string,
  ): Promise<StaffMemberDto> {
    await this.requireInstitution(institutionId);
    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        institutionId,
        role: { in: ['PLACEMENT_STAFF', 'INSTITUTION_ADMIN'] },
      },
    });

    if (!targetUser) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Staff member not found for this institution.',
        statusCode: 404,
      });
    }

    const invitation = await this.prisma.invitation.findFirst({
      where: { userId: targetUser.id },
      orderBy: { createdAt: 'desc' },
    });

    const newGroupLabel = campusLabel && campusLabel.trim().length > 0 ? campusLabel.trim() : null;
    const previousCampusId = targetUser.groupLabel;

    if (previousCampusId === newGroupLabel) {
      return {
        userId: targetUser.id,
        email: targetUser.email,
        fullName: targetUser.fullName,
        role: targetUser.role as StaffRole,
        groupLabel: targetUser.groupLabel,
        inviteStatus: invitation?.status ?? null,
        lastSentAt: invitation?.lastSentAt?.toISOString() ?? null,
        acceptedAt: invitation?.acceptedAt?.toISOString() ?? null,
        heldAt: targetUser.heldAt?.toISOString() ?? null,
        createdAt: targetUser.createdAt.toISOString(),
      };
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { groupLabel: newGroupLabel },
    });

    if (invitation) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { groupLabel: newGroupLabel },
      });
    }

    await this.writeAudit(
      actorId,
      'staff.campus_access_updated',
      'user',
      targetUserId,
      `Updated campus access to ${newGroupLabel ?? 'All Campuses'}`,
      {
        institutionId,
        previousCampusId,
        newCampusId: newGroupLabel,
        role: targetUser.role,
      },
    );

    return {
      userId: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      role: updatedUser.role as StaffRole,
      groupLabel: updatedUser.groupLabel,
      inviteStatus: invitation?.status ?? null,
      lastSentAt: invitation?.lastSentAt?.toISOString() ?? null,
      acceptedAt: invitation?.acceptedAt?.toISOString() ?? null,
      heldAt: updatedUser.heldAt?.toISOString() ?? null,
      createdAt: updatedUser.createdAt.toISOString(),
    };
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

function toUniversityContactRequestDto(row: {
  id: string;
  universityName: string;
  status: string;
  createdAt: Date;
}): UniversityContactRequestDto {
  return {
    id: row.id,
    universityName: row.universityName,
    status: row.status as UniversityContactRequestStatus,
    createdAt: row.createdAt.toISOString(),
  };
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
