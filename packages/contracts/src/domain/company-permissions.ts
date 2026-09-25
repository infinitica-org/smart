/**
 * Company-side (employer) member roles and the permission map (EMP-02).
 *
 * `UserRole.COMPANY` says "this user belongs to a company tenant"; `CompanyMemberRole` says what they
 * may do inside it. Every employer route authorises against this map instead of a per-route role
 * list, so an OWNER can never be locked out of company actions by a missing entry.
 */

export const COMPANY_MEMBER_ROLES = ['OWNER', 'RECRUITER'] as const;
export type CompanyMemberRole = (typeof COMPANY_MEMBER_ROLES)[number];

export const COMPANY_PERMISSIONS = [
  'company.profile.edit',
  'company.team.view',
  'company.team.invite',
  'company.team.manage',
  'company.reviews.respond',
] as const;
export type CompanyPermission = (typeof COMPANY_PERMISSIONS)[number];

export const COMPANY_ROLE_PERMISSIONS: Readonly<
  Record<CompanyMemberRole, readonly CompanyPermission[]>
> = {
  OWNER: COMPANY_PERMISSIONS,
  RECRUITER: ['company.profile.edit', 'company.team.view', 'company.reviews.respond'],
};

export function companyRoleHasPermission(
  role: CompanyMemberRole | null | undefined,
  permission: CompanyPermission,
): boolean {
  return role ? COMPANY_ROLE_PERMISSIONS[role].includes(permission) : false;
}
