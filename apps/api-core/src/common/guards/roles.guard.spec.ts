import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { ROLES_KEY } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
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

function reflector(publicRoute: boolean, roles: string[] | undefined) {
  return {
    getAllAndOverride: vi.fn((key: string) => {
      if (key === IS_PUBLIC_KEY) return publicRoute;
      if (key === ROLES_KEY) return roles;
      return undefined;
    }),
  };
}

describe('RolesGuard', () => {
  const student: RequestUser = { sub: 's', role: 'STUDENT', inst: null };
  const tpo: RequestUser = { sub: 't', role: 'INSTITUTION_ADMIN', inst: 'i' };
  const staff: RequestUser = { sub: 'p', role: 'PLACEMENT_STAFF', inst: 'i' };
  const admin: RequestUser = { sub: 'a', role: 'SUPER_ADMIN', inst: null };

  it('allows public routes without a user', () => {
    const guard = new RolesGuard(reflector(true, ['STUDENT']) as never);
    expect(guard.canActivate(contextWithUser(undefined))).toBe(true);
  });

  it('allows each login role on its declared routes', () => {
    expect(
      new RolesGuard(reflector(false, ['STUDENT']) as never).canActivate(contextWithUser(student)),
    ).toBe(true);
    expect(
      new RolesGuard(
        reflector(false, ['INSTITUTION_ADMIN', 'PLACEMENT_STAFF']) as never,
      ).canActivate(contextWithUser(tpo)),
    ).toBe(true);
    expect(
      new RolesGuard(
        reflector(false, ['INSTITUTION_ADMIN', 'PLACEMENT_STAFF']) as never,
      ).canActivate(contextWithUser(staff)),
    ).toBe(true);
    expect(
      new RolesGuard(reflector(false, ['SUPER_ADMIN']) as never).canActivate(
        contextWithUser(admin),
      ),
    ).toBe(true);
  });

  it('blocks a role mismatch with 403', () => {
    const guard = new RolesGuard(reflector(false, ['SUPER_ADMIN']) as never);
    expect(() => guard.canActivate(contextWithUser(tpo))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contextWithUser(student))).toThrow(ForbiddenException);
  });
});
