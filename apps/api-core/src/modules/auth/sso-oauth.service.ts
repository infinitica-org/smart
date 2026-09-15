import { randomUUID } from 'node:crypto';
import { BadGatewayException, BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { SsoOAuthProvider, SsoStartRequest, SsoStartResponse } from '@smart/contracts';
import { z } from 'zod';
import { env } from '../../platform/config/env.js';
import { RedisService } from '../../platform/redis/redis.service.js';

const STATE_TTL_SECONDS = 10 * 60;
const FETCH_MS = 8_000;
const STATE_KEY_PREFIX = 'auth:sso:state:';

const TokenResponseSchema = z.object({
  access_token: z.string(),
});

const GoogleUserinfoSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
});

const MicrosoftUserinfoSchema = z.object({
  sub: z.string(),
  email: z.string().email().optional(),
  preferred_username: z.string().optional(),
  name: z.string().optional(),
});

const PendingStateSchema = z.object({
  provider: z.enum(['google', 'microsoft']),
  redirectUri: z.string().url(),
  institutionDomain: z.string().optional(),
});

export interface SsoIdentity {
  email: string;
  fullName: string;
  provider: SsoOAuthProvider;
  institutionDomain?: string;
}

@Injectable()
export class SsoOauthService {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async start(input: SsoStartRequest): Promise<SsoStartResponse> {
    assertAllowedRedirectUri(input.redirectUri);
    if (!this.isConfigured(input.provider)) {
      throw new BadRequestException({
        error: 'sso_not_configured',
        message: `${labelFor(input.provider)} sign-in is not configured on this environment.`,
        statusCode: 400,
      });
    }

    const state = randomUUID();
    const payload = PendingStateSchema.parse({
      provider: input.provider,
      redirectUri: input.redirectUri,
      institutionDomain: input.institutionDomain?.trim().toLowerCase() || undefined,
    });
    await this.redis.setex(
      `${STATE_KEY_PREFIX}${state}`,
      STATE_TTL_SECONDS,
      JSON.stringify(payload),
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId(input.provider),
      redirect_uri: input.redirectUri,
      scope: scopesFor(input.provider),
      state,
    });
    if (input.provider === 'google') {
      params.set('access_type', 'online');
      params.set('prompt', 'select_account');
    }

    return {
      state,
      authorizationUrl: `${authorizeUrlFor(input.provider)}?${params.toString()}`,
    };
  }

  async complete(code: string, state: string): Promise<SsoIdentity> {
    const pending = await this.consumeState(state);
    if (!pending) {
      throw new BadRequestException({
        error: 'sso_state_invalid',
        message: 'Sign-in session expired or was already used. Start again from the login page.',
        statusCode: 400,
      });
    }

    assertAllowedRedirectUri(pending.redirectUri);
    const accessToken = await this.exchangeCode(pending.provider, code, pending.redirectUri);
    const identity = await this.fetchIdentity(pending.provider, accessToken);
    if (identity.emailVerified === false) {
      throw new BadRequestException({
        error: 'sso_email_unverified',
        message: 'Your identity provider has not verified this email address yet.',
        statusCode: 400,
      });
    }

    return {
      email: identity.email.toLowerCase(),
      fullName: identity.fullName,
      provider: pending.provider,
      institutionDomain: pending.institutionDomain,
    };
  }

  isConfigured(provider: SsoOAuthProvider): boolean {
    if (provider === 'google') {
      return Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET);
    }
    return Boolean(env.MICROSOFT_OAUTH_CLIENT_ID && env.MICROSOFT_OAUTH_CLIENT_SECRET);
  }

  private clientId(provider: SsoOAuthProvider): string {
    if (provider === 'google') return env.GOOGLE_OAUTH_CLIENT_ID ?? '';
    return env.MICROSOFT_OAUTH_CLIENT_ID ?? '';
  }

  private clientSecret(provider: SsoOAuthProvider): string {
    if (provider === 'google') return env.GOOGLE_OAUTH_CLIENT_SECRET ?? '';
    return env.MICROSOFT_OAUTH_CLIENT_SECRET ?? '';
  }

  private async consumeState(state: string): Promise<z.infer<typeof PendingStateSchema> | null> {
    const key = `${STATE_KEY_PREFIX}${state}`;
    const raw = await this.redis.get(key);
    if (!raw) return null;
    await this.redis.del(key);
    return PendingStateSchema.parse(JSON.parse(raw));
  }

  private async exchangeCode(
    provider: SsoOAuthProvider,
    code: string,
    redirectUri: string,
  ): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.clientId(provider),
      client_secret: this.clientSecret(provider),
    });

    const response = await fetch(tokenUrlFor(provider), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!response.ok) {
      throw new BadGatewayException({
        error: 'sso_token_exchange_failed',
        message: `${labelFor(provider)} did not accept the authorization code.`,
        statusCode: 502,
      });
    }
    return TokenResponseSchema.parse(await response.json()).access_token;
  }

  private async fetchIdentity(
    provider: SsoOAuthProvider,
    accessToken: string,
  ): Promise<{ email: string; fullName: string; emailVerified: boolean }> {
    const response = await fetch(userinfoUrlFor(provider), {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!response.ok) {
      throw new BadGatewayException({
        error: 'sso_userinfo_failed',
        message: `Could not read your profile from ${labelFor(provider)} after sign-in.`,
        statusCode: 502,
      });
    }

    if (provider === 'google') {
      const info = GoogleUserinfoSchema.parse(await response.json());
      return {
        email: info.email,
        fullName: info.name?.trim() || info.email.split('@')[0] || 'SMART User',
        emailVerified: info.email_verified ?? true,
      };
    }

    const info = MicrosoftUserinfoSchema.parse(await response.json());
    const email = (info.email ?? info.preferred_username)?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw new BadGatewayException({
        error: 'sso_userinfo_failed',
        message: 'Microsoft did not return a usable email address for this account.',
        statusCode: 502,
      });
    }
    return {
      email,
      fullName: info.name?.trim() || email.split('@')[0] || 'SMART User',
      emailVerified: true,
    };
  }
}

function labelFor(provider: SsoOAuthProvider): string {
  return provider === 'google' ? 'Google' : 'Microsoft';
}

function scopesFor(provider: SsoOAuthProvider): string {
  return provider === 'google' ? 'openid email profile' : 'openid email profile User.Read';
}

function authorizeUrlFor(provider: SsoOAuthProvider): string {
  if (provider === 'google') {
    return 'https://accounts.google.com/o/oauth2/v2/auth';
  }
  const tenant = env.MICROSOFT_OAUTH_TENANT || 'common';
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`;
}

function tokenUrlFor(provider: SsoOAuthProvider): string {
  if (provider === 'google') {
    return 'https://oauth2.googleapis.com/token';
  }
  const tenant = env.MICROSOFT_OAUTH_TENANT || 'common';
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
}

function userinfoUrlFor(provider: SsoOAuthProvider): string {
  return provider === 'google'
    ? 'https://openidconnect.googleapis.com/v1/userinfo'
    : 'https://graph.microsoft.com/oidc/userinfo';
}

export function assertAllowedRedirectUri(redirectUri: string): void {
  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    throw new BadRequestException({
      error: 'sso_redirect_invalid',
      message: 'redirectUri must be a valid absolute URL.',
      statusCode: 400,
    });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException({
      error: 'sso_redirect_invalid',
      message: 'redirectUri must use http or https.',
      statusCode: 400,
    });
  }
  if (!parsed.pathname.endsWith('/auth/callback')) {
    throw new BadRequestException({
      error: 'sso_redirect_invalid',
      message: 'redirectUri must end with /auth/callback.',
      statusCode: 400,
    });
  }

  const allowedOrigins = collectAllowedOrigins();
  if (!allowedOrigins.has(parsed.origin)) {
    throw new BadRequestException({
      error: 'sso_redirect_not_allowed',
      message: 'redirectUri origin is not allowed for this environment.',
      statusCode: 400,
    });
  }
}

function collectAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const value of [
    env.AUTH_APP_URL,
    env.STUDENT_APP_URL,
    env.TPO_APP_URL,
    env.ADMIN_APP_URL,
    env.VERIFY_APP_URL,
    ...env.CORS_ORIGINS.split(','),
  ]) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    try {
      origins.add(new URL(trimmed).origin);
    } catch {
      // ignore malformed entries
    }
  }
  return origins;
}
