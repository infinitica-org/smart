import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { Roles } from '../../common/guards/roles.decorator.js';
import { ProjectVerifyService } from './project-verify.service.js';

@ApiTags('admin-project-review')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/admin/project-review-queue`)
@Roles('SUPER_ADMIN')
export class ProjectReviewAdminController {
  constructor(@Inject(ProjectVerifyService) private readonly projects: ProjectVerifyService) {}

  @Get()
  @ApiOperation({ summary: 'Projects in UNDER_REVIEW. Separate from attempt integrity.' })
  list() {
    return this.projects.listReviewQueue();
  }

  @Post(':projectId/resolve')
  @ApiOperation({ summary: 'Human APPROVE or REJECT. The agent never rejects.' })
  resolve(@Param('projectId') projectId: string, @Body() body: unknown) {
    return this.projects.resolveReview(projectId, body);
  }
}
