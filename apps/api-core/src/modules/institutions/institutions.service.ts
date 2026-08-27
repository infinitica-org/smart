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
  InstitutionAdminDto,
  InstitutionDto,
  InviteUserRequest,
  SendBatchInvitesResultDto,
  UpdateBatchRequest,
} from '@smart/contracts';
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
    const institution = await this.prisma.institution.create({
      data: { name: body.name, domain },
    });
    return toInstitutionDto(institution);
  }

  async listInstitutions(): Promise<InstitutionDto[]> {
    const rows = await this.prisma.institution.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map(toInstitutionDto);
  }

  async getInstitution(institutionId: string): Promise<InstitutionDto> {
    const institution = await this.requireInstitution(institutionId);
    return toInstitutionDto(institution);
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
    const institution = await this.prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Institution not found.',
        statusCode: 404,
      });
    }
    return institution;
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

function toInstitutionDto(institution: {
  id: string;
  name: string;
  domain: string;
  createdAt: Date;
}): InstitutionDto {
  return {
    institutionId: institution.id,
    name: institution.name,
    domain: institution.domain,
    createdAt: institution.createdAt.toISOString(),
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

function toBatchMember(
  user: {
    id: string;
    email: string;
    fullName: string;
    groupLabel: string | null;
    emailVerified: boolean;
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
  };
}
