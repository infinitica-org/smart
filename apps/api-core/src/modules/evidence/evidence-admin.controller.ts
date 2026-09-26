import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, ResolveEvidenceDisputeRequestSchema } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { EvidenceService } from './evidence.service.js';

@ApiTags('admin-evidence')
@Controller(`${API_PREFIX}/admin/evidence-skill-disputes`)
@Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN')
export class EvidenceAdminController {
  constructor(@Inject(EvidenceService) private readonly evidence: EvidenceService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List evidence-to-skill disputes for reviewer action (I319).' })
  listDisputes(@CurrentUser() user: RequestUser, @Query('status') status?: string) {
    return this.evidence.listEvidenceSkillDisputes(user, { status });
  }

  @Post(':disputeId/resolve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve an evidence-to-skill dispute (I319).' })
  resolveDispute(
    @CurrentUser() user: RequestUser,
    @Param('disputeId') disputeId: string,
    @Body() body: unknown,
  ) {
    const input = ResolveEvidenceDisputeRequestSchema.parse(body);
    return this.evidence.resolveEvidenceSkillDispute(user.sub, disputeId, input);
  }
}
