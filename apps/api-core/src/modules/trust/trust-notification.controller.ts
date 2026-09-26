import { Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { TrustService } from './trust.service.js';

@ApiTags('trust-notifications')
@Controller(`${API_PREFIX}/users/me/trust-notifications`)
export class TrustNotificationController {
  constructor(@Inject(TrustService) private readonly service: TrustService) {}

  @Get()
  @ApiBearerAuth()
  @Roles('STUDENT', 'INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List candidate trust notifications and enforcement notices.' })
  getUserTrustNotifications(@CurrentUser() user: RequestUser) {
    return this.service.getUserTrustNotifications(user.sub);
  }

  @Post(':id/read')
  @ApiBearerAuth()
  @Roles('STUDENT', 'INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Mark a candidate trust notification as read.' })
  markRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.markNotificationRead(id, user.sub);
  }
}
