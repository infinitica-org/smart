import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, ResolveReviewFlagRequestSchema } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { CorroborationService } from './corroboration.service.js';

@ApiTags('corroboration')
@Controller(`${API_PREFIX}/admin/corroboration`)
export class CorroborationAdminController {
  constructor(@Inject(CorroborationService) private readonly service: CorroborationService) {}

  @Get('review-flags')
  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending passive-vs-assessment contradiction review flags.' })
  listReviewFlags(@CurrentUser() user: RequestUser, @Query() query: unknown) {
    return this.service.listReviewFlags({ sub: user.sub, role: user.role, inst: user.inst }, query);
  }

  @Post('review-flags/:id/resolve')
  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resolve a review flag (audit only; does not change SkillClaim status).',
  })
  resolveReviewFlag(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = ResolveReviewFlagRequestSchema.parse(body);
    return this.service.resolveReviewFlag(
      { sub: user.sub, role: user.role, inst: user.inst },
      id,
      parsed.resolutionNote,
    );
  }
}
