import { describe, expect, it } from 'vitest';
import { ROUTES } from '@smart/contracts';

const COMPANY_PORTAL_ROLES = ['COMPANY'] as const;

function roleAllowsPortal(role: string, allowed: readonly string[]): boolean {
  return allowed.includes(role);
}

describe('GET /auth/company/account access', () => {
  const route = ROUTES.find((r) => r.method === 'GET' && r.path === '/auth/company/account');

  it('is declared for COMPANY role only', () => {
    expect(route?.roles).toEqual(['COMPANY']);
  });

  it('allows COMPANY on the company portal gate', () => {
    expect(roleAllowsPortal('COMPANY', COMPANY_PORTAL_ROLES)).toBe(true);
  });

  it.each(['STUDENT', 'B2B_PARTNER', 'SUPER_ADMIN', 'INSTITUTION_ADMIN'] as const)(
    'denies %s on the company portal gate',
    (role) => {
      expect(roleAllowsPortal(role, COMPANY_PORTAL_ROLES)).toBe(false);
    },
  );
});
