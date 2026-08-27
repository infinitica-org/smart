import { describe, expect, it } from 'vitest';
import { generateInviteToken, hashInviteToken } from './invite-token.util.js';

describe('invite tokens', () => {
  it('hashes raw tokens deterministically', () => {
    const raw = 'test-token-value';
    expect(hashInviteToken(raw)).toBe(hashInviteToken(raw));
  });

  it('generates unique token pairs', () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });
});
