import { ForbiddenException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA, GUARDS_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it } from 'vitest';
import { InstitutionsTpoController } from '../../modules/institutions/institutions-tpo.controller.js';
import { PlacementMatchController } from '../../modules/matching/placement-match.controller.js';
import { PlacementController } from '../../modules/placement/placement.controller.js';
import { TenantScopeGuard } from '../guards/tenant-scope.guard.js';
import type { RequestUser } from '../guards/jwt-auth.guard.js';
import { resolveTenantId, TenantId } from './tenant-id.decorator.js';

const INSTITUTION = '11111111-1111-4111-8111-111111111111';

function user(overrides: Partial<RequestUser>): RequestUser {
  return { sub: 'user-1', role: 'INSTITUTION_ADMIN', ...overrides } as RequestUser;
}

describe('resolveTenantId', () => {
  it("returns the caller's institution", () => {
    expect(resolveTenantId(user({ inst: INSTITUTION }))).toBe(INSTITUTION);
  });

  it.each([
    ['a staff account with no institution', user({ inst: undefined })],
    ['a SUPER_ADMIN with no institution', user({ role: 'SUPER_ADMIN', inst: undefined })],
    ['an unauthenticated request', undefined],
  ])('rejects %s with 403 instead of returning undefined', (_label, caller) => {
    expect(() => resolveTenantId(caller)).toThrow(ForbiddenException);
  });
});

/** Handler names on a controller that receive `@TenantId()`. */
function handlersWithTenantId(controller: new (...args: never[]) => unknown): Set<string> {
  // createParamDecorator keys its metadata by a generated id; any entry for TenantId carries its
  // factory, and a probe decorator gives us that factory to compare against.
  class Probe {
    handler(_institutionId: string): void {}
  }
  TenantId()(Probe.prototype, 'handler', 0);
  const probe = Object.values(
    Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, 'handler') as Record<
      string,
      { factory?: unknown }
    >,
  )[0];

  const names = new Set<string>();
  for (const name of Object.getOwnPropertyNames(controller.prototype)) {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, name) as
      Record<string, { factory?: unknown }> | undefined;
    if (args && Object.values(args).some((arg) => arg.factory === probe?.factory)) {
      names.add(name);
    }
  }
  return names;
}

function routeHandlers(controller: new (...args: never[]) => unknown): string[] {
  return Object.getOwnPropertyNames(controller.prototype).filter(
    (name) => name !== 'constructor' && Reflect.getMetadata('path', controller.prototype[name]),
  );
}

describe('tenant scoping on institution controllers (#166)', () => {
  it.each([
    ['InstitutionsTpoController', InstitutionsTpoController],
    ['PlacementMatchController', PlacementMatchController],
  ] as const)('%s is guarded and every route takes @TenantId()', (_name, controller) => {
    expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toContain(TenantScopeGuard);
    const scoped = handlersWithTenantId(controller);
    const routes = routeHandlers(controller);
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.filter((name) => !scoped.has(name))).toEqual([]);
  });

  it('PlacementController scopes every route except the multi-role evidence reads', () => {
    const scoped = handlersWithTenantId(PlacementController);
    const unscoped = routeHandlers(PlacementController).filter((name) => !scoped.has(name));
    // These also serve COMPANY / B2B_PARTNER / SUPER_ADMIN, who have no institution.
    expect(unscoped.sort()).toEqual(
      ['getCandidateEvidenceVersion', 'listCandidateEvidenceVersions', 'meta'].sort(),
    );
  });
});
