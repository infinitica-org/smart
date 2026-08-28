import type { FastifyReply } from 'fastify';
import { env } from '../../platform/config/env.js';

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: env.REFRESH_TTL_SECONDS,
  };
}

export function setRefreshCookie(reply: FastifyReply, rawToken: string): void {
  void reply.setCookie(env.REFRESH_COOKIE_NAME, rawToken, refreshCookieOptions());
}

export function clearRefreshCookie(reply: FastifyReply): void {
  void reply.clearCookie(env.REFRESH_COOKIE_NAME, { path: '/' });
}
