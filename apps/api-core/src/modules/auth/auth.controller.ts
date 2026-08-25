import { Body, Controller, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, PasswordLoginRequestSchema } from '@smart/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from '../../common/guards/public.decorator.js';
import { attachRefreshCookie, clearRefreshCookie, readRefreshCookie } from './auth.cookies.js';
import { AuthService } from './auth.service.js';

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
