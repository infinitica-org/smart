import type { RecordActorDto } from '@smart/contracts';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';

/**
 * S6-VV-105 (#168) — resolves `createdById` / `updatedById` to `{ userId, email }`
 * for the institution and company detail views. Null when the row predates tracking
 * or the user was deleted (the FK is ON DELETE SET NULL).
 */
export async function resolveRecordActors(
  prisma: PrismaService,
  row: { createdById: string | null; updatedById: string | null },
): Promise<{ createdBy: RecordActorDto; updatedBy: RecordActorDto }> {
  const ids = [row.createdById, row.updatedById].filter((id): id is string => Boolean(id));
  if (ids.length === 0) return { createdBy: null, updatedBy: null };

  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, email: true },
  });
  const byId = new Map(users.map((user) => [user.id, { userId: user.id, email: user.email }]));
  return {
    createdBy: (row.createdById && byId.get(row.createdById)) || null,
    updatedBy: (row.updatedById && byId.get(row.updatedById)) || null,
  };
}
