import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Multipart, MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import {
  API_PREFIX,
  AddCertificateSkillsRequestSchema,
  CreateCandidateCertificateRequestSchema,
  CreateCertificateEndorsementRequestSchema,
  SubmitCertificateAgendaRequestSchema,
  UpdateCertificateLearningRequestSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { CandidateCertificatesService } from './candidate-certificates.service.js';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

@ApiTags('candidate-certificates')
@Controller(`${API_PREFIX}/candidate-certificates`)
@Roles('STUDENT')
export class CandidateCertificatesController {
  constructor(
    @Inject(CandidateCertificatesService) private readonly service: CandidateCertificatesService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Declare a new external certificate (title + issuer).' })
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const parsed = CreateCandidateCertificateRequestSchema.parse(body);
    return this.service.create(user.sub, parsed);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the caller's own declared certificates." })
  listMine(@CurrentUser() user: RequestUser) {
    return this.service.listMine(user.sub);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one owned certificate.' })
  getOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.getOwned(user.sub, id);
  }

  @Post(':id/upload')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload the certificate file (PDF/JPG/PNG, max 10MB).' })
  async upload(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ) {
    const partsIter = (
      request as FastifyRequest & { parts: (opts?: unknown) => AsyncIterableIterator<Multipart> }
    ).parts({ limits: { fileSize: MAX_UPLOAD_BYTES } });

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
        message: 'The uploaded file exceeds the 10MB limit or could not be read.',
        statusCode: 400,
      });
    }

    if (!fileBuffer) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Choose a PDF, JPG, or PNG file to upload.',
        statusCode: 400,
      });
    }

    return this.service.upload(user.sub, id, { buffer: fileBuffer, fileName, mimeType });
  }

  @Post(':id/skills')
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Replace the certificate's claimed skills and self-assessed proficiency.",
  })
  replaceSkills(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = AddCertificateSkillsRequestSchema.parse(body);
    return this.service.replaceSkills(user.sub, id, parsed);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update learning description, tools, and practical-application fields.',
  })
  updateLearning(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = UpdateCertificateLearningRequestSchema.parse(body);
    return this.service.updateLearning(user.sub, id, parsed);
  }

  @Post(':id/agenda')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit syllabus/agenda for agenda-based cert assessment (CV-T02).' })
  submitAgenda(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = SubmitCertificateAgendaRequestSchema.parse(body);
    return this.service.submitAgenda(user.sub, id, parsed);
  }

  @Post(':id/endorsement')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Request a named endorser's (work email only) review; moves the certificate to IN_VERIFICATION.",
  })
  requestEndorsement(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = CreateCertificateEndorsementRequestSchema.parse(body);
    return this.service.requestEndorsement(user.sub, id, parsed);
  }

  @Get(':id/verification/events')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List the audit-trail events for one certificate.' })
  listEvents(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.listEvents(user.sub, id);
  }
}
