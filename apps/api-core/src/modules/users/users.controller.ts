import { Body, Controller, Get, HttpCode, Inject, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  ChangePasswordRequestSchema,
  EnrollTrackRequestSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { ResumeParseService } from '../ai-gateway/resume-parse.service.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller(`${API_PREFIX}/users`)
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly service: UsersService,
    @Inject(ResumeParseService) private readonly resumeParse: ResumeParseService,
  ) {}

  @Get('me')
  @Roles('STUDENT', 'INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'SUPER_ADMIN')
  me(@CurrentUser() user: RequestUser) {
    return this.service.getMe(user.sub);
  }

  @Put('me/track')
  @Roles('STUDENT')
  enrollTrack(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.enrollTrack(user.sub, EnrollTrackRequestSchema.parse(body));
  }

  @HttpCode(204)
  @Post('me/password')
  @Roles('STUDENT', 'INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'SUPER_ADMIN')
  changePassword(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.changePassword(user.sub, ChangePasswordRequestSchema.parse(body));
  }

  @Post('me/resume/parse')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Parse resume text into a pre-fill draft (education, experience, skills).',
  })
  @ApiResponse({ status: 200, description: 'PARSED with a draft, or FAILED with draft null.' })
  @ApiResponse({ status: 422, description: 'Neither rawText nor objectKey supplied.' })
  parseResume(@Body() body: unknown) {
    return this.resumeParse.parse(body);
  }
}
