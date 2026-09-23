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
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { Multipart, MultipartFile } from '@fastify/multipart';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  CreateApplicationRequestSchema,
  CreateJobOpeningRequestSchema,
  CreatePlacementEmployerRequestSchema,
  ListJobOpeningsQuerySchema,
  ListPlacementEmployersQuerySchema,
  ListPlacementOutcomesQuerySchema,
  PatchApplicationStageRequestSchema,
  RecordOutcomeRequestSchema,
  UpdatePlacementEmployerRequestSchema,
  type ApplicationConfidenceDto,
  type ApplicationDto,
  type JobOpeningDto,
  type ListApplicationsResponse,
  UploadJobOpeningDocumentResponseSchema,
  UploadJobOpeningLogoResponseSchema,
  type ListJobOpeningsResponse,
  type ListPlacementEmployersResponse,
  type ListPlacementOutcomesResponse,
  type ParseOpeningJdResponse,
  type PlacementEmployerDetail,
  type PlacementEmployerSummary,
  type PlacementRecordDto,
  type UploadJobOpeningDocumentResponse,
  type UploadJobOpeningLogoResponse,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { PlacementEmployersService } from './placement-employers.service.js';
import { PlacementService } from './placement.service.js';
import { EvidenceService } from '../evidence/evidence.service.js';

function requireInstitutionId(user: RequestUser): string {
  if (!user.inst) {
    throw new ForbiddenException({
      error: 'forbidden',
      message: 'Placement staff must belong to an institution.',
      statusCode: 403,
    });
  }
  return user.inst;
}

@ApiTags('placement')
@Controller(`${API_PREFIX}/placement`)
export class PlacementController {
  constructor(
    @Inject(PlacementService) private readonly service: PlacementService,
    @Inject(PlacementEmployersService) private readonly employers: PlacementEmployersService,
    @Inject(EvidenceService) private readonly evidence: EvidenceService,
  ) {}

  @Get('candidates/:studentId/evidence/:evidenceId/versions')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'B2B_PARTNER', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List historical evidence versions for a candidate (VER-01).' })
  listCandidateEvidenceVersions(
    @CurrentUser() user: RequestUser,
    @Param('studentId') studentId: string,
    @Param('evidenceId') evidenceId: string,
  ) {
    return this.evidence.listCandidateEvidenceVersions(user, studentId, evidenceId);
  }

  @Get('candidates/:studentId/evidence/:evidenceId/versions/:versionNumber')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'B2B_PARTNER', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific historical evidence version (VER-01).' })
  getCandidateEvidenceVersion(
    @CurrentUser() user: RequestUser,
    @Param('studentId') studentId: string,
    @Param('evidenceId') evidenceId: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    return this.evidence.getCandidateEvidenceVersion(
      user,
      studentId,
      evidenceId,
      Number.parseInt(versionNumber, 10),
    );
  }

  @Get('_meta')
  meta() {
    return {
      module: 'placement',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'active',
    };
  }

  /**
   * V1 (Launch Roadmap §5/§10, ADR 0012) is TPO-mediated: only the two TPO
   * roles post a JD. The contract route still lists `B2B_PARTNER` for a later
   * company surface — that is deliberately not authorized here.
   */
  @Get('employers')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'List institution employer profiles (Company Repository).' })
  @ApiBearerAuth()
  async listEmployers(
    @CurrentUser() user: RequestUser,
    @Query() query: unknown,
  ): Promise<ListPlacementEmployersResponse> {
    return this.employers.listEmployers(
      requireInstitutionId(user),
      ListPlacementEmployersQuerySchema.parse(query),
    );
  }

  @Post('employers')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Create an employer profile for the Company Repository.' })
  @ApiBearerAuth()
  async createEmployer(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<PlacementEmployerSummary> {
    return this.employers.createEmployer(
      requireInstitutionId(user),
      CreatePlacementEmployerRequestSchema.parse(body),
    );
  }

  @Get('employers/:employerId')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Employer profile with drive history and current openings.' })
  @ApiBearerAuth()
  async getEmployer(
    @CurrentUser() user: RequestUser,
    @Param('employerId') employerId: string,
  ): Promise<PlacementEmployerDetail> {
    return this.employers.getEmployer(requireInstitutionId(user), employerId);
  }

  @Patch('employers/:employerId')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Update an employer profile.' })
  @ApiBearerAuth()
  async updateEmployer(
    @CurrentUser() user: RequestUser,
    @Param('employerId') employerId: string,
    @Body() body: unknown,
  ): Promise<PlacementEmployerSummary> {
    return this.employers.updateEmployer(
      requireInstitutionId(user),
      employerId,
      UpdatePlacementEmployerRequestSchema.parse(body),
    );
  }

  @Post('openings')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Create a structured job opening from INF-05 taxonomy skills.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Opening created in DRAFT.' })
  @ApiResponse({ status: 400, description: 'Invalid structured JD payload.' })
  @ApiResponse({ status: 503, description: 'INF-05 taxonomy is not seeded.' })
  async createOpening(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<JobOpeningDto> {
    return this.service.createOpening(
      requireInstitutionId(user),
      user.sub,
      CreateJobOpeningRequestSchema.parse(body),
    );
  }

  @Post('openings/documents/upload')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Upload a job posting attachment before creating the opening.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Uploaded document metadata for the create payload.' })
  async uploadOpeningDocument(
    @CurrentUser() user: RequestUser,
    @Req() request: FastifyRequest,
  ): Promise<UploadJobOpeningDocumentResponse> {
    const partsIter = (
      request as FastifyRequest & { parts: (opts?: unknown) => AsyncIterableIterator<Multipart> }
    ).parts({ limits: { fileSize: 10 * 1024 * 1024 } });

    let fileBuffer: Buffer | null = null;
    let fileName = '';
    let mimeType = 'application/octet-stream';
    let label = '';

    try {
      for await (const part of partsIter) {
        if (part.type === 'file') {
          const file = part as MultipartFile;
          mimeType = file.mimetype;
          fileName = file.filename;
          fileBuffer = await file.toBuffer();
        } else if (part.type === 'field' && part.fieldname === 'label') {
          label = String(part.value ?? '').trim();
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
        message: 'Choose a PDF, JPG, or PNG document to upload.',
        statusCode: 400,
      });
    }

    const uploaded = await this.service.uploadOpeningDocument(
      requireInstitutionId(user),
      { buffer: fileBuffer, fileName, mimeType },
      label,
    );
    return UploadJobOpeningDocumentResponseSchema.parse(uploaded);
  }

  @Post('openings/logo/upload')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Upload a company logo image before creating the opening.' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'Logo storage key and preview URL for the create payload.',
  })
  async uploadOpeningLogo(
    @CurrentUser() user: RequestUser,
    @Req() request: FastifyRequest,
  ): Promise<UploadJobOpeningLogoResponse> {
    const partsIter = (
      request as FastifyRequest & { parts: (opts?: unknown) => AsyncIterableIterator<Multipart> }
    ).parts({ limits: { fileSize: 2 * 1024 * 1024 } });

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
        message: 'The logo exceeds the 2MB limit or could not be read.',
        statusCode: 400,
      });
    }

    if (!fileBuffer) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Choose a JPG or PNG logo image to upload.',
        statusCode: 400,
      });
    }

    const uploaded = await this.service.uploadOpeningLogo(requireInstitutionId(user), {
      buffer: fileBuffer,
      fileName,
      mimeType,
    });
    return UploadJobOpeningLogoResponseSchema.parse(uploaded);
  }

  @Get('openings')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'List structured job openings for the authenticated TPO institution.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Openings for the caller institution only.' })
  async listOpenings(
    @CurrentUser() user: RequestUser,
    @Query() query: Record<string, string | undefined>,
  ): Promise<ListJobOpeningsResponse> {
    return this.service.listOpenings(
      requireInstitutionId(user),
      ListJobOpeningsQuerySchema.parse(
        Object.fromEntries(Object.entries(query).filter(([, value]) => value)),
      ),
    );
  }

  @Get('openings/:openingId')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Read one job opening owned by the caller institution.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Opening with taxonomy skill requirements.' })
  @ApiResponse({ status: 404, description: 'Unknown opening, or owned by another institution.' })
  async getOpening(
    @CurrentUser() user: RequestUser,
    @Param('openingId') openingId: string,
  ): Promise<JobOpeningDto> {
    return this.service.getOpening(requireInstitutionId(user), openingId);
  }

  @Post('openings/:openingId/parse-jd')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Re-parse JD text into skill@1 requirements (async).' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Parse job enqueued or status returned.' })
  async parseOpeningJd(
    @CurrentUser() user: RequestUser,
    @Param('openingId') openingId: string,
  ): Promise<ParseOpeningJdResponse> {
    return this.service.parseOpeningJd(requireInstitutionId(user), openingId);
  }

  @Get('openings/:openingId/applications')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({
    summary: 'List candidate applications for a job opening owned by caller institution.',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Applications for the job opening.' })
  @ApiResponse({ status: 404, description: 'Unknown opening, or owned by another institution.' })
  async listApplications(
    @CurrentUser() user: RequestUser,
    @Param('openingId') openingId: string,
  ): Promise<ListApplicationsResponse> {
    return this.service.listApplications(requireInstitutionId(user), openingId);
  }

  /**
   * AC-T05 shortlist. The candidate notification itself is SE-T07's job; this
   * route only persists the application and emits the stage-change event.
   */
  @Post('applications')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Shortlist an AC-T04 candidate against a job opening.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Application created in SHORTLISTED.' })
  @ApiResponse({ status: 400, description: 'Invalid shortlist payload.' })
  @ApiResponse({ status: 404, description: 'Unknown opening or student for this institution.' })
  @ApiResponse({ status: 409, description: 'Candidate is already shortlisted for this opening.' })
  async createApplication(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<ApplicationDto> {
    return this.service.createApplication(
      requireInstitutionId(user),
      CreateApplicationRequestSchema.parse(body),
    );
  }

  @Patch('applications/:applicationId/stage')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Update candidate ATS application stage.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Application stage updated.' })
  @ApiResponse({ status: 400, description: 'Invalid stage.' })
  @ApiResponse({
    status: 404,
    description: 'Unknown application, or owned by another institution.',
  })
  async patchApplicationStage(
    @CurrentUser() user: RequestUser,
    @Param('applicationId') applicationId: string,
    @Body() body: unknown,
  ): Promise<ApplicationDto> {
    const parsed = PatchApplicationStageRequestSchema.parse(body);
    return this.service.patchApplicationStage(
      requireInstitutionId(user),
      applicationId,
      parsed.stage,
    );
  }

  @Get('applications/:applicationId/confidence')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({
    summary: 'Read the persisted SE-T02 passed + explanation for a shortlisted application.',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Authoritative passed + explanation, or missing.' })
  @ApiResponse({
    status: 404,
    description: 'Unknown application, or owned by another institution.',
  })
  async getApplicationConfidence(
    @CurrentUser() user: RequestUser,
    @Param('applicationId') applicationId: string,
  ): Promise<ApplicationConfidenceDto> {
    return this.service.getApplicationConfidence(requireInstitutionId(user), applicationId);
  }

  @Post('applications/:applicationId/send-to-company')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({
    summary: 'Send a reviewed SHORTLISTED application to INTERVIEW after a complete SE-T02 result.',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Application is in INTERVIEW (idempotent).' })
  @ApiResponse({
    status: 404,
    description: 'Unknown application, or owned by another institution.',
  })
  @ApiResponse({
    status: 409,
    description: 'Application is not SHORTLISTED or already moved past.',
  })
  @ApiResponse({ status: 422, description: 'SE-T02 confidence result is missing or incomplete.' })
  async sendToCompany(
    @CurrentUser() user: RequestUser,
    @Param('applicationId') applicationId: string,
  ): Promise<ApplicationDto> {
    return this.service.sendToCompany(requireInstitutionId(user), applicationId);
  }

  @Post('outcomes')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Record a real interview/offer outcome for predictive validity.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Placement outcome recorded.' })
  async recordOutcome(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<PlacementRecordDto> {
    return this.service.recordOutcome(
      requireInstitutionId(user),
      RecordOutcomeRequestSchema.parse(body),
    );
  }

  @Get('outcomes')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'List recorded placement outcomes for one company.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Outcomes for the requested company.' })
  async listOutcomes(
    @CurrentUser() user: RequestUser,
    @Query() query: Record<string, string | undefined>,
  ): Promise<ListPlacementOutcomesResponse> {
    const parsed = ListPlacementOutcomesQuerySchema.parse(query);
    return this.service.listOutcomesForCompany(requireInstitutionId(user), parsed.companyName);
  }
}
