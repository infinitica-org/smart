import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ReadinessController } from './readiness.controller.js';

function contextFor(user: RequestUser | undefined): ExecutionContext {
  return {
    getHandler: () => ReadinessController.prototype.getReadiness,
    getClass: () => ReadinessController,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('ReadinessController authorization', () => {
  const guard = new RolesGuard(new Reflector());

  it('lets a student read their own readiness', () => {
    const student: RequestUser = { sub: 's1', role: 'STUDENT', inst: null };
    expect(guard.canActivate(contextFor(student))).toBe(true);
  });

  it.each(['INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'COMPANY', 'SUPER_ADMIN'] as const)(
    'refuses %s',
    (role) => {
      const user: RequestUser = { sub: 'u1', role, inst: 'i1' };
      expect(() => guard.canActivate(contextFor(user))).toThrow(ForbiddenException);
    },
  );

  it('always reads the caller from the token and never from a request parameter', () => {
    const getSummary = vi.fn().mockResolvedValue({});
    const controller = new ReadinessController({ getSummary } as never);
    void controller.getReadiness({ sub: 's1', role: 'STUDENT', inst: null });
    expect(getSummary).toHaveBeenCalledWith('s1');
    expect(ReadinessController.prototype.getReadiness.length).toBe(1);
  });
});
