import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../platform/config/env.js';

export function generatePasswordResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  const hash = hashPasswordResetToken(raw);
  return { raw, hash };
}

export function hashPasswordResetToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function buildPasswordResetUrl(rawToken: string): string {
  return `${env.AUTH_APP_URL}/reset-password/${rawToken}`;
}

export function passwordResetExpiresAt(): Date {
  const expires = new Date();
  expires.setHours(expires.getHours() + env.PASSWORD_RESET_TTL_HOURS);
  return expires;
}
