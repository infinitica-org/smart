import { GoneException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/index.js';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';
import { hashOnboardingSecret } from './company-onboarding.util.js';

export type OnboardingSessionRow = Prisma.CompanyOnboardingSessionGetPayload<{
  include: { company: true };
}>;

export async function requireOnboardingSessionByToken(
  prisma: PrismaService,
  rawToken: string,
): Promise<OnboardingSessionRow> {
  const hash = hashOnboardingSecret(rawToken);
  const session = await prisma.companyOnboardingSession.findUnique({
    where: { sessionTokenHash: hash },
    include: { company: true },
  });
  if (!session) {
    throw new NotFoundException({
      error: 'not_found',
      message: 'Onboarding session not found.',
      statusCode: 404,
    });
  }
  if (session.expiresAt.getTime() < Date.now()) {
    throw new GoneException({
      error: 'expired',
      message: 'Onboarding session has expired.',
      statusCode: 410,
    });
  }
  return session;
}

/** Latest verification row created for this onboarding session (resubmission-safe). */
export async function resolveCurrentSessionVerification(
  prisma: PrismaService,
  session: OnboardingSessionRow,
) {
  if (!session.companyId) {
    return null;
  }
  return prisma.companyVerification.findFirst({
    where: {
      companyId: session.companyId,
      onboardingSessionId: session.id,
    },
    orderBy: { submittedAt: 'desc' },
  });
}
