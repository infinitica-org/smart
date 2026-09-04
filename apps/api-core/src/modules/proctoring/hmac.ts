import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function randomNonce(): string {
  return randomBytes(16).toString('hex');
}

export function signViolation(
  secret: string,
  attemptId: string,
  nonce: string,
  kind: string,
): string {
  return createHmac('sha256', secret).update(`${attemptId}:${nonce}:${kind}`).digest('hex');
}

export function signaturesMatch(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
