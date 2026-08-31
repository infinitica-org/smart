import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AddBatchMemberRequest,
  BatchDto,
  BatchImportResultDto,
  BatchMemberDto,
  CreateBatchRequest,
  CreateInstitutionRequest,
  GlobalStudentHitDto,
  InstitutionAdminDto,
  InstitutionDto,
  InstitutionStudentDto,
  InviteUserRequest,
  ListInstitutionStudentsQuery,
  ListInstitutionsQuery,
  SendBatchInvitesResultDto,
  SubscriptionPlanDto,
  TenantActionReason,
  UpdateBatchRequest,
  UpdateInstitutionRequest,
  PlanCode,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { InvitationsService, toInvitationDto } from '../invitations/invitations.service.js';

@Injectable()
export class InstitutionsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(InvitationsService) private readonly invitations: InvitationsService,
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
    return created!;
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
    return dto!;
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
      await this.writeAudit(actorId, 'institution.plan_changed', institutionId, body.planCode, {
        planCode: body.planCode,
      });
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
    await this.writeAudit(actorId, 'institution.held', institutionId, body.reason, {});
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
    await this.writeAudit(actorId, 'institution.hold_released', institutionId, body.reason, {});
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
    await this.writeAudit(actorId, 'institution.deactivated', institutionId, body.reason, {});
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
    await this.writeAudit(actorId, 'institution.restored', institutionId, body.reason, {});
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
      institutionCount: plan._count.institutions,
      entitlements: plan.entitlements.map((row) => ({
        key: row.featureFlag.key,
        name: row.featureFlag.name,
        enabled: row.enabled,
      })),
    }));
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
    await this.writeAudit(actorId, 'student.held', user.id, body.reason, {
      institutionId: user.institutionId,
    });
    const [row] = await this.listInstitutionStudents(user.institutionId!, { q: user.email });
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
    await this.writeAudit(actorId, 'student.hold_released', user.id, body.reason, {
      institutionId: user.institutionId,
    });
    const [row] = await this.listInstitutionStudents(user.institutionId!, { q: user.email });
    return row ?? this.emptyStudent({ ...user, heldAt: null });
  }

  private emptyStudent(user: {
    id: string;
    email: string;
    fullName: string;
    batchId: string | null;
    heldAt: Date | null;
  }): InstitutionStudentDto {
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
  ): Promise<BatchMemberDto> {
    await this.requireBatch(batchId, institutionId);

    const email = body.email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

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

  async importBatchMembers(
    batchId: string,
    institutionId: string,
    fileBuffer: Buffer,
    invitedById: string,
  ): Promise<BatchImportResultDto> {
    await this.requireBatch(batchId, institutionId);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return { imported: 0, skipped: 0, errors: [{ row: 1, message: 'Workbook has no sheets.' }] };
    }

    let imported = 0;
    let skipped = 0;
    const errors: BatchImportResultDto['errors'] = [];

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const fullName = String(row.getCell(1).text ?? '').trim();
      const email = String(row.getCell(2).text ?? '')
        .trim()
        .toLowerCase();
      const groupLabel = String(row.getCell(3).text ?? '').trim() || undefined;

      if (!fullName && !email) continue;
      if (!fullName || !email) {
        errors.push({ row: rowNumber, email, message: 'fullName and email are required.' });
        skipped += 1;
        continue;
      }

      try {
        await this.addBatchMember(
          batchId,
          institutionId,
          { fullName, email, groupLabel },
          invitedById,
        );
        imported += 1;
      } catch (error) {
        const message =
          error instanceof ConflictException
            ? 'User already exists.'
            : error instanceof Error
              ? error.message
              : 'Import failed.';
        errors.push({ row: rowNumber, email, message });
        skipped += 1;
      }
    }

    return { imported, skipped, errors };
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
    resourceId: string,
    reason: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        resourceType: 'institution',
        resourceId,
        reasonCode: reason,
        metadata: metadata as Prisma.InputJsonValue,
      },
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
