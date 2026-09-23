import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { ProjectReviewService } from './project-review.service.js';

@ApiTags('project-review')
@Controller(`${API_PREFIX}/admin/project-review-queue`)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
export class ProjectReviewAdminController {
  constructor(@Inject(ProjectReviewService) private readonly reviews: ProjectReviewService) {}

  @Get()
  @ApiOperation({ summary: 'Projects routed to human review after defense or verification.' })
  list() {
    return this.reviews.listQueue();
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Transcript, grade, and evidence for reviewer.' })
  detail(@Param('projectId') projectId: string) {
    return this.reviews.getDetail(projectId);
  }

  @Post(':projectId/resolve')
  @ApiOperation({ summary: 'Human APPROVE (VERIFIED) or REJECT.' })
  resolve(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reviews.resolve(projectId, body, user.sub);
  }
}
