import { Controller, Get, Inject, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, type ListNotificationsResponse, type NotificationDto } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('notifications')
@Controller(`${API_PREFIX}/me/notifications`)
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List in-app notifications for the authenticated user.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Recent notifications with unread count.' })
  async list(@CurrentUser() user: RequestUser): Promise<ListNotificationsResponse> {
    return this.service.listForUser(user.sub);
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Mark one notification as read.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Updated notification.' })
  @ApiResponse({ status: 404, description: 'Notification not found for this user.' })
  async markRead(
    @CurrentUser() user: RequestUser,
    @Param('notificationId') notificationId: string,
  ): Promise<NotificationDto> {
    return this.service.markRead(user.sub, notificationId);
  }
}
