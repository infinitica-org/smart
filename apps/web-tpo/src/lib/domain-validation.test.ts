import { describe, expect, it } from 'vitest';
import { validateDomain } from './domain-validation';

describe('validateDomain', () => {
  it('validates exact domain match', () => {
    expect(validateDomain('student@psgtech.ac.in', 'psgtech.ac.in')).toBe(true);
    expect(validateDomain('STUDENT@PSGTECH.AC.IN', 'psgtech.ac.in')).toBe(true);
  });

  it('validates subdomain match', () => {
    expect(validateDomain('student@cs.psgtech.ac.in', 'psgtech.ac.in')).toBe(true);
    expect(validateDomain('student@batch2026.cs.psgtech.ac.in', 'psgtech.ac.in')).toBe(true);
  });

  it('rejects unrelated domain that shares a suffix', () => {
    expect(validateDomain('student@notpsgtech.ac.in', 'psgtech.ac.in')).toBe(false);
    expect(validateDomain('student@psgtech.com', 'psgtech.ac.in')).toBe(false);
  });

  it('handles localhost domain for local development', () => {
    expect(validateDomain('student@localhost', 'localhost')).toBe(true);
    expect(validateDomain('student@dev.localhost', 'localhost')).toBe(true);
    expect(validateDomain('student@example.com', 'localhost')).toBe(false);
  });

  it('returns false for null, empty, or invalid domain', () => {
    expect(validateDomain('student@psgtech.ac.in', null)).toBe(false);
    expect(validateDomain('student@psgtech.ac.in', '')).toBe(false);
    expect(validateDomain('invalid-email', 'psgtech.ac.in')).toBe(false);
  });
});
