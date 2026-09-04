import { afterEach, describe, expect, it } from 'vitest';
import { deviceFingerprintHash, isProctoringEnabled } from './crypto';

describe('proctoring crypto helpers', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_PROCTORING_FULL;
  });

  it('builds a stable-length fingerprint string', () => {
    expect(deviceFingerprintHash().length).toBe(64);
  });

  it('is enabled unless NEXT_PUBLIC_PROCTORING_FULL is false', () => {
    delete process.env.NEXT_PUBLIC_PROCTORING_FULL;
    expect(isProctoringEnabled()).toBe(true);
    process.env.NEXT_PUBLIC_PROCTORING_FULL = 'false';
    expect(isProctoringEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_PROCTORING_FULL = 'true';
    expect(isProctoringEnabled()).toBe(true);
  });
});
