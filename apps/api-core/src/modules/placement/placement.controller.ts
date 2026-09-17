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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  CreateApplicationRequestSchema,
  CreateJobOpeningRequestSchema,
  ListJobOpeningsQuerySchema,
  PatchApplicationStageRequestSchema,
  RecordOutcomeRequestSchema,
  type ApplicationConfidenceDto,
  type ApplicationDto,
  type JobOpeningDto,
  type ListApplicationsResponse,
  type ListJobOpeningsResponse,
  type PlacementRecordDto,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { PlacementService } from './placement.service.js';

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
  constructor(@Inject(PlacementService) private readonly service: PlacementService) {}

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
}
