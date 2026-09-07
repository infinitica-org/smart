import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../../platform/config/env.js';

/**
 * Opaque AES-256-GCM blob so skill-form answer keys never go to the client in
 * plaintext. Uses existing JWT_SECRET (no new env). Not a Redis store.
 */

function key(): Buffer {
  return createHash('sha256').update(`sde-v4-form:${env.JWT_SECRET}`).digest();
}

export function sealSdeFormPayload(payload: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function unsealSdeFormPayload<T>(token: string): T {
  const raw = Buffer.from(token, 'base64url');
  if (raw.length < 29) throw new Error('scoring token is too short');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8')) as T;
}
