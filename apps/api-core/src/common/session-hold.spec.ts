import { describe, expect, it } from 'vitest';
import { SESSION_HOLD_MESSAGE } from '@smart/contracts';
import { COMPANY_UNVERIFIED_MESSAGE, resolveSessionHold } from './session-hold.js';

function companyUser(company: Record<string, unknown> | null, role = 'COMPANY') {
  return {
    role,
    heldAt: null,
    institution: null,
    company: company
      ? { heldAt: null, deactivatedAt: null, verificationStatus: 'APPROVED', ...company }
      : null,
  };
}

describe('resolveSessionHold: company verification (S6-VV-139)', () => {
  it.each(['PENDING', 'REJECTED'])('holds a company user once verification is %s', (status) => {
    expect(resolveSessionHold(companyUser({ verificationStatus: status }))).toEqual({
      code: 'company_held',
      message: COMPANY_UNVERIFIED_MESSAGE,
    });
  });

  it('lets an approved company through', () => {
    expect(resolveSessionHold(companyUser({}))).toBeNull();
  });

  it('does not guess when the verification status was not loaded', () => {
    expect(resolveSessionHold(companyUser({ verificationStatus: undefined }))).toBeNull();
  });

  it('keeps the explicit hold message when the company is also on hold', () => {
    expect(
      resolveSessionHold(companyUser({ heldAt: new Date(), verificationStatus: 'REJECTED' })),
    ).toEqual({ code: 'company_held', message: SESSION_HOLD_MESSAGE.company_held });
  });

  it('only applies the verification rule to COMPANY accounts', () => {
    expect(
      resolveSessionHold(companyUser({ verificationStatus: 'REJECTED' }, 'B2B_PARTNER')),
    ).toBeNull();
  });
});
