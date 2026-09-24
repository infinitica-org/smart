import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';

describe('AuthService.tryVerifyAccessToken (optional viewer on public routes)', () => {
  const claims = { sub: 'employer-1', role: 'COMPANY', inst: null, companyId: 'co-1' };

  function build(verify: (token: string) => unknown) {
    const jwt = { verify: vi.fn(verify) };
    return { auth: new AuthService({} as any, jwt as any, {} as any, {} as any), jwt };
  }

  it('returns the caller for a valid bearer token', () => {
    const { auth, jwt } = build(() => claims);

    expect(auth.tryVerifyAccessToken('Bearer good.token')).toEqual(claims);
    expect(jwt.verify).toHaveBeenCalledWith('good.token');
  });

  it.each([
    ['a missing header', undefined],
    ['a non-bearer scheme', 'Basic abc'],
    ['an empty header', ''],
  ])('returns null for %s without verifying anything', (_label, header) => {
    const { auth, jwt } = build(() => claims);

    expect(auth.tryVerifyAccessToken(header)).toBeNull();
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('returns null, and never throws, for an expired or forged token', () => {
    const { auth } = build(() => {
      throw new Error('jwt expired');
    });

    expect(auth.tryVerifyAccessToken('Bearer expired.token')).toBeNull();
  });
});
