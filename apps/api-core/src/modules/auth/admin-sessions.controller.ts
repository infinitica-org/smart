import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import {
  API_PREFIX,
  ListActiveSessionsQuerySchema,
  TenantActionReasonSchema,
} from '@smart/contracts';
import { RequirePermission } from '../../common/guards/permissions.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { AuthService } from './auth.service.js';

function compactQuery(
  query: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
  );
}

/** S6-VV-93 — SUPER_ADMIN "list active sessions, forcefully terminate one" panel. */
@Controller(`${API_PREFIX}/admin/sessions`)
export class AdminSessionsController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get()
  @RequirePermission('session.read')
  list(@Query() query: Record<string, string | undefined>) {
    return this.auth.listActiveSessions(ListActiveSessionsQuerySchema.parse(compactQuery(query)));
  }

  @Post(':sessionId/revoke')
  @RequirePermission('session.revoke')
  revoke(
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    const { reason } = TenantActionReasonSchema.parse(body);
    return this.auth.revokeSession(sessionId, user.sub, reason);
  }
}
