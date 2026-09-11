import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  AdminWorkExperienceReviewRequestSchema,
  VoidRequestSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { WorkExperienceService } from './work-experience.service.js';

@ApiTags('admin-work-experience')
@Controller(`${API_PREFIX}/admin/work-experience`)
@Roles('SUPER_ADMIN')
export class WorkExperienceAdminController {
  constructor(@Inject(WorkExperienceService) private readonly service: WorkExperienceService) {}

  @Post(':id/approve')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'WE-T02 — approve flagged letter authenticity. Clears doc_flagged; does not auto-verify employment.',
  })
  approve(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = AdminWorkExperienceReviewRequestSchema.parse(body);
    return this.service.approveWorkExperienceAuthenticity(user.sub, id, parsed);
  }

  @Post(':id/void')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'SA-T08 — void a work-experience entry for fraud/integrity reasons. One-directional; fully audited.',
  })
  void(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = VoidRequestSchema.parse(body);
    return this.service.voidWorkExperience(user.sub, id, parsed);
  }
}
