import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, type ListApplicationsResponse } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { ApplicationsService } from './applications.service.js';

@ApiTags('placement')
@Controller(`${API_PREFIX}/me/applications`)
export class MeApplicationsController {
  constructor(@Inject(ApplicationsService) private readonly applications: ApplicationsService) {}

  @Get()
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Candidate My Applications. Poll is enough for V1.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Applications for the authenticated student.' })
  async list(@CurrentUser() user: RequestUser): Promise<ListApplicationsResponse> {
    return this.applications.listForStudent(user.sub);
  }
}
