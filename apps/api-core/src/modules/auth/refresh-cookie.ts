import type { FastifyReply } from 'fastify';
import { env } from '../../platform/config/env.js';

type CookieReply = FastifyReply & {
  setCookie(name: string, value: string, options?: Record<string, unknown>): unknown;
  clearCookie(name: string, options?: Record<string, unknown>): unknown;
};

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
  void (reply as CookieReply).setCookie(env.REFRESH_COOKIE_NAME, rawToken, refreshCookieOptions());
}

export function clearRefreshCookie(reply: FastifyReply): void {
  void (reply as CookieReply).clearCookie(env.REFRESH_COOKIE_NAME, { path: '/' });
}
