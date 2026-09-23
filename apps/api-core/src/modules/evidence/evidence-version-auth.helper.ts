import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';

export interface EvidenceVersionReadAccess {
  redacted: boolean;
}

/**
 * Placement/staff read authorization for candidate evidence versions (VER-01).
 * COMPANY / B2B_PARTNER receive redacted snapshots (no sourcePayload / verifier contact).
 */
export async function assertCanReadCandidateEvidenceVersions(
  prisma: PrismaService,
  caller: RequestUser,
  studentId: string,
): Promise<EvidenceVersionReadAccess> {
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
    return { redacted: false };
  }

  if (caller.role === 'INSTITUTION_ADMIN' || caller.role === 'PLACEMENT_STAFF') {
    if (!caller.inst || caller.inst !== candidate.institutionId) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You do not have access to candidate evidence outside your institution.',
        statusCode: 403,
      });
    }
    return { redacted: false };
  }

  if (caller.role === 'COMPANY' || caller.role === 'B2B_PARTNER') {
    const companyId = (caller as RequestUser & { companyId?: string | null }).companyId;
    if (!companyId) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Company account is not associated with a registered company.',
        statusCode: 403,
      });
    }

    const applicationCount = await prisma.application.count({
      where: {
        studentId,
        opening: { companyId },
      },
    });

    if (applicationCount === 0) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You do not have access to this candidate evidence.',
        statusCode: 403,
      });
    }

    return { redacted: true };
  }

  throw new ForbiddenException({
    error: 'forbidden',
    message: 'Unauthorized role to view candidate evidence versions.',
    statusCode: 403,
  });
}
