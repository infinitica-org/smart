import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  API_PREFIX,
  AddBatchMemberRequestSchema,
  BatchImportMappingSchema,
  ConfigureInstitutionSettingsSchema,
  CreateBatchRequestSchema,
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

function requireInstitutionId(user: RequestUser): string {
  if (!user.inst) {
    throw new ForbiddenException({
      error: 'forbidden',
      message: 'Institution admin must belong to an institution.',
      statusCode: 403,
    });
  }
  return user.inst;
}

@Controller(`${API_PREFIX}/tpo`)
@Roles('INSTITUTION_ADMIN')
export class InstitutionsTpoController {
  constructor(@Inject(InstitutionsService) private readonly institutions: InstitutionsService) {}

  @Get('entitlements')
  entitlements(@CurrentUser() user: RequestUser) {
    return this.institutions.resolveInstitutionEntitlements(requireInstitutionId(user));
  }

  @Patch('institution/settings')
  updateInstitutionSettings(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    return this.institutions.updateInstitutionConfiguration(
      requireInstitutionId(user),
      ConfigureInstitutionSettingsSchema.parse(body),
      user.sub,
    );
  }

  @Get('students')
  listStudents(
    @CurrentUser() user: RequestUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.institutions.listInstitutionStudents(
      requireInstitutionId(user),
      ListInstitutionStudentsQuerySchema.parse(
        Object.fromEntries(Object.entries(query).filter(([, value]) => value)),
      ),
    );
  }

  @Post('students/:userId/hold')
  holdStudent(
    @Param('userId') userId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.holdStudent(
      userId,
      TenantActionReasonSchema.parse(body),
      user.sub,
      requireInstitutionId(user),
    );
  }

  @Post('students/:userId/release-hold')
  releaseStudent(
    @Param('userId') userId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.releaseStudent(
      userId,
      TenantActionReasonSchema.parse(body),
      user.sub,
      requireInstitutionId(user),
    );
  }

  @Post('students/:userId/invite-link')
  getStudentInviteLink(@Param('userId') userId: string, @CurrentUser() user: RequestUser) {
    return this.institutions.getStudentInviteLink(userId, requireInstitutionId(user));
  }

  @Post('batches')
  createBatch(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    const institutionId = requireInstitutionId(user);
    return this.institutions.createBatch(
      institutionId,
      CreateBatchRequestSchema.parse(body),
      user.sub,
    );
  }

  @Get('batches')
  listBatches(@CurrentUser() user: RequestUser) {
    return this.institutions.listBatches(requireInstitutionId(user));
  }

  @Get('batches/:batchId')
  getBatch(@Param('batchId') batchId: string, @CurrentUser() user: RequestUser) {
    return this.institutions.getBatch(batchId, requireInstitutionId(user));
  }

  @Patch('batches/:batchId')
  updateBatch(
    @Param('batchId') batchId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.updateBatch(
      batchId,
      requireInstitutionId(user),
      UpdateBatchRequestSchema.parse(body),
    );
  }

  @Post('batches/:batchId/members')
  addMember(
    @Param('batchId') batchId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.addBatchMember(
      batchId,
      requireInstitutionId(user),
      AddBatchMemberRequestSchema.parse(body),
      user.sub,
    );
  }

  @Get('batches/:batchId/members')
  listMembers(@Param('batchId') batchId: string, @CurrentUser() user: RequestUser) {
    return this.institutions.listBatchMembers(batchId, requireInstitutionId(user));
  }

  @Post('batches/:batchId/members/import')
  @RequireFlag('bulk_batch_import')
  async importMembers(
    @Param('batchId') batchId: string,
    @Query('dryRun') dryRun: string | undefined,
    @Req() request: FastifyRequest,
    @CurrentUser() user: RequestUser,
  ) {
    const institutionId = requireInstitutionId(user);

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
    @CurrentUser() user: RequestUser,
    @Res() reply: FastifyReply,
  ) {
    await this.institutions.getBatch(batchId, requireInstitutionId(user));
    const buffer = await this.institutions.buildImportTemplate();
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="smart-student-import-template.xlsx"')
      .send(buffer);
  }

  @Post('batches/:batchId/invites/send')
  sendInvites(@Param('batchId') batchId: string, @CurrentUser() user: RequestUser) {
    return this.institutions.sendBatchInvites(batchId, requireInstitutionId(user));
  }

  @Post('invitations/:invitationId/resend')
  resendInvitation(@Param('invitationId') invitationId: string, @CurrentUser() user: RequestUser) {
    return this.institutions.resendStudentInvitation(invitationId, requireInstitutionId(user));
  }

  @Post('invitations/:invitationId/revoke')
  revokeInvitation(@Param('invitationId') invitationId: string, @CurrentUser() user: RequestUser) {
    return this.institutions.revokeStudentInvitation(invitationId, requireInstitutionId(user));
  }
}
