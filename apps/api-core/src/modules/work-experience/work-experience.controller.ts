import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Multipart, MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { API_PREFIX, type SendManagerEndorsementDto } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { WorkExperienceService } from './work-experience.service.js';

const WE_PROOF_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

@ApiTags('work-experience')
@Controller(`${API_PREFIX}/users/me/work-experiences`)
export class WorkExperienceController {
  constructor(@Inject(WorkExperienceService) private readonly service: WorkExperienceService) {}

  @Get()
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List candidate work experience entries with document metadata.' })
  @ApiResponse({ status: 200, description: 'List of candidate work experience entries.' })
  list(@CurrentUser() user: RequestUser) {
    return this.service.listForStudent(user.sub);
  }

  @Get('ops-dashboard')
  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Ops Dashboard items for work experience verification monitoring.' })
  @ApiResponse({ status: 200, description: 'Ops Dashboard items list.' })
  getOpsDashboard(@CurrentUser() user: RequestUser) {
    return this.service.getOpsDashboard(user);
  }

  @Get(':id')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single candidate work experience record by ID.' })
  @ApiResponse({ status: 200, description: 'Candidate work experience record.' })
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.getForStudent(user.sub, id);
  }

  @Post()
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a candidate work experience entry.' })
  @ApiResponse({ status: 201, description: 'Created work experience entry.' })
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.create(user.sub, body);
  }

  @Put(':id')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update candidate work experience entry.' })
  @ApiResponse({ status: 200, description: 'Updated work experience entry.' })
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    return this.service.update(user.sub, id, body);
  }

  @HttpCode(204)
  @Delete(':id')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete candidate work experience entry.' })
  @ApiResponse({ status: 204, description: 'Work experience entry deleted.' })
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.delete(user.sub, id);
  }

  @Get(':id/responsibilities')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List structured responsibilities for a work experience entry.' })
  @ApiResponse({ status: 200, description: 'Structured responsibilities list.' })
  listResponsibilities(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.listStructuredResponsibilities(user.sub, id);
  }

  @Patch(':id/responsibilities')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace structured responsibilities for a work experience entry.' })
  @ApiResponse({ status: 200, description: 'Updated structured responsibilities list.' })
  replaceResponsibilities(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.replaceStructuredResponsibilities(user.sub, id, body);
  }

  @Post(':id/documents')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach proof document metadata to a work experience record.' })
  @ApiResponse({ status: 201, description: 'Attached proof document metadata.' })
  attachDocument(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    return this.service.attachDocument(user.sub, id, body);
  }

  @Post(':id/documents/upload')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload a proof document file and attach it to a work experience record.',
  })
  @ApiResponse({ status: 201, description: 'Uploaded and attached proof document.' })
  async uploadDocument(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ) {
    const partsIter = (
      request as FastifyRequest & { parts: (opts?: unknown) => AsyncIterableIterator<Multipart> }
    ).parts({ limits: { fileSize: WE_PROOF_UPLOAD_MAX_BYTES } });

    let fileBuffer: Buffer | null = null;
    let fileName = '';
    let mimeType = 'application/octet-stream';
    let documentType = 'EXPERIENCE_LETTER';

    try {
      for await (const part of partsIter) {
        if (part.type === 'file') {
          const file = part as MultipartFile;
          mimeType = file.mimetype;
          fileName = file.filename;
          fileBuffer = await file.toBuffer();
        } else if (part.type === 'field' && part.fieldname === 'documentType') {
          documentType = String(part.value ?? '').trim() || documentType;
        }
      }
    } catch {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'The uploaded file exceeds the 5MB limit or could not be read.',
        statusCode: 400,
      });
    }

    if (!fileBuffer) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Choose a PDF, JPG, or PNG proof document to upload.',
        statusCode: 400,
      });
    }

    return this.service.uploadProofDocument(
      user.sub,
      id,
      {
        buffer: fileBuffer,
        fileName,
        mimeType,
      },
      documentType,
    );
  }

  @HttpCode(204)
  @Delete(':id/documents/:documentId')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove proof document attachment from a work experience record.' })
  @ApiResponse({ status: 204, description: 'Proof document attachment removed.' })
  removeDocument(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.service.removeDocument(user.sub, id, documentId);
  }

  @Post(':id/documents/:documentId/validate')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Validate an attached work experience proof document using AI classification.',
  })
  @ApiResponse({ status: 200, description: 'Work experience proof document validation result.' })
  validateDocument(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Body() body?: { rawText?: string },
  ) {
    return this.service.validateProofDocument(user.sub, id, documentId, body?.rawText);
  }
  @Post(':id/send-verification')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dispatch employer verification request to designated verifier.' })
  @ApiResponse({ status: 200, description: 'Employer verification request dispatched.' })
  sendVerification(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.sendEmployerVerification(user.sub, id);
  }

  @Post(':id/send-manager-endorsement')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'WE-T03: Send a 5-day magic link to candidate manager for endorsement.',
  })
  @ApiResponse({ status: 200, description: 'Manager endorsement request dispatched.' })
  sendManagerEndorsement(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: SendManagerEndorsementDto,
  ) {
    return this.service.sendManagerEndorsement(user.sub, id, body);
  }

  @Post(':id/resend-manager-endorsement')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'WE-T03: Resend a reminder email to manager for pending work-experience endorsement.',
  })
  @ApiResponse({ status: 200, description: 'Manager endorsement reminder email queued.' })
  resendManagerEndorsement(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.resendManagerEndorsement(user.sub, id);
  }

  @Post(':id/restart-verification')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restart expired or rejected employer verification request.' })
  @ApiResponse({ status: 200, description: 'Employer verification request restarted.' })
  restartVerification(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.restartEmployerVerification(user.sub, id);
  }
}
