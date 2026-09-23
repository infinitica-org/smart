import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/index.js';
import { z } from 'zod';
import { generateInviteToken, invitationExpiresAt } from '../invitations/invite-token.util.js';

const DB_USER_ROLE = {
  COMPANY: 'COMPANY',
} as const;

type PrismaUserRole =
  'SUPER_ADMIN' | 'INSTITUTION_ADMIN' | 'PLACEMENT_STAFF' | 'STUDENT' | 'B2B_PARTNER' | 'COMPANY';

export type CompanyActivationEmailPayload = {
  invitationId: string;
  userId: string;
  email: string;
  fullName: string;
  companyName: string;
  rawToken: string;
};

export type ProvisionCompanyRepresentativeResult = {
  userId: string;
  activationEmail: CompanyActivationEmailPayload | null;
};

/**
 * Provisions (or reuses) the COMPANY representative after SA approval.
 * Must run inside the same transaction as company approval.
 * Email is returned for outbox enqueue after commit.
 */
export async function provisionCompanyRepresentative(
  tx: Prisma.TransactionClient,
  params: {
    companyId: string;
    companyName: string;
    invitedById: string;
    onboardingSessionId: string | null;
  },
): Promise<ProvisionCompanyRepresentativeResult> {
  const session = await resolveOnboardingSession(tx, params.companyId, params.onboardingSessionId);
  if (!session) {
    throw new NotFoundException({
      error: 'not_found',
      message: 'Company onboarding session not found for account provisioning.',
      statusCode: 404,
    });
  }

  const email = session.representativeEmail.toLowerCase();
  const fullName = resolveRepresentativeFullName(session.representativeSnapshot, email);

  const userId = await resolveOrCreateCompanyUser(tx, {
    email,
    fullName,
    companyId: params.companyId,
    invitedById: params.invitedById,
  });

  await tx.companyOnboardingSession.updateMany({
    where: { id: session.id, companyId: params.companyId },
    data: { userId },
  });

  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (user.passwordHash) {
    return { userId, activationEmail: null };
  }

  const activationEmail = await mintPendingCompanyInvitation(tx, {
    userId,
    email,
    fullName,
    companyName: params.companyName,
    invitedById: params.invitedById,
  });

  return { userId, activationEmail };
}

async function resolveOnboardingSession(
  tx: Prisma.TransactionClient,
  companyId: string,
  onboardingSessionId: string | null,
) {
  if (onboardingSessionId) {
    return tx.companyOnboardingSession.findFirst({
      where: { id: onboardingSessionId, companyId },
    });
  }
  return tx.companyOnboardingSession.findFirst({
    where: { companyId },
    orderBy: { updatedAt: 'desc' },
  });
}

const RepresentativeSnapshotNameSchema = z.object({
  fullName: z.string().trim().min(2).max(200).optional(),
});

function resolveRepresentativeFullName(representativeSnapshot: unknown, email: string): string {
  const parsed = RepresentativeSnapshotNameSchema.safeParse(representativeSnapshot);
  if (parsed.success && parsed.data.fullName) {
    return parsed.data.fullName;
  }
  const local = email.split('@')[0] ?? 'Company Representative';
  return local.replace(/[._-]+/g, ' ').trim() || 'Company Representative';
}

async function resolveOrCreateCompanyUser(
  tx: Prisma.TransactionClient,
  params: {
    email: string;
    fullName: string;
    companyId: string;
    invitedById: string;
  },
): Promise<string> {
  const existing = await tx.user.findUnique({ where: { email: params.email } });
  if (!existing) {
    const created = await tx.user.create({
      data: {
        email: params.email,
        fullName: params.fullName,
        role: DB_USER_ROLE.COMPANY as PrismaUserRole,
        companyId: params.companyId,
        institutionId: null,
        emailVerified: true,
        passwordHash: null,
        onboardingCompleted: true,
      },
    });
    return created.id;
  }

  if (existing.role === DB_USER_ROLE.COMPANY) {
    if (existing.companyId === params.companyId) {
      return existing.id;
    }
    throw new ConflictException({
      error: 'conflict',
      message:
        'The representative email is already linked to another company account and cannot be reassigned automatically.',
      statusCode: 409,
    });
  }

  throw new ConflictException({
    error: 'conflict',
    message:
      'The representative email is already registered with a different SMART account type. Use another email or resolve the account conflict manually.',
    statusCode: 409,
  });
}

async function mintPendingCompanyInvitation(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    email: string;
    fullName: string;
    companyName: string;
    invitedById: string;
  },
): Promise<CompanyActivationEmailPayload> {
  const pending = await tx.invitation.findFirst({
    where: { userId: params.userId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });

  const { raw, hash } = generateInviteToken();
  const expiresAt = invitationExpiresAt();

  if (pending) {
    await tx.invitation.update({
      where: { id: pending.id },
      data: { tokenHash: hash, expiresAt, lastSentAt: new Date() },
    });
    return {
      invitationId: pending.id,
      userId: params.userId,
      email: params.email,
      fullName: params.fullName,
      companyName: params.companyName,
      rawToken: raw,
    };
  }

  const invitation = await tx.invitation.create({
    data: {
      email: params.email,
      fullName: params.fullName,
      role: DB_USER_ROLE.COMPANY as PrismaUserRole,
      institutionId: null,
      userId: params.userId,
      tokenHash: hash,
      status: 'PENDING',
      expiresAt,
      invitedById: params.invitedById,
    },
  });

  return {
    invitationId: invitation.id,
    userId: params.userId,
    email: params.email,
    fullName: params.fullName,
    companyName: params.companyName,
    rawToken: raw,
  };
}
