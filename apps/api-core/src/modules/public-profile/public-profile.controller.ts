import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/guards/public.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { AuthService } from '../auth/auth.service.js';
import { PublicProfileService } from './public-profile.service.js';

@ApiTags('public-profile')
@Controller(API_PREFIX)
export class PublicProfileController {
  constructor(
    @Inject(PublicProfileService) private readonly service: PublicProfileService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get('users/me/public-profile-link')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get (or mint, on first call) this student's public-profile share link.",
  })
  getShareLink(@CurrentUser() user: RequestUser) {
    return this.service.getOrCreateShareLink(user.sub);
  }

  @Get('users/me/public-profile')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview your own public profile exactly as an employer would see it.' })
  getOwnProfile(@CurrentUser() user: RequestUser) {
    return this.service.getForOwner(user.sub);
  }

  @Get('public/candidates/:slug')
  @Public()
  @ApiOperation({
    summary:
      "Look up a candidate's public profile by share slug or claimed username. No auth required.",
  })
  getPublicProfile(@Param('slug') slug: string, @Req() request: FastifyRequest) {
    // Public route: an optional employer token only lets us count the view; it grants nothing.
    const viewer = this.auth.tryVerifyAccessToken(request.headers.authorization);
    return this.service.getBySlug(slug, viewer);
  }
}
