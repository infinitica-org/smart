import { describe, expect, it } from 'vitest';

import {
  extractEmployerEmailDomain,
  validateVerifierEmailForEmployerSend,
} from './work-experience-verification-ui';

describe('extractEmployerEmailDomain', () => {
  it('parses email and website hostnames', () => {
    expect(extractEmployerEmailDomain('jane@acme.com')).toBe('acme.com');
    expect(extractEmployerEmailDomain('https://www.acme.com/about')).toBe('acme.com');
  });
});

describe('validateVerifierEmailForEmployerSend', () => {
  it('rejects personal email domains', () => {
    const result = validateVerifierEmailForEmployerSend({
      verifierEmail: 'manager@gmail.com',
      companyWebsite: 'https://acme.com',
    });
    expect(result.valid).toBe(false);
  });

  it('allows corporate email when company website is not set', () => {
    expect(
      validateVerifierEmailForEmployerSend({
        verifierEmail: 'manager@acme.com',
        companyWebsite: null,
      }).valid,
    ).toBe(true);
  });

  it('rejects domain mismatch when both domains are known', () => {
    const result = validateVerifierEmailForEmployerSend({
      verifierEmail: 'manager@other.com',
      companyWebsite: 'https://acme.com',
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toMatch(/does not match/);
    }
  });

  it('accepts subdomain match with company website', () => {
    expect(
      validateVerifierEmailForEmployerSend({
        verifierEmail: 'hr@mail.acme.com',
        companyWebsite: 'https://acme.com',
      }).valid,
    ).toBe(true);
  });
});
