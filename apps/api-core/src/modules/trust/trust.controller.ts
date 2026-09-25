import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  ApplyEnforcementRequestSchema,
  AssignTrustCaseRequestSchema,
  CreateTrustCaseRequestSchema,
  ReverseEnforcementRequestSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { TrustService } from './trust.service.js';
import type { TrustCaseSeverity, TrustCaseStatus } from '../../generated/prisma/index.js';

@ApiTags('admin-trust')
@Controller(`${API_PREFIX}/admin/trust`)
export class TrustController {
  constructor(@Inject(TrustService) private readonly service: TrustService) {}

  @Get('cases')
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN')
  @ApiOperation({ summary: 'List candidate trust cases with optional status/severity filtering.' })
  listCases(
    @Query('status') status?: TrustCaseStatus,
    @Query('severity') severity?: TrustCaseSeverity,
    @Query('candidateId') candidateId?: string,
  ) {
    return this.service.listCases({ status, severity, candidateId });
  }

  @Post('cases')
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Manually mint a candidate trust case.' })
  createCase(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const parsed = CreateTrustCaseRequestSchema.parse(body);
    return this.service.createCase(parsed, user.sub);
  }

  @Get('cases/:caseId')
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN')
  @ApiOperation({
    summary: 'Get full multi-domain trust case detail and supporting evidence timeline.',
  })
  getCaseDetail(@Param('caseId') caseId: string) {
    return this.service.getCaseDetail(caseId);
  }

  @Post('cases/:caseId/assign')
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Assign an admin inspector to a trust case.' })
  assignCase(
    @CurrentUser() user: RequestUser,
    @Param('caseId') caseId: string,
    @Body() body: unknown,
  ) {
    const parsed = AssignTrustCaseRequestSchema.parse(body);
    return this.service.assignCase(caseId, parsed, user.sub);
  }

  @Post('cases/:caseId/enforce')
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'Apply a structured multi-tier enforcement action to a candidate trust case.',
  })
  applyEnforcement(
    @CurrentUser() user: RequestUser,
    @Param('caseId') caseId: string,
    @Body() body: unknown,
  ) {
    const parsed = ApplyEnforcementRequestSchema.parse(body);
    return this.service.applyEnforcementAction(caseId, parsed, user.sub);
  }

  @Post('enforcements/:enforcementId/reverse')
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Reverse an active enforcement action and trigger score restoration.' })
  reverseEnforcement(
    @CurrentUser() user: RequestUser,
    @Param('enforcementId') enforcementId: string,
    @Body() body: unknown,
  ) {
    const parsed = ReverseEnforcementRequestSchema.parse(body);
    return this.service.reverseEnforcementAction(enforcementId, parsed, user.sub);
  }

  @Post('candidates/:candidateId/recalculate')
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'Force recalculation of candidate skill claims and profile activation state.',
  })
  forceRecalculation(@CurrentUser() user: RequestUser, @Param('candidateId') candidateId: string) {
    return this.service.forceScoreRecalculation(candidateId, user.sub);
  }
}
