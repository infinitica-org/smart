import { randomUUID } from 'node:crypto';
import { BadGatewayException, BadRequestException, Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { env } from '../../platform/config/env.js';
import { RedisService } from '../../platform/redis/redis.service.js';

/**
 * "Sign in with LinkedIn (OIDC)" — the only compliant way to confirm a
 * candidate's LinkedIn identity. LinkedIn has no public profile-scraping
 * API and scraping the pasted URL would violate its ToS, so this never
 * touches the URL itself; it only proves the signed-in LinkedIn account
 * matches a real profile via OpenID Connect (scope: openid profile email).
 *
 * The onboarding wizard runs inside our own app, so the OAuth `state`
 * carries no user-identifying data itself — it's a random, one-time key
 * that Redis maps back to the userId who started the flow, keyed with a
 * short TTL to bound the CSRF window.
 */

const STATE_TTL_SECONDS = 10 * 60;
const FETCH_MS = 4_000;
const AUTHORIZE_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const STATE_KEY_PREFIX = 'onboarding:linkedin:state:';

const TokenResponseSchema = z.object({ access_token: z.string() });

const UserinfoSchema = z.object({
  sub: z.string(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

export interface LinkedinIdentity {
  providerSub: string;
  name?: string;
  pictureUrl?: string;
}

@Injectable()
export class LinkedinOauthService {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  get configured(): boolean {
    return Boolean(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET);
  }

  async createAuthorizationUrl(userId: string): Promise<string> {
    if (!this.configured) {
      throw new BadRequestException({
        error: 'linkedin_not_configured',
        message: 'LinkedIn verification is not configured on this environment.',
        statusCode: 400,
      });
    }
    const state = randomUUID();
    await this.redis.setex(`${STATE_KEY_PREFIX}${state}`, STATE_TTL_SECONDS, userId);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.LINKEDIN_CLIENT_ID ?? '',
      redirect_uri: env.LINKEDIN_REDIRECT_URI,
      scope: 'openid profile email',
      state,
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  /** One-time lookup: resolves `state` back to the userId that started the flow. */
  async consumeState(state: string): Promise<string | null> {
    const key = `${STATE_KEY_PREFIX}${state}`;
    const userId = await this.redis.get(key);
    if (userId) await this.redis.del(key);
    return userId;
  }

  async exchangeCode(code: string): Promise<LinkedinIdentity> {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.LINKEDIN_REDIRECT_URI,
        client_id: env.LINKEDIN_CLIENT_ID ?? '',
        client_secret: env.LINKEDIN_CLIENT_SECRET ?? '',
      }),
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!tokenResponse.ok) {
      throw new BadGatewayException({
        error: 'linkedin_token_exchange_failed',
        message: 'LinkedIn did not accept the authorization code.',
        statusCode: 502,
      });
    }
    const token = TokenResponseSchema.parse(await tokenResponse.json());

    const userinfoResponse = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!userinfoResponse.ok) {
      throw new BadGatewayException({
        error: 'linkedin_userinfo_failed',
        message: 'Could not read the LinkedIn profile after sign-in.',
        statusCode: 502,
      });
    }
    const info = UserinfoSchema.parse(await userinfoResponse.json());
    return { providerSub: info.sub, name: info.name, pictureUrl: info.picture };
  }
}
