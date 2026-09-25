import { SmartApiError } from '@smart/api-client';
import type { CompanyProfile } from '@smart/contracts';
import { describe, expect, it } from 'vitest';
import {
  createKeyTracker,
  fieldErrorsFromError,
  isVersionConflict,
  toFormState,
  toUpdateBody,
  validateProfileBody,
} from './company-profile-form';

const profile: CompanyProfile = {
  companyId: '11111111-1111-4111-8111-111111111111',
  slug: 'acme-11111111',
  displayName: 'Acme',
  logoUrl: null,
  website: null,
  about: null,
  benefits: ['Health cover', 'Remote days'],
  socialLinks: {},
  industry: null,
  employeeCount: null,
  headquarters: null,
  additionalLocations: [],
  version: 2,
  isVerified: false,
  verifiedAt: null,
};

describe('company profile form helpers', () => {
  it('round-trips a profile and drops blank optional values', () => {
    const form = toFormState(profile);
    expect(form.benefitsText).toBe('Health cover\nRemote days');
    const body = toUpdateBody({ ...form, additionalLocations: ['Pune', '  '] });
    expect(body).toMatchObject({
      displayName: 'Acme',
      website: null,
      about: null,
      benefits: ['Health cover', 'Remote days'],
      additionalLocations: ['Pune'],
      socialLinks: {},
    });
    expect(body).not.toHaveProperty('industry');
    expect(body).not.toHaveProperty('employeeCount');
  });

  it('validates with the shared schema: dropdown values and the 2000-char limit', () => {
    const form = { ...toFormState(profile), about: 'a'.repeat(2001), industry: 'Wizardry' };
    const errors = validateProfileBody(toUpdateBody(form));
    expect(errors.about).toBeDefined();
    expect(errors.industry).toBeDefined();
    expect(validateProfileBody(toUpdateBody(toFormState(profile)))).toEqual({});
  });

  it('maps a server 422 onto field paths and ignores other errors', () => {
    const err = new SmartApiError({
      error: 'validation_failed',
      message: 'Request failed validation.',
      statusCode: 422,
      details: [{ path: 'about', message: 'Too long' }],
    } as never);
    expect(fieldErrorsFromError(err)).toEqual({ about: 'Too long' });
    expect(fieldErrorsFromError(new Error('boom'))).toBeNull();
  });

  it('recognises a stale-version conflict', () => {
    const conflict = new SmartApiError({
      error: 'version_conflict',
      message: 'stale',
      statusCode: 409,
    } as never);
    expect(isVersionConflict(conflict)).toBe(true);
    expect(isVersionConflict(new Error('x'))).toBe(false);
  });

  it('reuses the Idempotency-Key for a retry of the same payload only', () => {
    let n = 0;
    const tracker = createKeyTracker(() => `key-${++n}`);
    expect(tracker.keyFor('a')).toBe('key-1');
    expect(tracker.keyFor('a')).toBe('key-1');
    expect(tracker.keyFor('b')).toBe('key-2');
    tracker.reset();
    expect(tracker.keyFor('b')).toBe('key-3');
  });
});
