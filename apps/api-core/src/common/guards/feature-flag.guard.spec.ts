import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { REQUIRE_FLAG_KEY } from './feature-flag.decorator.js';
import { FeatureFlagGuard } from './feature-flag.guard.js';
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

function reflector(publicRoute: boolean, requiredFlag: string | undefined) {
  return {
    getAllAndOverride: vi.fn((key: string) => {
      if (key === IS_PUBLIC_KEY) return publicRoute;
      if (key === REQUIRE_FLAG_KEY) return requiredFlag;
      return undefined;
    }),
  };
}

describe('FeatureFlagGuard', () => {
  const tpo: RequestUser = { sub: 't', role: 'INSTITUTION_ADMIN', inst: 'inst-1' };

  it('allows public routes without checking any flag', async () => {
    const assertInstitutionFlag = vi.fn();
    const guard = new FeatureFlagGuard(
      reflector(true, 'bulk_batch_import') as never,
      {
        assertInstitutionFlag,
      } as never,
    );
    await expect(guard.canActivate(contextWithUser(undefined))).resolves.toBe(true);
    expect(assertInstitutionFlag).not.toHaveBeenCalled();
  });

  it('allows routes with no @RequireFlag metadata without checking any flag', async () => {
    const assertInstitutionFlag = vi.fn();
    const guard = new FeatureFlagGuard(
      reflector(false, undefined) as never,
      {
        assertInstitutionFlag,
      } as never,
    );
    await expect(guard.canActivate(contextWithUser(tpo))).resolves.toBe(true);
    expect(assertInstitutionFlag).not.toHaveBeenCalled();
  });

  it('allows the route when the institution flag resolves enabled', async () => {
    const assertInstitutionFlag = vi.fn().mockResolvedValue(undefined);
    const guard = new FeatureFlagGuard(
      reflector(false, 'bulk_batch_import') as never,
      {
        assertInstitutionFlag,
      } as never,
    );
    await expect(guard.canActivate(contextWithUser(tpo))).resolves.toBe(true);
    expect(assertInstitutionFlag).toHaveBeenCalledWith('inst-1', 'bulk_batch_import');
  });

  it('blocks with 403 when the institution flag resolves disabled', async () => {
    const assertInstitutionFlag = vi.fn().mockRejectedValue(
      new ForbiddenException({
        error: 'forbidden',
        message: "This institution's plan does not include bulk_batch_import.",
        statusCode: 403,
      }),
    );
    const guard = new FeatureFlagGuard(
      reflector(false, 'bulk_batch_import') as never,
      {
        assertInstitutionFlag,
      } as never,
    );
    await expect(guard.canActivate(contextWithUser(tpo))).rejects.toThrow(ForbiddenException);
  });

  it('blocks with 403 when the caller has no institution', async () => {
    const assertInstitutionFlag = vi.fn();
    const guard = new FeatureFlagGuard(
      reflector(false, 'bulk_batch_import') as never,
      {
        assertInstitutionFlag,
      } as never,
    );
    const orphan: RequestUser = { sub: 'x', role: 'INSTITUTION_ADMIN', inst: null };
    await expect(guard.canActivate(contextWithUser(orphan))).rejects.toThrow(ForbiddenException);
    expect(assertInstitutionFlag).not.toHaveBeenCalled();
  });
});
