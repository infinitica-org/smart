import {
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
  CreateBatchRequestSchema,
  ListInstitutionStudentsQuerySchema,
  TenantActionReasonSchema,
  UpdateBatchRequestSchema,
} from '@smart/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
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
  async importMembers(
    @Param('batchId') batchId: string,
    @Req() request: FastifyRequest,
    @CurrentUser() user: RequestUser,
  ) {
    const institutionId = requireInstitutionId(user);
    const file = await (
      request as FastifyRequest & { file: () => Promise<MultipartFile | undefined> }
    ).file();
    if (!file) {
      return { imported: 0, skipped: 0, errors: [{ row: 0, message: 'No file uploaded.' }] };
    }
    const buffer = await file.toBuffer();
    return this.institutions.importBatchMembers(batchId, institutionId, buffer, user.sub);
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
}
