import { ForbiddenException } from '@nestjs/common';
import { companyRoleHasPermission } from '@smart/contracts';
import type { CompanyMemberRole, CompanyPermission } from '@smart/contracts';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';

export interface CompanyActor {
  readonly userId: string;
  readonly companyId: string;
  readonly role: CompanyMemberRole;
}

function forbidden(message = 'You do not have permission to perform this action.') {
  return new ForbiddenException({ error: 'forbidden', message, statusCode: 403 });
}

/**
 * Resolves the caller's company membership from the database (not the JWT) so a deactivated or
 * demoted teammate loses access immediately, then checks the permission map. Every employer route
 * goes through this one function, so there is no per-route role list an OWNER can fall out of.
 */
export async function requireCompanyActor(
  prisma: Pick<PrismaService, 'user'>,
  userId: string,
  permission: CompanyPermission,
): Promise<CompanyActor> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, companyId: true, companyRole: true, deactivatedAt: true },
  });
  if (!user || user.role !== 'COMPANY' || !user.companyId || !user.companyRole) {
    throw forbidden();
  }
  if (user.deactivatedAt) {
    throw forbidden('Your access to this company has been deactivated.');
  }
  if (!companyRoleHasPermission(user.companyRole, permission)) {
    throw forbidden();
  }
  return { userId, companyId: user.companyId, role: user.companyRole };
}
