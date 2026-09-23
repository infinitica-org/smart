import { describe, expect, it } from 'vitest';
import {
  generateEmailVerificationToken,
  hashEmailVerificationToken,
} from './email-verification-token.util.js';

describe('email verification tokens', () => {
  it('hashes raw tokens deterministically', () => {
    const raw = 'test-token-value';
    expect(hashEmailVerificationToken(raw)).toBe(hashEmailVerificationToken(raw));
  });

  it('generates unique token pairs', () => {
    const a = generateEmailVerificationToken();
    const b = generateEmailVerificationToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });
});
