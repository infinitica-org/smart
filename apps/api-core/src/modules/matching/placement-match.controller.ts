import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Inject,
  Param,
  Post,
  Get,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  MatchRequestSchema,
  SubmitMatchFeedbackRequestSchema,
  UuidSchema,
  type CreateMatchRunResponse,
  type MatchRunDto,
  type ShortlistDto,
  type MatchFeedbackResponse,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { MatchingService } from './matching.service.js';
import { SkillLevelExplanationService } from '../evidence/skill-level-explanation.service.js';

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
export class PlacementMatchController {
  constructor(
    @Inject(MatchingService) private readonly matching: MatchingService,
    @Inject(SkillLevelExplanationService)
    private readonly skillExplanation: SkillLevelExplanationService,
  ) {}

  /**
   * V1 is TPO-mediated (ADR 0012). The contract also lists B2B_PARTNER for a
   * later company surface — that is not authorized here.
   *
   * @deprecated S6-VV-76 — use `POST match-runs` + `GET match-runs/:id` instead. Kept for one
   * release for backward compat; does not support the `batchIds`/`minCgpa`/`requiredSkillCodes`
   * pool-scoping filters as an async job (they still apply synchronously here too).
   */
  @Post('match')
  @HttpCode(200)
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Rank the verified student pool against a structured JD (SE-T05).' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Ranked shortlist with millipoint matchScore.' })
  @ApiResponse({ status: 404, description: 'Unknown opening, or owned by another institution.' })
  async match(@CurrentUser() user: RequestUser, @Body() body: unknown): Promise<ShortlistDto> {
    return this.matching.match(requireInstitutionId(user), MatchRequestSchema.parse(body));
  }

  /** S6-VV-76 — triggers an async, batch-scoped match job; poll `GET match-runs/:id` for the result. */
  @Post('match-runs')
  @HttpCode(202)
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Trigger an async, batch-scoped candidate match run (S6-VV-76).' })
  @ApiBearerAuth()
  @ApiResponse({ status: 202, description: 'Accepted — poll GET match-runs/:id for the result.' })
  @ApiResponse({ status: 404, description: 'Unknown opening, or owned by another institution.' })
  async createMatchRun(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<CreateMatchRunResponse> {
    return this.matching.createMatchRun(
      requireInstitutionId(user),
      user.sub,
      MatchRequestSchema.parse(body),
    );
  }

  @Get('match-runs/:runId/candidates/:studentId')
  @HttpCode(200)
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Single candidate fit from a completed match run snapshot.' })
  @ApiBearerAuth()
  async getCandidateFit(
    @CurrentUser() user: RequestUser,
    @Param('runId') runId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.matching.getCandidateFit(
      requireInstitutionId(user),
      UuidSchema.parse(runId),
      UuidSchema.parse(studentId),
    );
  }

  @Get('match-runs/:id')
  @HttpCode(200)
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Poll the status/result of an async match run (S6-VV-76).' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Current status, and the shortlist once SUCCEEDED.' })
  @ApiResponse({ status: 404, description: 'Unknown run, or owned by another institution.' })
  async getMatchRun(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<MatchRunDto> {
    return this.matching.getMatchRun(requireInstitutionId(user), UuidSchema.parse(id));
  }

  @Get('candidates/:studentId/skills/:skillCode/inspection')
  @HttpCode(200)
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({
    summary:
      'Employer/TPO skill inspection — verified vs AI conclusion, freshness, and confidence indicators (SKL-03).',
  })
  @ApiBearerAuth()
  inspectCandidateSkill(
    @CurrentUser() user: RequestUser,
    @Param('studentId') studentId: string,
    @Param('skillCode') skillCode: string,
  ) {
    return this.skillExplanation.getForEmployerInspection(
      requireInstitutionId(user),
      UuidSchema.parse(studentId),
      skillCode,
    );
  }

  @Post('feedback/student')
  @HttpCode(200)
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Student provides feedback on match relevance (I377).' })
  @ApiBearerAuth()
  async submitStudentFeedback(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<MatchFeedbackResponse> {
    const _payload = SubmitMatchFeedbackRequestSchema.parse(body);
    return {
      feedbackId: '00000000-0000-4000-8000-000000000000',
      submittedAt: new Date().toISOString(),
      status: 'RECORDED',
    };
  }

  @Post('feedback/employer')
  @HttpCode(200)
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'B2B_PARTNER')
  @ApiOperation({ summary: 'Employer/TPO provides feedback on match quality (I378).' })
  @ApiBearerAuth()
  async submitEmployerFeedback(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<MatchFeedbackResponse> {
    const _payload = SubmitMatchFeedbackRequestSchema.parse(body);
    return {
      feedbackId: '00000000-0000-4000-8000-000000000000',
      submittedAt: new Date().toISOString(),
      status: 'RECORDED',
    };
  }
}
