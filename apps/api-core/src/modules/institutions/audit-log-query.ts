import type { AuditLogSection, ListAuditLogsQuery } from '@smart/contracts';
import type { Prisma, UserRole as PrismaUserRole } from '../../generated/prisma/index.js';

/** Groups the raw UserRole enum into the three audit-log tabs the superadmin UI shows. */
export const AUDIT_LOG_SECTION_ROLES: Record<AuditLogSection, PrismaUserRole[]> = {
  STUDENT: ['STUDENT'],
  TPO: ['INSTITUTION_ADMIN', 'PLACEMENT_STAFF'],
  SUPER_ADMIN: ['SUPER_ADMIN'],
};

/**
 * The one filter definition behind both `GET /admin/audit-logs` and its export
 * (S6-VV-101), so the file a SUPER_ADMIN downloads always matches the screen.
 */
export function buildAuditLogWhere(query: ListAuditLogsQuery = {}): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
  if (query.resourceType) where.resourceType = query.resourceType;
  if (query.resourceId) where.resourceId = query.resourceId;
  if (query.actorId) where.actorId = query.actorId;
  if (query.section) {
    where.actor = { is: { role: { in: AUDIT_LOG_SECTION_ROLES[query.section] } } };
  }
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
  }
  if (query.q) {
    where.OR = [
      { action: { contains: query.q, mode: 'insensitive' } },
      { reasonCode: { contains: query.q, mode: 'insensitive' } },
      { resourceId: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  return where;
}
