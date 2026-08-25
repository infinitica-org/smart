import { Body, Controller, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, PasswordLoginRequestSchema, SsoStartRequestSchema } from '@smart/contracts';
import { z } from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from '../../common/guards/public.decorator.js';
import { attachRefreshCookie, clearRefreshCookie, readRefreshCookie } from './auth.cookies.js';
import { AuthService } from './auth.service.js';

const SsoCallbackBodySchema = z.object({
  code: z.string().min(1).max(4096),
  state: z.string().min(1).max(512),
});

@ApiTags('auth')
@Controller(`${API_PREFIX}/auth`)
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Password login; issues access token + refresh cookie.' })
  async login(@Body() body: unknown, @Res({ passthrough: true }) reply: FastifyReply) {
    const parsed = PasswordLoginRequestSchema.parse(body);
    const session = await this.auth.login(parsed.email, parsed.password);
    attachRefreshCookie(reply, session.refreshRaw);
    return session.tokens;
  }

  @Public()
  @Post('sso/start')
  @ApiOperation({ summary: 'Begin Google or GitHub OAuth via Auth0.' })
  ssoStart(@Body() body: unknown) {
    const parsed = SsoStartRequestSchema.parse(body);
    return this.auth.ssoStart(parsed.provider, parsed.redirectUri, parsed.institutionDomain);
  }

  @Public()
  @Post('sso/callback')
  @ApiOperation({ summary: 'Complete OAuth handshake and issue session cookies.' })
  async ssoCallback(@Body() body: unknown, @Res({ passthrough: true }) reply: FastifyReply) {
    const parsed = SsoCallbackBodySchema.parse(body);
    const session = await this.auth.ssoCallback(parsed.code, parsed.state);
    attachRefreshCookie(reply, session.refreshRaw);
    return session.tokens;
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token, issue new access token.' })
  async refresh(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const session = await this.auth.refresh(readRefreshCookie(request));
    attachRefreshCookie(reply, session.refreshRaw);
    return session.tokens;
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Revoke the refresh token family.' })
  async logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.auth.logout(readRefreshCookie(request));
    clearRefreshCookie(reply);
    return { ok: true };
  }
}
