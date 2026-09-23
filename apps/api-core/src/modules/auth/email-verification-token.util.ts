import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../platform/config/env.js';

export function generateEmailVerificationToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  const hash = hashEmailVerificationToken(raw);
  return { raw, hash };
}

export function hashEmailVerificationToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function buildEmailVerificationUrl(rawToken: string): string {
  return `${env.AUTH_APP_URL}/verify-email/${rawToken}`;
}

export function emailVerificationExpiresAt(): Date {
  const expires = new Date();
  expires.setHours(expires.getHours() + env.EMAIL_VERIFICATION_TTL_HOURS);
  return expires;
}
