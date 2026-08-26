import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import {
  API_PREFIX,
  AcceptInvitationRequestSchema,
  PasswordLoginRequestSchema,
} from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import { AuthService } from './auth.service.js';
import { InvitationsService } from '../invitations/invitations.service.js';

@Controller(`${API_PREFIX}/auth`)
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(InvitationsService) private readonly invitations: InvitationsService,
  ) {}

  @Public()
  @Post('login')
  login(@Body() body: unknown) {
    const parsed = PasswordLoginRequestSchema.parse(body);
    return this.auth.login(parsed.email, parsed.password);
  }

  @Public()
  @Get('invitations/:token')
  previewInvitation(@Param('token') token: string) {
    return this.invitations.preview(token);
  }

  @Public()
  @Post('invitations/:token/accept')
  acceptInvitation(@Param('token') token: string, @Body() body: unknown) {
    const parsed = AcceptInvitationRequestSchema.parse(body);
    return this.invitations.accept(token, parsed.password);
  }
}
