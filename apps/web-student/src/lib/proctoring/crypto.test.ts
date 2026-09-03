import { describe, expect, it } from 'vitest';
import { deviceFingerprintHash } from './crypto';

describe('proctoring crypto helpers', () => {
  it('builds a stable-length fingerprint string', () => {
    expect(deviceFingerprintHash().length).toBe(64);
  });
});
