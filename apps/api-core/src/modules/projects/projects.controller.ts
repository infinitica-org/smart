import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, type ProjectDto } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { ProjectsService } from './projects.service.js';

@ApiTags('projects')
@Controller(`${API_PREFIX}/projects`)
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly service: ProjectsService) {}

  @Post()
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a project from the CN-T08 template and enqueue SE-T03.' })
  @ApiResponse({ status: 201, description: 'Project row with status SUBMITTED (processing).' })
  @ApiResponse({ status: 422, description: 'Template fields failed validation.' })
  create(@CurrentUser() user: RequestUser, @Body() body: unknown): Promise<ProjectDto> {
    return this.service.create(user.sub, body);
  }

  @Get(':projectId')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Project row plus verification report; poll while SUBMITTED.' })
  @ApiResponse({
    status: 200,
    description: 'Owned project. Report is null until SE-T03 writes it.',
  })
  @ApiResponse({ status: 403, description: 'JWT subject does not own this project.' })
  @ApiResponse({ status: 404, description: 'Unknown projectId.' })
  get(
    @CurrentUser() user: RequestUser,
    @Param('projectId') projectId: string,
  ): Promise<ProjectDto> {
    return this.service.getForStudent(user.sub, projectId);
  }
}
