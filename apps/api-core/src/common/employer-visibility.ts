import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/index.js';
import type { PrismaService } from '../platform/prisma/prisma.service.js';

/**
 * S6-VV-148 — the single definition of "a student employers may see".
 *
 * A student who deactivated their account (STU-02) or whose account an admin
 * put on hold must not surface to employers: not in match runs, not in stored
 * shortlists, not via send-to-company, and not through company evidence reads.
 * Institution (TPO) views of their own students deliberately do NOT apply this —
 * the institution keeps seeing its roster, deactivated members included.
 *
 * Extend this one place when a new visibility rule lands (discoverability
 * opt-out, email verification) instead of adding filters at each call site.
 */
export interface EmployerVisibilityFields {
  deactivatedAt: Date | null;
  heldAt: Date | null;
}

export const EMPLOYER_VISIBILITY_SELECT = { deactivatedAt: true, heldAt: true } as const;

/** Raw-SQL twin for queries that alias `users` as `u`. */
export const EMPLOYER_VISIBLE_STUDENT_SQL = Prisma.sql`u.deactivated_at IS NULL AND u.held_at IS NULL`;

export function isEmployerVisibleStudent(
  student: Partial<EmployerVisibilityFields> | null | undefined,
): boolean {
  return Boolean(student) && !student?.deactivatedAt && !student?.heldAt;
}

/** Ids from `studentIds` that employers may currently see. */
export async function filterEmployerVisibleStudentIds(
  prisma: PrismaService,
  studentIds: readonly string[],
): Promise<Set<string>> {
  if (studentIds.length === 0) return new Set();
  const rows = await prisma.user.findMany({
    where: { id: { in: [...studentIds] }, deactivatedAt: null, heldAt: null },
    select: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}

export function studentUnavailableToEmployers(): NotFoundException {
  return new NotFoundException({
    error: 'not_found',
    message: 'This candidate is no longer available.',
    statusCode: 404,
  });
}
