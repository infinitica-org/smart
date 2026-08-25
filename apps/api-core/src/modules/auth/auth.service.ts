import { scrypt as scryptCallback, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  AuthProvider,
  AuthTokenResponse,
  AuthenticatedUser,
  SsoStartResponse,
} from '@smart/contracts';
import { env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { hashRefreshToken } from './auth.cookies.js';
import {
  OAUTH_STATE_TTL_SECONDS,
  auth0ConnectionFor,
  buildAuthorizeUrl,
  displayNameFromProfile,
  emailDomain,
  generatePkce,
  isAllowedRedirectUri,
  isSocialSsoProvider,
  oauthStateKey,
  randomOauthString,
  resolveAuth0Settings,
  type OauthStatePayload,
} from './auth.oauth.js';

const scrypt = promisify(scryptCallback);
const JWT_ISS = 'smart-api';
const JWT_AUD = 'smart-clients';

const userInclude = {
  institution: true,
  primaryTrack: true,
  secondaryTrack: true,
} as const;

export interface IssuedSession {
  readonly tokens: AuthTokenResponse;
  readonly refreshRaw: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async login(email: string, password: string): Promise<IssuedSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: userInclude,
    });
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Email or password is incorrect.',
        statusCode: 401,
      });
    }
    return this.issueSession(user);
  }

  async ssoStart(
    provider: AuthProvider,
    redirectUri: string,
    institutionDomain?: string,
  ): Promise<SsoStartResponse> {
    if (!isSocialSsoProvider(provider)) {
      throw new BadRequestException({
        error: 'invalid_provider',
        message: 'This sprint supports Google and GitHub OAuth only (no SAML/OIDC).',
        statusCode: 400,
      });
    }

    const auth0 = resolveAuth0Settings(env);
    if (!auth0) {
      throw new ServiceUnavailableException({
        error: 'auth0_not_configured',
        message:
          'Auth0 is not configured. Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET.',
        statusCode: 503,
      });
    }

    if (!isAllowedRedirectUri(redirectUri, env.CORS_ORIGINS)) {
      throw new BadRequestException({
        error: 'invalid_redirect_uri',
        message: 'redirectUri origin must be in CORS_ORIGINS and path must be /auth/callback.',
        statusCode: 400,
      });
    }

    if (institutionDomain && !institutionDomain.includes('@')) {
      const mapped = await this.prisma.institution.findUnique({
        where: { domain: institutionDomain.toLowerCase() },
      });
      if (!mapped) {
        throw new BadRequestException({
          error: 'unknown_domain',
          message: `No institution is mapped for domain ${institutionDomain}.`,
          statusCode: 400,
        });
      }
    }

    const state = randomOauthString();
    const nonce = randomOauthString();
    const pkce = generatePkce();
    const payload: OauthStatePayload = {
      redirectUri,
      provider,
      codeVerifier: pkce.verifier,
      nonce,
    };

    try {
      await this.redis.set(
        oauthStateKey(state),
        JSON.stringify(payload),
        'EX',
        OAUTH_STATE_TTL_SECONDS,
      );
    } catch {
      throw new ServiceUnavailableException({
        error: 'oauth_state_unavailable',
        message: 'Could not persist SSO state. Confirm Redis is running.',
        statusCode: 503,
      });
    }

    return {
      state,
      authorizationUrl: buildAuthorizeUrl({
        domain: auth0.domain,
        clientId: auth0.clientId,
        redirectUri,
        state,
        nonce,
        codeChallenge: pkce.challenge,
        connection: auth0ConnectionFor(provider),
        loginHint: institutionDomain?.includes('@') ? institutionDomain : undefined,
      }),
    };
  }

  async ssoCallback(code: string, state: string): Promise<IssuedSession> {
    const auth0 = resolveAuth0Settings(env);
    if (!auth0) {
      throw new ServiceUnavailableException({
        error: 'auth0_not_configured',
        message:
          'Auth0 is not configured. Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET.',
        statusCode: 503,
      });
    }

    const stored = await this.consumeOauthState(state);
    const tokens = await this.exchangeAuth0Code(auth0, code, stored);
    const profile = await this.fetchAuth0UserInfo(auth0, tokens.access_token);
    const email = profile.email?.trim().toLowerCase();
    if (!email) {
      throw new UnauthorizedException({
        error: 'email_required',
        message: 'Auth0 profile did not include an email address.',
        statusCode: 401,
      });
    }

    const user = await this.upsertSsoUser({
      email,
      fullName: displayNameFromProfile({ ...profile, email }, email),
      emailVerified: Boolean(profile.email_verified),
      provider: stored.provider,
    });
    return this.issueSession(user);
  }

  async refresh(rawToken: string | undefined): Promise<IssuedSession> {
    if (!rawToken) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Missing refresh cookie.',
        statusCode: 401,
      });
    }

    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
      include: { user: { include: userInclude } },
    });
    if (!row || row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException({
        error: 'token_expired',
        message: 'Refresh token is invalid or expired.',
        statusCode: 401,
      });
    }
    if (row.revokedAt) {
      await this.revokeFamily(row.familyId);
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Refresh token reuse detected. Session revoked.',
        statusCode: 401,
      });
    }

    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    return this.issueSession(row.user, row.familyId);
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
    });
    if (row) await this.revokeFamily(row.familyId);
  }

  private async consumeOauthState(state: string): Promise<OauthStatePayload> {
    let raw: string | null;
    try {
      raw = await this.redis.getdel(oauthStateKey(state));
    } catch {
      throw new ServiceUnavailableException({
        error: 'oauth_state_unavailable',
        message: 'Could not read SSO state. Confirm Redis is running.',
        statusCode: 503,
      });
    }
    if (!raw) {
      throw new UnauthorizedException({
        error: 'invalid_oauth_state',
        message: 'SSO state is missing or expired. Start login again.',
        statusCode: 401,
      });
    }
    return JSON.parse(raw) as OauthStatePayload;
  }

  private async exchangeAuth0Code(
    auth0: { domain: string; clientId: string; clientSecret: string },
    code: string,
    stored: OauthStatePayload,
  ): Promise<{ access_token: string }> {
    const response = await fetch(`https://${auth0.domain}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: auth0.clientId,
        client_secret: auth0.clientSecret,
        code,
        redirect_uri: stored.redirectUri,
        code_verifier: stored.codeVerifier,
      }),
    });
    const body = (await response.json()) as {
      access_token?: string;
      error_description?: string;
    };
    if (!response.ok || !body.access_token) {
      throw new UnauthorizedException({
        error: 'oauth_exchange_failed',
        message: body.error_description ?? 'Auth0 authorization code exchange failed.',
        statusCode: 401,
      });
    }
    return { access_token: body.access_token };
  }

  private async fetchAuth0UserInfo(
    auth0: { domain: string },
    accessToken: string,
  ): Promise<{ email?: string; email_verified?: boolean; name?: string; nickname?: string }> {
    const response = await fetch(`https://${auth0.domain}/userinfo`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new UnauthorizedException({
        error: 'oauth_profile_failed',
        message: 'Could not load the Auth0 user profile.',
        statusCode: 401,
      });
    }
    return (await response.json()) as {
      email?: string;
      email_verified?: boolean;
      name?: string;
      nickname?: string;
    };
  }

  private async upsertSsoUser(input: {
    email: string;
    fullName: string;
    emailVerified: boolean;
    provider: AuthProvider;
  }) {
    const domain = emailDomain(input.email);
    const institution = domain
      ? await this.prisma.institution.findUnique({ where: { domain } })
      : null;

    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: existing.fullName || input.fullName,
          emailVerified: existing.emailVerified || input.emailVerified,
          provider: input.provider,
          institutionId: existing.institutionId ?? institution?.id ?? null,
        },
        include: userInclude,
      });
    }

    return this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        role: 'STUDENT',
        provider: input.provider,
        emailVerified: input.emailVerified,
        institutionId: institution?.id ?? null,
      },
      include: userInclude,
    });
  }

  private async issueSession(
    user: Parameters<typeof toAuthenticatedUser>[0],
    familyId: string = randomUUID(),
  ): Promise<IssuedSession> {
    const refreshRaw = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        familyId,
        userId: user.id,
        tokenHash: hashRefreshToken(refreshRaw),
        expiresAt: new Date(Date.now() + env.REFRESH_TTL_SECONDS * 1000),
      },
    });

    const tracks = [user.primaryTrack?.code, user.secondaryTrack?.code].filter(
      (code): code is string => Boolean(code),
    );
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      inst: user.institutionId,
      trk: tracks,
      fam: familyId,
      iss: JWT_ISS,
      aud: JWT_AUD,
    });

    return {
      refreshRaw,
      tokens: {
        accessToken,
        tokenType: 'Bearer',
        expiresInSeconds: env.JWT_ACCESS_TTL_SECONDS,
        user: toAuthenticatedUser(user),
      },
    };
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const derived = (await scrypt(password, Buffer.from(saltHex, 'hex'), 64)) as Buffer;
  const expected = Buffer.from(hashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

function toAuthenticatedUser(user: {
  id: string;
  email: string;
  fullName: string;
  role: AuthenticatedUser['role'];
  provider: AuthenticatedUser['provider'];
  emailVerified: boolean;
  institutionId: string | null;
  createdAt: Date;
  institution: { name: string } | null;
  primaryTrack: { code: string } | null;
  secondaryTrack: { code: string } | null;
}): AuthenticatedUser {
  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    institutionId: user.institutionId,
    institutionName: user.institution?.name ?? null,
    primaryTrack: (user.primaryTrack?.code as AuthenticatedUser['primaryTrack']) ?? null,
    secondaryTrack: (user.secondaryTrack?.code as AuthenticatedUser['secondaryTrack']) ?? null,
    provider: user.provider,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}
