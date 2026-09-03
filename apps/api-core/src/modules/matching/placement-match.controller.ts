import { Body, Controller, ForbiddenException, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, MatchRequestSchema, type ShortlistDto } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { MatchingService } from './matching.service.js';

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
  constructor(@Inject(MatchingService) private readonly matching: MatchingService) {}

  /**
   * V1 is TPO-mediated (ADR 0012). The contract also lists B2B_PARTNER for a
   * later company surface — that is not authorized here.
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
}
