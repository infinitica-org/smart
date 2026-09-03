import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, type ListMyApplicationsResponse } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { PlacementService } from './placement.service.js';

/**
 * Candidate My Applications (CN-T06). Path is GET /me/applications so the
 * student identity comes from the access token, not a placement/:studentId URL.
 */
@ApiTags('placement')
@Controller(`${API_PREFIX}/me`)
export class MeApplicationsController {
  constructor(@Inject(PlacementService) private readonly service: PlacementService) {}

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
}
