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
import { AuditAccess } from '../../common/decorators/audit-access.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { EvidenceService } from '../evidence/evidence.service.js';
import { SkillLevelExplanationService } from '../evidence/skill-level-explanation.service.js';
import { PlacementEmployersService } from './placement-employers.service.js';
import { PlacementService } from './placement.service.js';
import { TenantId } from '../../common/decorators/tenant-id.decorator.js';

// No class-level TenantScopeGuard: the evidence-version routes also serve COMPANY,
// B2B_PARTNER and SUPER_ADMIN callers, who have no institution. Institution-scoped
// handlers take @TenantId(), which rejects a caller without one.
@ApiTags('placement')
@Controller(`${API_PREFIX}/placement`)
export class PlacementController {
  constructor(
    @Inject(PlacementService) private readonly service: PlacementService,
    @Inject(PlacementEmployersService) private readonly employers: PlacementEmployersService,
    @Inject(EvidenceService) private readonly evidence: EvidenceService,
    @Inject(SkillLevelExplanationService)
    private readonly skillExplanation: SkillLevelExplanationService,
  ) {}

  @Get('candidates/:studentId/evidence')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'B2B_PARTNER', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get candidate evidence records categorized by provenance (VER-01).' })
  getCandidateEvidenceProvenance(
    @CurrentUser() user: RequestUser,
    @Param('studentId') studentId: string,
  ) {
    return this.evidence.getCandidateEvidenceProvenance(user, studentId);
  }

  @Get('candidates/:studentId/education')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'B2B_PARTNER', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a candidate's relevant education and evidence (T2)." })
  getCandidateEducation(@CurrentUser() user: RequestUser, @Param('studentId') studentId: string) {
    return this.evidence.getCandidateEducation(user, studentId);
  }

  @Get('candidates/:studentId/claims')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'B2B_PARTNER', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get verification status for candidate individual skill claims (T3).' })
  getCandidateSkillClaims(@CurrentUser() user: RequestUser, @Param('studentId') studentId: string) {
    return this.evidence.getCandidateSkillClaims(user, studentId);
  }

  @Get('candidates/:studentId/skills')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'B2B_PARTNER', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a candidate's demonstrated skills and proficiency level (T4)." })
  getCandidateDemonstratedSkills(
    @CurrentUser() user: RequestUser,
    @Param('studentId') studentId: string,
  ) {
    return this.evidence.getCandidateDemonstratedSkills(user, studentId);
  }

  @Get('candidates/:studentId/skills/:skillCode/explanation')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'B2B_PARTNER', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get explanation for a candidate skill (T5).' })
  getCandidateSkillExplanation(
    @CurrentUser() user: RequestUser,
    @Param('studentId') studentId: string,
    @Param('skillCode') skillCode: string,
  ) {
    return this.skillExplanation.getCandidateSkillExplanation(user, studentId, skillCode);
  }

  @Post('candidates/:studentId/evidence/:evidenceId/review')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Reviewer marks candidate evidence accepted, rejected, or needing information (VER-01).',
  })
  reviewCandidateEvidence(
    @CurrentUser() user: RequestUser,
    @Param('studentId') studentId: string,
    @Param('evidenceId') evidenceId: string,
    @Body() body: unknown,
  ) {
    return this.evidence.reviewEvidence(user, studentId, evidenceId, body);
  }

  @Get('candidates/:studentId/evidence/:evidenceId/versions')
  @AuditAccess('evidence', 'evidenceId', {
    action: 'evidence.accessed',
    subjectParam: 'studentId',
  })
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
  @AuditAccess('evidence', 'evidenceId', {
    action: 'evidence.accessed',
    subjectParam: 'studentId',
  })
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
    @Query() query: unknown,
    @TenantId() institutionId: string,
  ): Promise<ListPlacementEmployersResponse> {
    return this.employers.listEmployers(
      institutionId,
      ListPlacementEmployersQuerySchema.parse(query),
    );
  }

  @Post('employers')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Create an employer profile for the Company Repository.' })
  @ApiBearerAuth()
  async createEmployer(
    @Body() body: unknown,
    @TenantId() institutionId: string,
  ): Promise<PlacementEmployerSummary> {
    return this.employers.createEmployer(
      institutionId,
      CreatePlacementEmployerRequestSchema.parse(body),
    );
  }

  @Get('employers/:employerId')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Employer profile with drive history and current openings.' })
  @ApiBearerAuth()
  async getEmployer(
    @Param('employerId') employerId: string,
    @TenantId() institutionId: string,
  ): Promise<PlacementEmployerDetail> {
    return this.employers.getEmployer(institutionId, employerId);
  }

  @Patch('employers/:employerId')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Update an employer profile.' })
  @ApiBearerAuth()
  async updateEmployer(
    @Param('employerId') employerId: string,
    @Body() body: unknown,
    @TenantId() institutionId: string,
  ): Promise<PlacementEmployerSummary> {
    return this.employers.updateEmployer(
      institutionId,
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
    @TenantId() institutionId: string,
  ): Promise<JobOpeningDto> {
    return this.service.createOpening(
      institutionId,
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
    @Req() request: FastifyRequest,
    @TenantId() institutionId: string,
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
      institutionId,
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
    @Req() request: FastifyRequest,
    @TenantId() institutionId: string,
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

    const uploaded = await this.service.uploadOpeningLogo(institutionId, {
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
    @Query() query: Record<string, string | undefined>,
    @TenantId() institutionId: string,
  ): Promise<ListJobOpeningsResponse> {
    return this.service.listOpenings(
      institutionId,
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
    @Param('openingId') openingId: string,
    @TenantId() institutionId: string,
  ): Promise<JobOpeningDto> {
    return this.service.getOpening(institutionId, openingId);
  }

  @Post('openings/:openingId/parse-jd')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Re-parse JD text into skill@1 requirements (async).' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Parse job enqueued or status returned.' })
  async parseOpeningJd(
    @Param('openingId') openingId: string,
    @TenantId() institutionId: string,
  ): Promise<ParseOpeningJdResponse> {
    return this.service.parseOpeningJd(institutionId, openingId);
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
    @Param('openingId') openingId: string,
    @TenantId() institutionId: string,
  ): Promise<ListApplicationsResponse> {
    return this.service.listApplications(institutionId, openingId);
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
    @Body() body: unknown,
    @TenantId() institutionId: string,
  ): Promise<ApplicationDto> {
    return this.service.createApplication(
      institutionId,
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
    @Param('applicationId') applicationId: string,
    @Body() body: unknown,
    @TenantId() institutionId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ApplicationDto> {
    const parsed = PatchApplicationStageRequestSchema.parse(body);
    return this.service.patchApplicationStage(institutionId, applicationId, parsed.stage, user.sub);
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
    @Param('applicationId') applicationId: string,
    @TenantId() institutionId: string,
  ): Promise<ApplicationConfidenceDto> {
    return this.service.getApplicationConfidence(institutionId, applicationId);
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
    @Param('applicationId') applicationId: string,
    @TenantId() institutionId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ApplicationDto> {
    return this.service.sendToCompany(institutionId, applicationId, user.sub);
  }

  @Post('outcomes')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Record a real interview/offer outcome for predictive validity.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Placement outcome recorded.' })
  async recordOutcome(
    @Body() body: unknown,
    @TenantId() institutionId: string,
  ): Promise<PlacementRecordDto> {
    return this.service.recordOutcome(institutionId, RecordOutcomeRequestSchema.parse(body));
  }

  @Get('outcomes')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'List recorded placement outcomes for one company.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Outcomes for the requested company.' })
  async listOutcomes(
    @Query() query: Record<string, string | undefined>,
    @TenantId() institutionId: string,
  ): Promise<ListPlacementOutcomesResponse> {
    const parsed = ListPlacementOutcomesQuerySchema.parse(query);
    return this.service.listOutcomesForCompany(institutionId, parsed.companyName);
  }
}
