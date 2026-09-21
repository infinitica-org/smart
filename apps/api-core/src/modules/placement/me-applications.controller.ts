import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  UuidSchema,
  type ListMyApplicationsResponse,
  type MatchFitDto,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { MatchingService } from '../matching/matching.service.js';
import { PlacementService } from './placement.service.js';

/**
 * Candidate My Applications (CN-T06). Path is GET /me/applications so the
 * student identity comes from the access token, not a placement/:studentId URL.
 */
@ApiTags('placement')
@Controller(`${API_PREFIX}/me`)
export class MeApplicationsController {
  constructor(
    @Inject(PlacementService) private readonly service: PlacementService,
    @Inject(MatchingService) private readonly matching: MatchingService,
  ) {}

  @Get('applications')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List the authenticated candidate applications with live ATS stage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Own applications only; poll to pick up CO-T02 stage changes.',
  })
  async listMyApplications(@CurrentUser() user: RequestUser): Promise<ListMyApplicationsResponse> {
    return this.service.listMyApplications(user.sub, user.inst);
  }

  @Get('applications/:applicationId/fit')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Skill and capability fit for a shortlisted application.' })
  @ApiResponse({ status: 200, description: 'Structured fit for the authenticated student.' })
  async getApplicationFit(
    @CurrentUser() user: RequestUser,
    @Param('applicationId') applicationId: string,
  ): Promise<MatchFitDto> {
    return this.matching.getApplicationFit(user.sub, UuidSchema.parse(applicationId));
  }
}
