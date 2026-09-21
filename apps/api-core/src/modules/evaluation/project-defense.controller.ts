import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { ProjectDefenseService } from './project-defense.service.js';

@ApiTags('project-defense')
@Controller(`${API_PREFIX}/projects/:projectId/defense`)
export class ProjectDefenseController {
  constructor(@Inject(ProjectDefenseService) private readonly service: ProjectDefenseService) {}

  @Post('prepare')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reserve a defense session for proctoring onboarding (clock not started).',
  })
  prepare(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string) {
    return this.service.prepare(projectId, user.sub);
  }

  @Post('start')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate the interview clock after proctoring onboarding.' })
  start(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string) {
    return this.service.start(projectId, user.sub);
  }

  @Post('abandon')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Discard the current defense attempt (fresh start on next entry).' })
  abandon(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string) {
    return this.service.abandon(projectId, user.sub);
  }

  @Post('audio-upload-url')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Presigned URL for a defense turn audio blob (direct to object storage).',
  })
  audioUploadUrl(
    @CurrentUser() user: RequestUser,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
  ) {
    return this.service.createAudioUploadUrl(projectId, user.sub, body);
  }

  @Post('reply')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a voice turn and receive the next follow-up question.' })
  reply(
    @CurrentUser() user: RequestUser,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
  ) {
    return this.service.reply(projectId, user.sub, body);
  }

  @Post('complete')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Finish the interview and grade ownership defense.' })
  complete(
    @CurrentUser() user: RequestUser,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
  ) {
    return this.service.complete(projectId, user.sub, body);
  }
}
