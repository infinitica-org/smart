import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, Res } from '@nestjs/common';
import {
  API_PREFIX,
  AcceptInvitationRequestSchema,
  PasswordLoginRequestSchema,
  PasswordResetConfirmRequestSchema,
  PasswordResetRequestSchema,
  RegisterRequestSchema,
  RegisterResponseSchema,
  ResendEmailVerificationRequestSchema,
} from '@smart/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from '../../common/guards/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { InvitationsService } from '../invitations/invitations.service.js';
import { AuthService } from './auth.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { PasswordResetService } from './password-reset.service.js';

@Controller(`${API_PREFIX}/auth`)
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(InvitationsService) private readonly invitations: InvitationsService,
    @Inject(EmailVerificationService) private readonly emailVerification: EmailVerificationService,
    @Inject(PasswordResetService) private readonly passwordReset: PasswordResetService,
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
  @Get('institutions')
  listSelectableInstitutions() {
    return this.auth.listSelectableInstitutions();
  }

  @Public()
  @Post('register')
  async register(@Body() body: unknown) {
    const parsed = RegisterRequestSchema.parse(body);
    const user = await this.auth.register(parsed);
    await this.emailVerification.sendForUser(user.id, user.email, user.fullName);
    return RegisterResponseSchema.parse({ email: user.email, verificationRequired: true });
  }

  @Public()
  @Post('verify-email/resend')
  @HttpCode(204)
  async resendEmailVerification(@Body() body: unknown) {
    const parsed = ResendEmailVerificationRequestSchema.parse(body);
    await this.emailVerification.resend(parsed.email);
  }

  @Public()
  @Post('verify-email/:token')
  @HttpCode(204)
  async verifyEmail(@Param('token') token: string) {
    await this.emailVerification.confirm(token);
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(204)
  async requestPasswordReset(@Body() body: unknown) {
    const parsed = PasswordResetRequestSchema.parse(body);
    await this.passwordReset.request(parsed.email);
  }

  @Public()
  @Post('password-reset/:token/confirm')
  @HttpCode(204)
  async confirmPasswordReset(@Param('token') token: string, @Body() body: unknown) {
    const parsed = PasswordResetConfirmRequestSchema.parse(body);
    await this.passwordReset.confirm(token, parsed.newPassword);
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
