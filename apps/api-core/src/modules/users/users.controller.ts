import { Body, Controller, Get, HttpCode, Inject, Post, Put, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  ChangePasswordRequestSchema,
  EnrollTrackRequestSchema,
  FetchGithubProfileRequestSchema,
  GithubRepoReadmeRequestSchema,
  ListGithubReposRequestSchema,
  RepoLanguagesRequestSchema,
  ReverseGeocodeRequestSchema,
} from '@smart/contracts';
import type { FastifyReply } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/guards/public.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { env } from '../../platform/config/env.js';
import { ResumeParseService } from '../ai-gateway/resume-parse.service.js';
import { LinkedinOauthService } from '../auth/linkedin-oauth.service.js';
import { GeocodingOnboardingService } from '../integrations/geocoding/geocoding-onboarding.service.js';
import { GithubOnboardingService } from '../integrations/github/github-onboarding.service.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller(`${API_PREFIX}/users`)
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly service: UsersService,
    @Inject(ResumeParseService) private readonly resumeParse: ResumeParseService,
    @Inject(LinkedinOauthService) private readonly linkedinOauth: LinkedinOauthService,
    @Inject(GithubOnboardingService) private readonly githubOnboarding: GithubOnboardingService,
    @Inject(GeocodingOnboardingService)
    private readonly geocodingOnboarding: GeocodingOnboardingService,
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

  @Get('me/onboarding/linkedin/oauth-url')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Begin "Sign in with LinkedIn" (OIDC) to verify the pasted LinkedIn profile.',
  })
  async linkedinOauthUrl(@CurrentUser() user: RequestUser) {
    return { url: await this.linkedinOauth.createAuthorizationUrl(user.sub) };
  }

  @Public()
  @Get('onboarding/linkedin/callback')
  @ApiOperation({
    summary: 'LinkedIn OAuth redirect target — not called by the frontend directly.',
  })
  async linkedinCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() reply: FastifyReply,
  ) {
    const redirectTo = (ok: boolean) =>
      `${env.STUDENT_APP_URL}/onboarding?linkedinVerified=${ok ? '1' : '0'}`;

    if (error || !code || !state) {
      reply.redirect(redirectTo(false), 302);
      return;
    }

    const userId = await this.linkedinOauth.consumeState(state);
    if (!userId) {
      reply.redirect(redirectTo(false), 302);
      return;
    }

    try {
      const identity = await this.linkedinOauth.exchangeCode(code);
      await this.service.mergeLinkedinVerification(userId, {
        verified: true,
        verifiedAt: new Date().toISOString(),
        providerSub: identity.providerSub,
        name: identity.name,
        pictureUrl: identity.pictureUrl,
      });
      reply.redirect(redirectTo(true), 302);
    } catch {
      reply.redirect(redirectTo(false), 302);
    }
  }

  @Post('me/onboarding/github/fetch-profile')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Look up a public GitHub profile by URL for the identity confirm card.',
  })
  fetchGithubProfile(@Body() body: unknown) {
    const parsed = FetchGithubProfileRequestSchema.parse(body);
    return this.githubOnboarding.fetchProfile(parsed.githubUrl);
  }

  @Post('me/onboarding/reverse-geocode')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve browser coordinates to a city name for current location.' })
  reverseGeocode(@Body() body: unknown) {
    const parsed = ReverseGeocodeRequestSchema.parse(body);
    return this.geocodingOnboarding.reverseGeocode(parsed.lat, parsed.lng);
  }

  @Post('me/onboarding/github/list-repos')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: "List a GitHub user's public, non-fork repos for the repo picker." })
  listGithubRepos(@Body() body: unknown) {
    const parsed = ListGithubReposRequestSchema.parse(body);
    return this.githubOnboarding.listRepos(parsed.login);
  }

  @Post('me/onboarding/github/repo-languages')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Aggregate language byte-share across the candidate's 3-5 chosen repos.",
  })
  repoLanguages(@Body() body: unknown) {
    const parsed = RepoLanguagesRequestSchema.parse(body);
    return this.githubOnboarding.repoLanguages(parsed.repoFullNames);
  }

  @Post('me/github/repo-readme')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Fetch a repo's README to prefill a project submission." })
  getGithubReadme(@Body() body: unknown) {
    const parsed = GithubRepoReadmeRequestSchema.parse(body);
    return this.githubOnboarding.getReadme(parsed.fullName);
  }
}
