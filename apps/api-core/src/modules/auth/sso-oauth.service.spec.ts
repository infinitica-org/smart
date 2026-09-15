import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../platform/config/env.js', () => ({
  env: {
    GOOGLE_OAUTH_CLIENT_ID: 'google-client',
    GOOGLE_OAUTH_CLIENT_SECRET: 'google-secret',
    MICROSOFT_OAUTH_CLIENT_ID: undefined,
    MICROSOFT_OAUTH_CLIENT_SECRET: undefined,
    MICROSOFT_OAUTH_TENANT: 'common',
    AUTH_APP_URL: 'http://localhost:3005',
    STUDENT_APP_URL: 'http://localhost:3001',
    TPO_APP_URL: 'http://localhost:3002',
    ADMIN_APP_URL: 'http://localhost:3003',
    VERIFY_APP_URL: 'http://localhost:3004',
    CORS_ORIGINS: 'http://localhost:3001,http://localhost:3005',
  },
}));

const { assertAllowedRedirectUri, SsoOauthService } = await import('./sso-oauth.service.js');

describe('assertAllowedRedirectUri', () => {
  it('accepts auth app callback origins from env defaults', () => {
    expect(() => assertAllowedRedirectUri('http://localhost:3005/auth/callback')).not.toThrow();
  });

  it('rejects callback paths outside /auth/callback', () => {
    expect(() => assertAllowedRedirectUri('http://localhost:3005/login')).toThrow(
      BadRequestException,
    );
  });
});

describe('SsoOauthService', () => {
  const redis = {
    setex: vi.fn(async () => 'OK'),
    get: vi.fn(async () => null),
    del: vi.fn(async () => 1),
  };

  beforeEach(() => {
    redis.setex.mockClear();
  });

  it('returns Google authorization URL and stores state', async () => {
    const service = new SsoOauthService(redis as never);
    const result = await service.start({
      provider: 'google',
      redirectUri: 'http://localhost:3005/auth/callback',
    });

    expect(result.authorizationUrl).toContain('accounts.google.com');
    expect(result.authorizationUrl).toContain('client_id=google-client');
    expect(result.state).toBeTruthy();
    expect(redis.setex).toHaveBeenCalledOnce();
  });
});
