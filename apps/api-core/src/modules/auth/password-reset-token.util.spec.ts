import { describe, expect, it } from 'vitest';
import { generatePasswordResetToken, hashPasswordResetToken } from './password-reset-token.util.js';

describe('password reset tokens', () => {
  it('hashes raw tokens deterministically', () => {
    const raw = 'test-token-value';
    expect(hashPasswordResetToken(raw)).toBe(hashPasswordResetToken(raw));
  });

  it('generates unique token pairs', () => {
    const a = generatePasswordResetToken();
    const b = generatePasswordResetToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });
});
