import { describe, expect, it } from 'vitest';
import { signaturesMatch, signViolation } from './hmac.js';

describe('proctoring hmac', () => {
  it('verifies a matching signature', () => {
    const sig = signViolation('secret', 'attempt', 'nonce', 'TAB_BLUR');
    expect(signaturesMatch(sig, sig)).toBe(true);
    expect(signaturesMatch(sig, '0'.repeat(sig.length))).toBe(false);
  });
});
