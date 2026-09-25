import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AssistedSupportGuard } from './assisted-support.guard.js';

function createMockContext(method: string, url: string, user?: any) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        url,
        user,
      }),
    }),
  } as any;
}

describe('AssistedSupportGuard', () => {
  const guard = new AssistedSupportGuard();

  it('allows non-delegated users to perform GET, POST, PUT, DELETE operations', () => {
    const user = { sub: 'user-1', role: 'STUDENT', isDelegated: false };
    expect(guard.canActivate(createMockContext('GET', '/users/me', user))).toBe(true);
    expect(guard.canActivate(createMockContext('POST', '/users/me/projects', user))).toBe(true);
    expect(guard.canActivate(createMockContext('PUT', '/users/me/education/1', user))).toBe(true);
    expect(guard.canActivate(createMockContext('DELETE', '/users/me/resume', user))).toBe(true);
  });

  it('allows delegated sessions to perform GET requests', () => {
    const user = { sub: 'user-1', role: 'STUDENT', isDelegated: true };
    expect(guard.canActivate(createMockContext('GET', '/users/me/projects', user))).toBe(true);
  });

  it('allows delegated sessions to perform HEAD requests', () => {
    const user = { sub: 'user-1', role: 'STUDENT', isDelegated: true };
    expect(guard.canActivate(createMockContext('HEAD', '/users/me/resume', user))).toBe(true);
  });

  it('blocks delegated sessions from performing POST requests', () => {
    const user = { sub: 'user-1', role: 'STUDENT', isDelegated: true };
    expect(() => guard.canActivate(createMockContext('POST', '/users/me/projects', user))).toThrow(
      ForbiddenException,
    );

    try {
      guard.canActivate(createMockContext('POST', '/users/me/projects', user));
    } catch (err: any) {
      expect(err.getResponse()).toEqual({
        error: 'assisted_support_read_only',
        message: 'Mutating actions are restricted during an assisted support session.',
        statusCode: 403,
      });
    }
  });

  it('blocks delegated sessions from performing PUT requests', () => {
    const user = { sub: 'user-1', role: 'STUDENT', isDelegated: true };
    expect(() =>
      guard.canActivate(createMockContext('PUT', '/users/me/education/123', user)),
    ).toThrow(ForbiddenException);
  });

  it('blocks delegated sessions from performing PATCH requests', () => {
    const user = { sub: 'user-1', role: 'STUDENT', isDelegated: true };
    expect(() => guard.canActivate(createMockContext('PATCH', '/users/me/profile', user))).toThrow(
      ForbiddenException,
    );
  });

  it('blocks delegated sessions from performing DELETE requests', () => {
    const user = { sub: 'user-1', role: 'STUDENT', isDelegated: true };
    expect(() => guard.canActivate(createMockContext('DELETE', '/users/me/resume', user))).toThrow(
      ForbiddenException,
    );
  });

  it('allows delegated sessions to POST to session end endpoint', () => {
    const user = { sub: 'user-1', role: 'STUDENT', isDelegated: true };
    expect(guard.canActivate(createMockContext('POST', '/admin/support/session/end', user))).toBe(
      true,
    );
  });
});
