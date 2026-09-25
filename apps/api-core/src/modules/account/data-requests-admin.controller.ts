import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import {
  API_PREFIX,
  ListAdminDataRequestsQuerySchema,
  ResolveDataRequestSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuditAccess } from '../../common/decorators/audit-access.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../../common/guards/permissions.js';
import { DataRequestsAdminService } from './data-requests-admin.service.js';

/** S6-VV-116 (#559) — the data-subject request queue for platform admins. */
@Controller(`${API_PREFIX}/admin/data-requests`)
export class DataRequestsAdminController {
  constructor(
    @Inject(DataRequestsAdminService) private readonly requests: DataRequestsAdminService,
  ) {}

  @Get()
  @RequirePermission('dsr.read')
  list(@Query() query: Record<string, string | undefined>) {
    const compact = Object.fromEntries(Object.entries(query).filter(([, value]) => value));
    return this.requests.list(ListAdminDataRequestsQuerySchema.parse(compact));
  }

  @Get(':requestId')
  @RequirePermission('dsr.read')
  @AuditAccess('data_subject_request', 'requestId')
  get(@Param('requestId') requestId: string) {
    return this.requests.get(requestId);
  }

  @Post(':requestId/start-review')
  @RequirePermission('dsr.fulfil')
  startReview(@Param('requestId') requestId: string, @CurrentUser() user: RequestUser) {
    return this.requests.startReview(requestId, user.sub);
  }

  @Post(':requestId/complete')
  @RequirePermission('dsr.fulfil')
  complete(
    @Param('requestId') requestId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    const { note } = ResolveDataRequestSchema.parse(body);
    return this.requests.resolve(requestId, user.sub, 'COMPLETED', note);
  }

  @Post(':requestId/reject')
  @RequirePermission('dsr.fulfil')
  reject(
    @Param('requestId') requestId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    const { note } = ResolveDataRequestSchema.parse(body);
    return this.requests.resolve(requestId, user.sub, 'REJECTED', note);
  }
}
