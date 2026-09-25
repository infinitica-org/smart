import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { API_PREFIX, ROUTES, USER_ROLES } from '@smart/contracts';
import { InstitutionsAdminController } from '../../modules/institutions/institutions-admin.controller.js';
import { AdminSessionsController } from '../../modules/auth/admin-sessions.controller.js';
import { UsersAdminController } from '../../modules/users/users-admin.controller.js';
import {
  PERMISSIONS,
  PERMISSIONS_KEY,
  ROLE_PERMISSIONS,
  rolesWithPermissions,
  type Permission,
} from './permissions.js';
import { ROLES_KEY } from './roles.decorator.js';

describe('permission matrix (S6-VV-99)', () => {
  it('covers every role, and only known permissions', () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual([...USER_ROLES].sort());
    for (const granted of Object.values(ROLE_PERMISSIONS)) {
      for (const permission of granted) expect(PERMISSIONS).toContain(permission);
    }
  });

  it('grants every permission to at least one role', () => {
    for (const permission of PERMISSIONS) {
      expect(rolesWithPermissions([permission]), permission).not.toEqual([]);
    }
  });

  it('never grants anything to unauthenticated traffic', () => {
    expect(ROLE_PERMISSIONS.PUBLIC).toEqual([]);
  });

  it('changes only through a reviewed snapshot', () => {
    expect(ROLE_PERMISSIONS).toMatchSnapshot();
  });
});

/**
 * Migrated routes must still admit exactly the roles their contract declares,
 * so moving from @Roles to @RequirePermission cannot silently widen access.
 */
const MIGRATED: Array<{
  controller: { prototype: object };
  handler: string;
  method: string;
  path: string;
}> = [
  {
    controller: UsersAdminController,
    handler: 'assignRole',
    method: 'POST',
    path: '/admin/users/:userId/role',
  },
  {
    controller: UsersAdminController,
    handler: 'holdUser',
    method: 'POST',
    path: '/admin/users/:userId/hold',
  },
  {
    controller: UsersAdminController,
    handler: 'releaseUser',
    method: 'POST',
    path: '/admin/users/:userId/release-hold',
  },
  { controller: AdminSessionsController, handler: 'list', method: 'GET', path: '/admin/sessions' },
  {
    controller: AdminSessionsController,
    handler: 'revoke',
    method: 'POST',
    path: '/admin/sessions/:sessionId/revoke',
  },
  {
    controller: InstitutionsAdminController,
    handler: 'auditLogs',
    method: 'GET',
    path: '/admin/audit-logs',
  },
  {
    controller: InstitutionsAdminController,
    handler: 'exportAuditLogs',
    method: 'GET',
    path: '/admin/audit-logs/export',
  },
];

describe('routes migrated to @RequirePermission', () => {
  it.each(MIGRATED)(
    '$method $path admits exactly its contract roles',
    ({ controller, handler, method, path }) => {
      const target = (controller.prototype as Record<string, object>)[handler];
      const permissions = Reflect.getMetadata(PERMISSIONS_KEY, target as object) as
        Permission[] | undefined;
      expect(permissions?.length, `${handler} has no @RequirePermission`).toBeGreaterThan(0);

      const contract = ROUTES.find((route) => route.method === method && route.path === path);
      expect(contract, `${method} ${API_PREFIX}${path} missing from contracts`).toBeDefined();
      expect(rolesWithPermissions(permissions ?? []).sort()).toEqual(
        [...(contract?.roles ?? [])].sort(),
      );
    },
  );

  it('dropped the controller-wide @Roles on fully migrated controllers', () => {
    expect(Reflect.getMetadata(ROLES_KEY, UsersAdminController)).toBeUndefined();
    expect(Reflect.getMetadata(ROLES_KEY, AdminSessionsController)).toBeUndefined();
  });
});
