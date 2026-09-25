import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Inject,
  Param,
  Post,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  MatchRequestSchema,
  SaveCandidateRequestSchema,
  SearchStudentsQuerySchema,
  SubmitMatchFeedbackRequestSchema,
  UuidSchema,
  type CandidateMatchDto,
  type CreateMatchRunResponse,
  type ListSavedCandidatesResponse,
  type MatchRunDto,
  type ShortlistDto,
  type MatchFeedbackResponse,
  type MatchFeedbackSummaryDto,
  type SavedCandidateDto,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { AuditAccess } from '../../common/decorators/audit-access.decorator.js';
import { MatchingService } from './matching.service.js';
import { SkillLevelExplanationService } from '../evidence/skill-level-explanation.service.js';
import { TenantId } from '../../common/decorators/tenant-id.decorator.js';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard.js';

@ApiTags('placement')
@Controller(`${API_PREFIX}/placement`)
@UseGuards(TenantScopeGuard)
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
  async match(@Body() body: unknown, @TenantId() institutionId: string): Promise<ShortlistDto> {
    return this.matching.match(institutionId, MatchRequestSchema.parse(body));
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
    @TenantId() institutionId: string,
  ): Promise<CreateMatchRunResponse> {
    return this.matching.createMatchRun(institutionId, user.sub, MatchRequestSchema.parse(body));
  }

  @Get('match-runs/:runId/candidates/:studentId')
  @AuditAccess('user', 'studentId')
  @HttpCode(200)
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Single candidate fit from a completed match run snapshot.' })
  @ApiBearerAuth()
  async getCandidateFit(
    @Param('runId') runId: string,
    @Param('studentId') studentId: string,
    @TenantId() institutionId: string,
  ) {
    return this.matching.getCandidateFit(
      institutionId,
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
    @Param('id') id: string,
    @TenantId() institutionId: string,
  ): Promise<MatchRunDto> {
    return this.matching.getMatchRun(institutionId, UuidSchema.parse(id));
  }

  @Get('candidates/:studentId/skills/:skillCode/inspection')
  @AuditAccess('user', 'studentId')
  @HttpCode(200)
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({
    summary:
      'Employer/TPO skill inspection — verified vs AI conclusion, freshness, and confidence indicators (SKL-03).',
  })
  @ApiBearerAuth()
  inspectCandidateSkill(
    @Param('studentId') studentId: string,
    @Param('skillCode') skillCode: string,
    @TenantId() institutionId: string,
  ) {
    return this.skillExplanation.getForEmployerInspection(
      institutionId,
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
    const payload = SubmitMatchFeedbackRequestSchema.parse(body);
    return this.matching.recordMatchFeedback(user.sub, 'STUDENT', payload);
  }

  @Post('feedback/employer')
  @HttpCode(200)
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'B2B_PARTNER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Employer/TPO provides feedback on match quality (I378).' })
  @ApiBearerAuth()
  async submitEmployerFeedback(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<MatchFeedbackResponse> {
    const payload = SubmitMatchFeedbackRequestSchema.parse(body);
    return this.matching.recordMatchFeedback(user.sub, 'EMPLOYER', payload);
  }

  @Get('feedback/summary')
  @HttpCode(200)
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'B2B_PARTNER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Aggregated match feedback metrics and satisfaction rate (I376).' })
  @ApiBearerAuth()
  async getFeedbackSummary(
    @Query('openingId') openingId?: string,
    @Query('targetType') targetType?: 'STUDENT' | 'EMPLOYER',
  ): Promise<MatchFeedbackSummaryDto> {
    return this.matching.getMatchFeedbackSummary({ openingId, targetType });
  }

  @Get('students/search')
  @HttpCode(200)
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'B2B_PARTNER', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Search assessed student candidates with multidimensional filters (I399).',
  })
  @ApiBearerAuth()
  async searchStudents(
    @CurrentUser() user: RequestUser,
    @Query() query: Record<string, string | undefined>,
  ): Promise<CandidateMatchDto[]> {
    const parsed = SearchStudentsQuerySchema.parse(query);
    return this.matching.searchStudents(user, parsed);
  }

  @Get('saved-candidates')
  @HttpCode(200)
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'B2B_PARTNER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List bookmarked candidate profiles (I401).' })
  @ApiBearerAuth()
  async listSavedCandidates(
    @CurrentUser() user: RequestUser,
  ): Promise<ListSavedCandidatesResponse> {
    return this.matching.listSavedCandidates(user.sub);
  }

  @Post('saved-candidates')
  @HttpCode(200)
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'B2B_PARTNER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Bookmark a candidate profile (I401).' })
  @ApiBearerAuth()
  async saveCandidate(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<SavedCandidateDto> {
    const payload = SaveCandidateRequestSchema.parse(body);
    return this.matching.saveCandidate(user.sub, payload);
  }

  @Delete('saved-candidates/:studentId')
  @HttpCode(200)
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'B2B_PARTNER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Remove a bookmarked candidate profile (I401).' })
  @ApiBearerAuth()
  async removeSavedCandidate(
    @CurrentUser() user: RequestUser,
    @Param('studentId') studentId: string,
  ): Promise<{ success: boolean }> {
    return this.matching.removeSavedCandidate(user.sub, UuidSchema.parse(studentId));
  }
}
