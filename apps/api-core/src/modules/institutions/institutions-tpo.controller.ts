import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  API_PREFIX,
  AddBatchMemberRequestSchema,
  BatchImportMappingSchema,
  ConfigureInstitutionSettingsSchema,
  CreateBatchRequestSchema,
  InviteStaffRequestSchema,
  UpdateStaffRoleRequestSchema,
  UpdateStaffCampusRequestSchema,
  ListInstitutionStudentsQuerySchema,
  TenantActionReasonSchema,
  UpdateBatchRequestSchema,
} from '@smart/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Multipart, MultipartFile } from '@fastify/multipart';
import { RequireFlag } from '../../common/guards/feature-flag.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { InstitutionsService } from './institutions.service.js';
import { TenantId } from '../../common/decorators/tenant-id.decorator.js';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard.js';

@Controller(`${API_PREFIX}/tpo`)
@UseGuards(TenantScopeGuard)
@Roles('INSTITUTION_ADMIN')
export class InstitutionsTpoController {
  constructor(@Inject(InstitutionsService) private readonly institutions: InstitutionsService) {}

  @Get('entitlements')
  entitlements(@TenantId() institutionId: string) {
    return this.institutions.resolveInstitutionEntitlements(institutionId);
  }

  @Patch('institution/settings')
  updateInstitutionSettings(
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
    @TenantId() institutionId: string,
  ) {
    return this.institutions.updateInstitutionConfiguration(
      institutionId,
      ConfigureInstitutionSettingsSchema.parse(body),
      user.sub,
    );
  }

  @Get('students')
  listStudents(
    @Query() query: Record<string, string | undefined>,
    @TenantId() institutionId: string,
  ) {
    return this.institutions.listInstitutionStudents(
      institutionId,
      ListInstitutionStudentsQuerySchema.parse(
        Object.fromEntries(Object.entries(query).filter(([, value]) => value)),
      ),
    );
  }

  @Get('students/assigned-to-me')
  @Roles('PLACEMENT_STAFF', 'INSTITUTION_ADMIN')
  listAssignedStudents(@CurrentUser() user: RequestUser, @TenantId() institutionId: string) {
    return this.institutions.listAssignedStudents(institutionId, user.sub);
  }

  @Post('students/:userId/hold')
  holdStudent(
    @Param('userId') userId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
    @TenantId() institutionId: string,
  ) {
    return this.institutions.holdStudent(
      userId,
      TenantActionReasonSchema.parse(body),
      user.sub,
      institutionId,
    );
  }

  @Post('students/:userId/release-hold')
  releaseStudent(
    @Param('userId') userId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
    @TenantId() institutionId: string,
  ) {
    return this.institutions.releaseStudent(
      userId,
      TenantActionReasonSchema.parse(body),
      user.sub,
      institutionId,
    );
  }

  @Post('students/:userId/invite-link')
  getStudentInviteLink(@Param('userId') userId: string, @TenantId() institutionId: string) {
    return this.institutions.getStudentInviteLink(userId, institutionId);
  }

  @Post('batches')
  createBatch(
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
    @TenantId() institutionId: string,
  ) {
    return this.institutions.createBatch(
      institutionId,
      CreateBatchRequestSchema.parse(body),
      user.sub,
    );
  }

  @Get('batches')
  listBatches(@TenantId() institutionId: string) {
    return this.institutions.listBatches(institutionId);
  }

  @Get('batches/:batchId')
  getBatch(@Param('batchId') batchId: string, @TenantId() institutionId: string) {
    return this.institutions.getBatch(batchId, institutionId);
  }

  @Patch('batches/:batchId')
  updateBatch(
    @Param('batchId') batchId: string,
    @Body() body: unknown,
    @TenantId() institutionId: string,
  ) {
    return this.institutions.updateBatch(
      batchId,
      institutionId,
      UpdateBatchRequestSchema.parse(body),
    );
  }

  @Post('batches/:batchId/members')
  addMember(
    @Param('batchId') batchId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
    @TenantId() institutionId: string,
  ) {
    return this.institutions.addBatchMember(
      batchId,
      institutionId,
      AddBatchMemberRequestSchema.parse(body),
      user.sub,
    );
  }

  @Get('batches/:batchId/members')
  listMembers(@Param('batchId') batchId: string, @TenantId() institutionId: string) {
    return this.institutions.listBatchMembers(batchId, institutionId);
  }

  @Post('batches/:batchId/members/import')
  @RequireFlag('bulk_batch_import')
  async importMembers(
    @Param('batchId') batchId: string,
    @Query('dryRun') dryRun: string | undefined,
    @Req() request: FastifyRequest,
    @CurrentUser() user: RequestUser,
    @TenantId() institutionId: string,
  ) {
    const partsIter = (
      request as FastifyRequest & {
        parts: () => AsyncIterableIterator<Multipart>;
      }
    ).parts();

    let fileBuffer: Buffer | null = null;
    let fileName = '';
    let mimeType = 'application/octet-stream';
    let rawMapping: unknown;

    try {
      for await (const part of partsIter) {
        if (part.type === 'file') {
          const file = part as MultipartFile;
          mimeType = file.mimetype;
          fileName = file.filename;
          fileBuffer = await file.toBuffer();
        } else if (part.type === 'field' && part.fieldname === 'mapping') {
          try {
            rawMapping = JSON.parse(String(part.value)) as unknown;
          } catch {
            throw new BadRequestException('Column mapping must be valid JSON.');
          }
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'The uploaded file exceeds the 5 MB limit or could not be read.',
      );
    }

    if (!fileBuffer) {
      throw new BadRequestException('Choose a CSV or XLSX file to upload.');
    }

    const parsedMapping = rawMapping ? BatchImportMappingSchema.safeParse(rawMapping) : undefined;
    if (parsedMapping && !parsedMapping.success) {
      throw new BadRequestException(
        parsedMapping.error.issues[0]?.message ?? 'Column mapping is invalid.',
      );
    }

    if (dryRun === 'true') {
      return this.institutions.previewBatchImport(
        batchId,
        institutionId,
        fileBuffer,
        fileName,
        mimeType,
        parsedMapping?.data,
      );
    }

    return this.institutions.importBatchMembers(
      batchId,
      institutionId,
      fileBuffer,
      fileName,
      mimeType,
      user.sub,
      parsedMapping?.data,
    );
  }

  @Get('batches/:batchId/import-template')
  async importTemplate(
    @Param('batchId') batchId: string,
    @Res() reply: FastifyReply,
    @TenantId() institutionId: string,
  ) {
    await this.institutions.getBatch(batchId, institutionId);
    const buffer = await this.institutions.buildImportTemplate();
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="smart-student-import-template.xlsx"')
      .send(buffer);
  }

  @Post('batches/:batchId/invites/send')
  sendInvites(@Param('batchId') batchId: string, @TenantId() institutionId: string) {
    return this.institutions.sendBatchInvites(batchId, institutionId);
  }

  @Post('invitations/:invitationId/resend')
  resendInvitation(@Param('invitationId') invitationId: string, @TenantId() institutionId: string) {
    return this.institutions.resendStudentInvitation(invitationId, institutionId);
  }

  @Post('invitations/:invitationId/revoke')
  revokeInvitation(@Param('invitationId') invitationId: string, @TenantId() institutionId: string) {
    return this.institutions.revokeStudentInvitation(invitationId, institutionId);
  }

  @Get('staff')
  listStaff(@TenantId() institutionId: string) {
    return this.institutions.listInstitutionStaff(institutionId);
  }

  @Post('staff/invitations')
  inviteStaff(
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
    @TenantId() institutionId: string,
  ) {
    const parsed = InviteStaffRequestSchema.parse(body);
    return this.institutions.inviteStaff(institutionId, parsed, user.sub);
  }

  @Patch('staff/:userId/role')
  updateStaffRole(
    @Param('userId') targetUserId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
    @TenantId() institutionId: string,
  ) {
    const parsed = UpdateStaffRoleRequestSchema.parse(body);
    return this.institutions.updateStaffRole(institutionId, targetUserId, parsed.role, user.sub);
  }

  @Post('staff/:userId/deactivate')
  deactivateStaffAccess(
    @Param('userId') targetUserId: string,
    @CurrentUser() user: RequestUser,
    @TenantId() institutionId: string,
  ) {
    return this.institutions.deactivateStaffAccess(institutionId, targetUserId, user.sub);
  }

  @Patch('staff/:userId/campus')
  updateStaffCampusAccess(
    @Param('userId') targetUserId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
    @TenantId() institutionId: string,
  ) {
    const parsed = UpdateStaffCampusRequestSchema.parse(body);
    return this.institutions.updateStaffCampusAccess(
      institutionId,
      targetUserId,
      parsed.campus,
      user.sub,
    );
  }
}
