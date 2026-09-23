import { Body, Controller, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { API_PREFIX, AssignRoleRequestSchema, TenantActionReasonSchema } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { UserAdminService } from './user-admin.service.js';

@Controller(`${API_PREFIX}/admin/users`)
@Roles('SUPER_ADMIN')
@UseGuards(TenantScopeGuard)
export class UsersAdminController {
  constructor(@Inject(UserAdminService) private readonly userAdmin: UserAdminService) {}

  @Post(':userId/role')
  assignRole(@Param('userId') userId: string, @Body() body: unknown) {
    const parsed = AssignRoleRequestSchema.parse(body);
    return this.userAdmin.assignRole(userId, parsed.role);
  }

  @Post(':userId/hold')
  holdUser(
    @Param('userId') userId: string,
    @Body() body: unknown,
    @CurrentUser() actor: RequestUser,
  ) {
    const parsed = TenantActionReasonSchema.parse(body);
    return this.userAdmin.holdUser(userId, parsed.reason, actor.sub);
  }

  @Post(':userId/release-hold')
  releaseUser(
    @Param('userId') userId: string,
    @Body() body: unknown,
    @CurrentUser() actor: RequestUser,
  ) {
    const parsed = TenantActionReasonSchema.parse(body);
    return this.userAdmin.releaseUser(userId, parsed.reason, actor.sub);
  }
}
