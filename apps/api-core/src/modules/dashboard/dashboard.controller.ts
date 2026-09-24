import { Body, Controller, Get, Inject, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, UpdateProfileViewSettingRequestSchema } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/users/me`)
@Roles('STUDENT')
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly service: DashboardService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'My dashboard summary, from one authorised read model.' })
  getDashboard(@CurrentUser() user: RequestUser) {
    return this.service.getSummary(user.sub);
  }

  @Get('profile-views-setting')
  @ApiOperation({ summary: 'Whether I see the employer profile-view count.' })
  getProfileViewSetting(@CurrentUser() user: RequestUser) {
    return this.service.getProfileViewSetting(user.sub);
  }

  @Put('profile-views-setting')
  @ApiOperation({ summary: 'Choose whether I see the employer profile-view count.' })
  updateProfileViewSetting(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.updateProfileViewSetting(
      user.sub,
      UpdateProfileViewSettingRequestSchema.parse(body),
    );
  }
}
