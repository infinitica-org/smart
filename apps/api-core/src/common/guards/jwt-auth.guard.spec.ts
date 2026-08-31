import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard, type RequestUser } from './jwt-auth.guard.js';

function contextWithAuth(authorization: string | undefined): ExecutionContext {
  const request: { headers: { authorization?: string }; user?: RequestUser } = {
    headers: { authorization },
  };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('allows public routes without a bearer token', () => {
    const publicReflector = {
      getAllAndOverride: vi.fn(() => true),
    };
    const guard = new JwtAuthGuard({ verify: vi.fn() } as never, publicReflector as never);
    expect(guard.canActivate(contextWithAuth(undefined))).toBe(true);
  });

  it('rejects a missing bearer token with 401', () => {
    const privateReflector = {
      getAllAndOverride: vi.fn(() => false),
    };
    const guard = new JwtAuthGuard({ verify: vi.fn() } as never, privateReflector as never);
    expect(() => guard.canActivate(contextWithAuth(undefined))).toThrow(UnauthorizedException);
  });

  it('attaches verified claims for a valid bearer token', () => {
    const privateReflector = {
      getAllAndOverride: vi.fn(() => false),
    };
    const user: RequestUser = { sub: 'u1', role: 'STUDENT', inst: null };
    const jwt = { verify: vi.fn(() => user) };
    const ctx = contextWithAuth('Bearer access.jwt');
    const guard = new JwtAuthGuard(jwt as never, privateReflector as never);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(jwt.verify).toHaveBeenCalledWith('access.jwt');
    expect((ctx.switchToHttp().getRequest() as { user?: RequestUser }).user).toEqual(user);
  });

  it('rejects an invalid token with 401', () => {
    const privateReflector = {
      getAllAndOverride: vi.fn(() => false),
    };
    const guard = new JwtAuthGuard(
      {
        verify: vi.fn(() => {
          throw new Error('expired');
        }),
      } as never,
      privateReflector as never,
    );
    expect(() => guard.canActivate(contextWithAuth('Bearer stale'))).toThrow(UnauthorizedException);
  });
});
