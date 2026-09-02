import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { ProjectVerifyService } from './project-verify.service.js';

@ApiTags('projects')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/projects`)
export class ProjectsController {
  constructor(@Inject(ProjectVerifyService) private readonly projects: ProjectVerifyService) {}

  @Get('github/status')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'GitHub repo-read connection status (VV wires OAuth).' })
  githubStatus() {
    return this.projects.githubStatus();
  }

  @Get('github/repos')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Picker list of top repos. Empty until VV connects Octokit.' })
  githubRepos() {
    return this.projects.githubRepos();
  }

  @Post()
  @Roles('STUDENT')
  @ApiOperation({
    summary: 'Submit a project. Returns immediately; poll GET by id for the report.',
  })
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.projects.createProject(user.sub, body);
  }

  @Get(':projectId')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Poll project verification status and report.' })
  getOne(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string) {
    return this.projects.getProject(projectId, user.sub);
  }
}
