import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { TenantScopeGuard } from './tenant-scope.guard.js';
import type { RequestUser } from './jwt-auth.guard.js';

function contextWithUser(user: RequestUser | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}

function reflector(publicRoute: boolean) {
  return {
    getAllAndOverride: vi.fn((key: string) => (key === IS_PUBLIC_KEY ? publicRoute : undefined)),
  };
}

describe('TenantScopeGuard', () => {
  const superAdmin: RequestUser = { sub: 'a', role: 'SUPER_ADMIN', inst: null };
  const institutionAdmin: RequestUser = { sub: 't', role: 'INSTITUTION_ADMIN', inst: 'i' };
  const unaffiliated: RequestUser = { sub: 's', role: 'STUDENT', inst: null };

  it('allows public routes without a user', () => {
    const guard = new TenantScopeGuard(reflector(true) as never);
    expect(guard.canActivate(contextWithUser(undefined))).toBe(true);
  });

  it('allows SUPER_ADMIN regardless of institution', () => {
    const guard = new TenantScopeGuard(reflector(false) as never);
    expect(guard.canActivate(contextWithUser(superAdmin))).toBe(true);
  });

  it('allows a caller with an institution', () => {
    const guard = new TenantScopeGuard(reflector(false) as never);
    expect(guard.canActivate(contextWithUser(institutionAdmin))).toBe(true);
  });

  it('blocks a caller with no institution with 403', () => {
    const guard = new TenantScopeGuard(reflector(false) as never);
    expect(() => guard.canActivate(contextWithUser(unaffiliated))).toThrow(ForbiddenException);
  });

  it('blocks a missing user with 403', () => {
    const guard = new TenantScopeGuard(reflector(false) as never);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(ForbiddenException);
  });
});
