import { Body, Controller, Get, Inject, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { SkillRetakeAdminService } from './skill-retake-admin.service.js';

@ApiTags('admin-skill-retake')
@Controller(`${API_PREFIX}/admin`)
@Roles('SUPER_ADMIN')
export class SkillRetakeAdminController {
  constructor(@Inject(SkillRetakeAdminService) private readonly service: SkillRetakeAdminService) {}

  @Get('skills/retake-policies')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List skill retake policy configuration (T19).' })
  listPolicies() {
    return this.service.listPolicies();
  }

  @Patch('skills/:skillId/retake-policy')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update skill retake policy fields (T19).' })
  updatePolicy(
    @CurrentUser() user: RequestUser,
    @Param('skillId') skillId: string,
    @Body() body: unknown,
  ) {
    return this.service.updatePolicy(user.sub, skillId, body);
  }
}
