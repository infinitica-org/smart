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

  @Get('me/onboarding')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Load persisted candidate onboarding profile.' })
  @ApiResponse({ status: 200, description: 'Profile snapshot and onboardingCompleted flag.' })
  getOnboarding(@CurrentUser() user: RequestUser) {
    return this.service.getOnboarding(user.sub);
  }

  @Post('me/onboarding/complete')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Persist profile + DPDP consent and mark onboarding complete (CN-T01).',
  })
  @ApiResponse({ status: 200, description: 'AuthenticatedUser with onboardingCompleted=true.' })
  completeOnboarding(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.completeOnboarding(user.sub, body);
  }

  @Put('me/onboarding')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Save in-progress candidate onboarding data. Does not mark onboarding complete.',
  })
  @ApiResponse({ status: 200, description: 'Draft snapshot and onboardingCompleted=false.' })
  saveOnboarding(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.saveOnboardingDraft(user.sub, body);
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
