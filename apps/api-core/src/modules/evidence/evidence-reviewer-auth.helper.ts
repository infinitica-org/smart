import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';

const REVIEWER_MUTATION_ROLES = new Set(['INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'SUPER_ADMIN']);

/**
 * Institution-scoped reviewer authorization for evidence mutation (VER-01).
 * COMPANY / B2B_PARTNER may read provenance but cannot mutate evidence.
 */
export async function assertReviewerCanMutateCandidateEvidence(
  prisma: PrismaService,
  caller: RequestUser,
  studentId: string,
): Promise<void> {
  if (!REVIEWER_MUTATION_ROLES.has(caller.role)) {
    throw new ForbiddenException({
      error: 'forbidden',
      message: 'Unauthorized role to review candidate evidence.',
      statusCode: 403,
    });
  }

  const candidate = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, role: true, institutionId: true },
  });

  if (!candidate || candidate.role !== 'STUDENT') {
    throw new NotFoundException({
      error: 'not_found',
      message: 'Candidate not found.',
      statusCode: 404,
    });
  }

  if (caller.role === 'SUPER_ADMIN') {
    return;
  }

  if (!caller.inst || caller.inst !== candidate.institutionId) {
    throw new ForbiddenException({
      error: 'forbidden',
      message: 'You do not have access to review candidate evidence outside your institution.',
      statusCode: 403,
    });
  }
}
