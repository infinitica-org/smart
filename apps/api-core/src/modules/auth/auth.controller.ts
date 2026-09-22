import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, Res } from '@nestjs/common';
import {
  API_PREFIX,
  AcceptInvitationRequestSchema,
  PasswordLoginRequestSchema,
} from '@smart/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from '../../common/guards/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { InvitationsService } from '../invitations/invitations.service.js';
import { AuthService } from './auth.service.js';

@Controller(`${API_PREFIX}/auth`)
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(InvitationsService) private readonly invitations: InvitationsService,
  ) {}

  @Public()
  @Post('login')
  login(@Body() body: unknown, @Res({ passthrough: true }) reply: FastifyReply) {
    const parsed = PasswordLoginRequestSchema.parse(body);
    return this.auth.login(parsed.email, parsed.password, reply);
  }

  @Public()
  @Post('refresh')
  refresh(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    return this.auth.refresh(request, reply);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    return this.auth.logout(request, reply);
  }

  @Public()
  @Get('invitations/:token')
  previewInvitation(@Param('token') token: string) {
    return this.invitations.preview(token);
  }

  /** Minimal COMPANY-only boundary for portal auth (Phase 6). */
  @Get('company/account')
  @Roles('COMPANY')
  companyAccount(@CurrentUser() user: RequestUser) {
    return this.auth.getCompanyPortalAccount(user.sub);
  }

  @Public()
  @Post('invitations/:token/accept')
  async acceptInvitation(
    @Param('token') token: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const parsed = AcceptInvitationRequestSchema.parse(body);
    const user = await this.invitations.accept(token, parsed.password);
    return this.auth.issueSessionAfterInviteAccept(user, reply);
  }
}
