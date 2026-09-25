import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { PERMISSIONS_KEY } from './permissions.js';
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

function reflector(publicRoute: boolean, roles: string[] | undefined, permissions?: string[]) {
  return {
    getAllAndOverride: vi.fn((key: string) => {
      if (key === IS_PUBLIC_KEY) return publicRoute;
      if (key === ROLES_KEY) return roles;
      if (key === PERMISSIONS_KEY) return permissions;
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

describe('RolesGuard with @RequirePermission (S6-VV-99)', () => {
  const tpo: RequestUser = { sub: 't', role: 'INSTITUTION_ADMIN', inst: 'i' };
  const admin: RequestUser = { sub: 'a', role: 'SUPER_ADMIN', inst: null };

  it('allows a role the matrix grants the permission to', () => {
    const guard = new RolesGuard(reflector(false, undefined, ['session.revoke']) as never);
    expect(guard.canActivate(contextWithUser(admin))).toBe(true);
  });

  it('forbids a role the matrix does not grant', () => {
    const guard = new RolesGuard(reflector(false, undefined, ['session.revoke']) as never);
    expect(() => guard.canActivate(contextWithUser(tpo))).toThrow(ForbiddenException);
  });

  it('requires every listed permission', () => {
    const guard = new RolesGuard(
      reflector(false, undefined, ['session.read', 'not.a.permission']) as never,
    );
    expect(() => guard.canActivate(contextWithUser(admin))).toThrow(ForbiddenException);
  });

  it('forbids a permission-guarded route without a user', () => {
    const guard = new RolesGuard(reflector(false, undefined, ['audit.read']) as never);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(ForbiddenException);
  });

  it('enforces both when a route carries @Roles and @RequirePermission', () => {
    const guard = new RolesGuard(reflector(false, ['INSTITUTION_ADMIN'], ['audit.read']) as never);
    expect(() => guard.canActivate(contextWithUser(tpo))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contextWithUser(admin))).toThrow(ForbiddenException);
  });

  it('still lets public routes through regardless of permissions', () => {
    const guard = new RolesGuard(reflector(true, undefined, ['audit.read']) as never);
    expect(guard.canActivate(contextWithUser(undefined))).toBe(true);
  });
});
