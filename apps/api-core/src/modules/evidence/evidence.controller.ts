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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Multipart, MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { API_PREFIX } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { EvidenceService } from './evidence.service.js';

const CREDENTIAL_DOCUMENT_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

@ApiTags('evidence')
@Controller(`${API_PREFIX}/users/me`)
export class EvidenceController {
  constructor(@Inject(EvidenceService) private readonly evidence: EvidenceService) {}

  @Get('evidence')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List candidate evidence records.' })
  list(
    @CurrentUser() user: RequestUser,
    @Query('skillCode') skillCode?: string,
    @Query('claimId') claimId?: string,
    @Query('evidenceType') evidenceType?: string,
  ) {
    return this.evidence.listEvidence(user.sub, { skillCode, claimId, evidenceType });
  }

  @Get('evidence-profile')
  @Roles('STUDENT')
  @ApiBearerAuth()
  getProfile(@CurrentUser() user: RequestUser) {
    return this.evidence.getEvidenceProfile(user.sub);
  }

  @Patch('evidence-profile/onboarding-selection')
  @Roles('STUDENT')
  @ApiBearerAuth()
  saveOnboardingSelection(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.evidence.saveOnboardingSelection(user.sub, body);
  }

  @Get('evidence/:id')
  @Roles('STUDENT')
  @ApiBearerAuth()
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.evidence.getEvidence(user.sub, id);
  }

  @Post('evidence')
  @Roles('STUDENT')
  @ApiBearerAuth()
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.evidence.createEvidence(user.sub, body);
  }

  @Patch('evidence/:id')
  @Roles('STUDENT')
  @ApiBearerAuth()
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    return this.evidence.updateEvidence(user.sub, id, body);
  }

  @Post('evidence/:id/link-claim')
  @Roles('STUDENT')
  @ApiBearerAuth()
  linkClaim(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    return this.evidence.linkEvidenceToClaim(user.sub, id, body);
  }

  @Get('credentials')
  @Roles('STUDENT')
  @ApiBearerAuth()
  listCredentials(@CurrentUser() user: RequestUser) {
    return this.evidence.listCredentials(user.sub);
  }

  @Post('credentials')
  @Roles('STUDENT')
  @ApiBearerAuth()
  createCredential(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.evidence.createCredential(user.sub, body);
  }

  @Post('credentials/:id/document/upload')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload a supporting document for a credential (Tier 3 OCR fallback).',
  })
  @ApiResponse({ status: 201, description: 'Uploaded and attached the credential document.' })
  async uploadCredentialDocument(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ) {
    const partsIter = (
      request as FastifyRequest & { parts: (opts?: unknown) => AsyncIterableIterator<Multipart> }
    ).parts({ limits: { fileSize: CREDENTIAL_DOCUMENT_UPLOAD_MAX_BYTES } });

    let fileBuffer: Buffer | null = null;
    let fileName = '';
    let mimeType = 'application/octet-stream';

    try {
      for await (const part of partsIter) {
        if (part.type === 'file') {
          const file = part as MultipartFile;
          mimeType = file.mimetype;
          fileName = file.filename;
          fileBuffer = await file.toBuffer();
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
        message: 'Choose a PDF, JPG, or PNG document to upload.',
        statusCode: 400,
      });
    }

    return this.evidence.uploadCredentialDocument(user.sub, id, {
      buffer: fileBuffer,
      fileName,
      mimeType,
    });
  }

  @Get('passive-signals')
  @Roles('STUDENT')
  @ApiBearerAuth()
  listPassiveSignals(@CurrentUser() user: RequestUser) {
    return this.evidence.listPassiveSignals(user.sub);
  }

  @Post('verification-decisions')
  @Roles('STUDENT', 'SUPER_ADMIN', 'INSTITUTION_ADMIN')
  @ApiBearerAuth()
  createDecision(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.evidence.createVerificationDecision(user.sub, body, user.sub);
  }

  @Get('projects/:id/skill-mappings')
  @Roles('STUDENT')
  @ApiBearerAuth()
  listProjectMappings(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.evidence.listProjectSkillMappings(user.sub, id);
  }

  @Patch('projects/:id/skill-mappings')
  @Roles('STUDENT')
  @ApiBearerAuth()
  replaceProjectMappings(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.evidence.replaceProjectSkillMappings(user.sub, id, body);
  }
}
