import { Body, Controller, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { API_PREFIX, AssignRoleRequestSchema, TenantActionReasonSchema } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/guards/permissions.js';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { UserAdminService } from './user-admin.service.js';

@Controller(`${API_PREFIX}/admin/users`)
@UseGuards(TenantScopeGuard)
export class UsersAdminController {
  constructor(@Inject(UserAdminService) private readonly userAdmin: UserAdminService) {}

  @Post(':userId/role')
  @RequirePermission('user.role.assign')
  assignRole(@Param('userId') userId: string, @Body() body: unknown) {
    const parsed = AssignRoleRequestSchema.parse(body);
    return this.userAdmin.assignRole(userId, parsed.role);
  }

  @Post(':userId/hold')
  @RequirePermission('user.access.manage')
  holdUser(
    @Param('userId') userId: string,
    @Body() body: unknown,
    @CurrentUser() actor: RequestUser,
  ) {
    const parsed = TenantActionReasonSchema.parse(body);
    return this.userAdmin.holdUser(userId, parsed.reason, actor.sub);
  }

  @Post(':userId/release-hold')
  @RequirePermission('user.access.manage')
  releaseUser(
    @Param('userId') userId: string,
    @Body() body: unknown,
    @CurrentUser() actor: RequestUser,
  ) {
    const parsed = TenantActionReasonSchema.parse(body);
    return this.userAdmin.releaseUser(userId, parsed.reason, actor.sub);
  }
}
