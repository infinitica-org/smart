import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@smart/contracts';

/**
 * S6-VV-99 — the central permission matrix (Zoho #174).
 *
 * Routes declare WHAT they do (`@RequirePermission('session.revoke')`); this
 * file is the one place that decides WHICH roles may do it. Granting a role a
 * new capability is a one-line matrix change, reviewed via the snapshot in
 * permissions.spec.ts, instead of editing `@Roles([...])` lists across
 * controllers.
 *
 * `@Roles` keeps working for every route not yet migrated; `RolesGuard` checks
 * both. New admin/company routes should use `@RequirePermission`.
 */
export const PERMISSIONS = [
  'user.role.assign',
  'user.access.manage',
  'session.read',
  'session.revoke',
  'audit.read',
  'audit.export',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly Permission[]>> = {
  SUPER_ADMIN: PERMISSIONS,
  INSTITUTION_ADMIN: [],
  PLACEMENT_STAFF: [],
  STUDENT: [],
  B2B_PARTNER: [],
  COMPANY: [],
  PUBLIC: [],
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Roles that hold every one of `permissions` (used to cross-check route contracts). */
export function rolesWithPermissions(permissions: readonly Permission[]): UserRole[] {
  return (Object.keys(ROLE_PERMISSIONS) as UserRole[]).filter((role) =>
    permissions.every((permission) => roleHasPermission(role, permission)),
  );
}

export const PERMISSIONS_KEY = 'permissions';

/** Requires the caller's role to hold every listed permission. Enforced by RolesGuard. */
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
