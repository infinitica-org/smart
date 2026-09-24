import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Multipart, MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { MAX_COMPANY_VERIFICATION_DOCUMENT_BYTES } from '@smart/contracts';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  SendCorporateEmailVerificationRequestSchema,
  StartCompanyOnboardingRequestSchema,
  UpdateCompanyOnboardingDraftRequestSchema,
  VerifyCorporateEmailRequestSchema,
} from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import { CompanyOnboardingDocumentService } from './company-onboarding-document.service.js';
import { CompanyOnboardingService } from './company-onboarding.service.js';

@ApiTags('company-onboarding')
@Controller(`${API_PREFIX}/public/company/onboarding`)
export class PublicCompanyOnboardingController {
  constructor(
    @Inject(CompanyOnboardingService) private readonly onboarding: CompanyOnboardingService,
    @Inject(CompanyOnboardingDocumentService)
    private readonly documents: CompanyOnboardingDocumentService,
  ) {}

  @Post('sessions')
  @Public()
  @ApiOperation({ summary: 'Start a company self-onboarding session.' })
  @ApiResponse({ status: 201, description: 'Opaque session token and expiry.' })
  startSession(@Body() body: unknown) {
    return this.onboarding.startSession(StartCompanyOnboardingRequestSchema.parse(body));
  }

  @Get('sessions/:sessionToken')
  @Public()
  @ApiOperation({ summary: 'Read onboarding session state for session token holder.' })
  getSession(@Param('sessionToken') sessionToken: string) {
    return this.onboarding.getSession(sessionToken);
  }

  @Patch('sessions/:sessionToken')
  @Public()
  @ApiOperation({ summary: 'Update in-progress onboarding draft fields.' })
  updateDraft(@Param('sessionToken') sessionToken: string, @Body() body: unknown) {
    return this.onboarding.updateDraft(
      sessionToken,
      UpdateCompanyOnboardingDraftRequestSchema.parse(body),
    );
  }

  @Post('sessions/:sessionToken/email/send')
  @Public()
  @ApiOperation({ summary: 'Send or resend corporate email verification code.' })
  sendEmail(@Param('sessionToken') sessionToken: string, @Body() body: unknown) {
    SendCorporateEmailVerificationRequestSchema.parse(body);
    return this.onboarding.sendEmailVerification(sessionToken);
  }

  @Post('sessions/:sessionToken/email/verify')
  @Public()
  @ApiOperation({ summary: 'Verify corporate email with OTP.' })
  verifyEmail(@Param('sessionToken') sessionToken: string, @Body() body: unknown) {
    return this.onboarding.verifyEmail(sessionToken, VerifyCorporateEmailRequestSchema.parse(body));
  }

  @Post('sessions/:sessionToken/submit')
  @Public()
  @ApiOperation({ summary: 'Submit company onboarding for Super Admin review.' })
  submit(@Param('sessionToken') sessionToken: string, @Body() body: unknown) {
    return this.onboarding.submit(sessionToken, body);
  }

  @Post('sessions/:sessionToken/documents')
  @Public()
  @ApiOperation({ summary: 'Upload a company verification document for the current submission.' })
  @ApiResponse({ status: 201, description: 'Document metadata and short-lived download URL.' })
  async uploadDocument(
    @Param('sessionToken') sessionToken: string,
    @Req() request: FastifyRequest,
  ) {
    const partsIter = (
      request as FastifyRequest & { parts: (opts?: unknown) => AsyncIterableIterator<Multipart> }
    ).parts({ limits: { fileSize: MAX_COMPANY_VERIFICATION_DOCUMENT_BYTES } });

    let fileBuffer: Buffer | null = null;
    let fileName = '';
    let mimeType = 'application/octet-stream';
    let documentType = 'OTHER';

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
        message: 'Choose a PDF, JPG, or PNG verification document to upload.',
        statusCode: 400,
      });
    }

    return this.documents.uploadDocument(
      sessionToken,
      { buffer: fileBuffer, fileName, mimeType },
      documentType,
    );
  }

  @Delete('sessions/:sessionToken/documents/:documentId')
  @Public()
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a pending verification document from the current submission.' })
  deleteDocument(
    @Param('sessionToken') sessionToken: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documents.deleteDocument(sessionToken, documentId);
  }
}
