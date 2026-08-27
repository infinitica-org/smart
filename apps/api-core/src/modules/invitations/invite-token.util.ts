import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../platform/config/env.js';

export function generateInviteToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  const hash = hashInviteToken(raw);
  return { raw, hash };
}

export function hashInviteToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function buildInviteUrl(rawToken: string): string {
  return `${env.AUTH_APP_URL}/invite/${rawToken}`;
}

export function invitationExpiresAt(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + env.INVITATION_TTL_DAYS);
  return expires;
}
