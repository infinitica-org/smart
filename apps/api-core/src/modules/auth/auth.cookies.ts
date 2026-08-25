import { createHash } from 'node:crypto';
import type { FastifyReply } from 'fastify';
import { API_PREFIX } from '@smart/contracts';
import { env } from '../../platform/config/env.js';

export const REFRESH_COOKIE_PATH = `${API_PREFIX}/auth`;

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function attachRefreshCookie(reply: FastifyReply, raw: string): void {
  void reply.setCookie(env.REFRESH_COOKIE_NAME, raw, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: REFRESH_COOKIE_PATH,
    maxAge: env.REFRESH_TTL_SECONDS,
  });
}

export function clearRefreshCookie(reply: FastifyReply): void {
  void reply.clearCookie(env.REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

export function readRefreshCookie(request: {
  cookies?: Record<string, string | undefined>;
}): string | undefined {
  const value = request.cookies?.[env.REFRESH_COOKIE_NAME];
  return value && value.length > 0 ? value : undefined;
}
