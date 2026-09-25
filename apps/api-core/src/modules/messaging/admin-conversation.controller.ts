import { Controller, Get, Inject, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, AdminConversationQuerySchema, UuidSchema } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { AdminConversationService } from './admin-conversation.service.js';

function reportIdOrNotFound(value: string) {
  const parsed = UuidSchema.safeParse(value);
  if (!parsed.success) {
    throw new NotFoundException({
      error: 'not_found',
      message: 'Report not found.',
      statusCode: 404,
    });
  }
  return parsed.data;
}

const clean = (query: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(query).filter((e): e is [string, string] => Boolean(e[1])));

@ApiTags('messaging')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/admin`)
@Roles('SUPER_ADMIN')
export class AdminConversationController {
  constructor(@Inject(AdminConversationService) private readonly admin: AdminConversationService) {}

  @Get('reports/:reportId/conversation')
  @ApiOperation({
    summary: 'Read-only view of a reported conversation; reason required and audited.',
  })
  view(
    @CurrentUser() user: RequestUser,
    @Param('reportId') reportId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.admin.view(
      user.sub,
      reportIdOrNotFound(reportId),
      AdminConversationQuerySchema.parse(clean(query)),
    );
  }
}
