import { ConflictException, NotFoundException } from '@nestjs/common';
import type {
  CompanyVerificationReviewDetailDto,
  ResolveVerificationRequest,
  VerificationQueueItemDto,
} from '@smart/contracts';
import { CompanyAddressSchema, CompanyVerificationReviewDetailDtoSchema } from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';
import type { StorageService } from '../../platform/storage/storage.service.js';
import {
  provisionCompanyRepresentative,
  type CompanyActivationEmailPayload,
} from './company-account-provision.js';

export type ResolveCompanyVerificationResult = {
  queueItem: VerificationQueueItemDto;
  activationEmail: CompanyActivationEmailPayload | null;
};

type CompanyRow = {
  id: string;
  name: string;
  taxonomyDomain: string | null;
  website: string | null;
  verificationStatus: VerificationQueueItemDto['verificationStatus'];
  verificationReason: string | null;
  createdAt: Date;
};

export async function mapCompanyVerificationQueueItems(
  prisma: PrismaService,
  companies: CompanyRow[],
): Promise<VerificationQueueItemDto[]> {
  if (companies.length === 0) return [];

  const companyIds = companies.map((c) => c.id);
  const openVerifications = await prisma.companyVerification.findMany({
    where: { companyId: { in: companyIds }, reviewedAt: null },
    orderBy: { submittedAt: 'desc' },
    include: {
      _count: { select: { documents: true } },
      onboardingSession: {
        select: { onboardingStatus: true, representativeEmail: true },
      },
    },
  });

  const latestOpenByCompany = new Map<string, (typeof openVerifications)[number]>();
  for (const row of openVerifications) {
    if (!latestOpenByCompany.has(row.companyId)) {
      latestOpenByCompany.set(row.companyId, row);
    }
  }

  return companies.map((row) => {
    const verification = latestOpenByCompany.get(row.id);
    const base: VerificationQueueItemDto = {
      tenantType: 'company',
      tenantId: row.id,
      name: row.name,
      domain: row.taxonomyDomain,
      verificationStatus: row.verificationStatus,
      verificationReason: row.verificationReason,
      createdAt: row.createdAt.toISOString(),
    };
    if (!verification) return base;
    return {
      ...base,
      onboardingStatus: verification.onboardingSession?.onboardingStatus,
      submissionId: verification.id,
      representativeEmail: verification.onboardingSession?.representativeEmail,
      registrationCountry: verification.registrationCountry,
      documentCount: verification._count.documents,
      submittedAt: verification.submittedAt?.toISOString(),
    };
  });
}

export async function getCompanyVerificationReviewDetail(
  prisma: PrismaService,
  storage: StorageService,
  companyId: string,
): Promise<CompanyVerificationReviewDetailDto> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    throw new NotFoundException({
      error: 'not_found',
      message: 'Company not found.',
      statusCode: 404,
    });
  }

  const verification = await findOpenCompanyVerification(prisma, companyId);
  if (!verification) {
    throw new NotFoundException({
      error: 'not_found',
      message: 'No pending company verification submission found.',
      statusCode: 404,
    });
  }

  const session = verification.onboardingSessionId
    ? await prisma.companyOnboardingSession.findUnique({
        where: { id: verification.onboardingSessionId },
      })
    : await prisma.companyOnboardingSession.findFirst({
        where: { companyId },
        orderBy: { updatedAt: 'desc' },
      });

  const documents = await Promise.all(
    verification.documents.map(async (doc) => ({
      documentId: doc.id,
      documentType: doc.documentType,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSizeBytes: doc.fileSizeBytes,
      uploadedAt: doc.uploadedAt.toISOString(),
      reviewStatus: doc.reviewStatus,
      reviewReason: doc.reviewReason,
      downloadUrl: await storage.getSignedDownloadUrl(doc.storageKey),
    })),
  );

  const registeredAddress = CompanyAddressSchema.safeParse(verification.registeredAddress);

  return CompanyVerificationReviewDetailDtoSchema.parse({
    tenantType: 'company',
    tenantId: company.id,
    submissionId: verification.id,
    name: company.name,
    website: company.website,
    verificationStatus: company.verificationStatus,
    onboardingStatus: session?.onboardingStatus ?? null,
    representativeEmail: session?.representativeEmail,
    registrationCountry: verification.registrationCountry,
    legalName: verification.legalName,
    submittedAt: verification.submittedAt?.toISOString() ?? verification.createdAt.toISOString(),
    registeredAddress: registeredAddress.success ? registeredAddress.data : undefined,
    businessRegistrationNumber: verification.businessRegistrationNumber,
    taxId: verification.taxId,
    documents,
  });
}

export async function resolveCompanyVerification(
  prisma: PrismaService,
  companyId: string,
  body: ResolveVerificationRequest,
  actorId: string,
  audit: (params: {
    action: string;
    resourceType: string;
    resourceId: string;
    reason: string;
    metadata: Record<string, unknown>;
  }) => Promise<void>,
): Promise<ResolveCompanyVerificationResult> {
  const pro =
    body.decision === 'APPROVED'
      ? await prisma.subscriptionPlan.findUnique({ where: { code: 'PRO' } })
      : null;

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Company not found.',
        statusCode: 404,
      });
    }
    if (company.verificationStatus !== 'PENDING') {
      throw new ConflictException({
        error: 'conflict',
        message: 'This company verification is no longer pending review.',
        statusCode: 409,
      });
    }

    const verification = await findOpenCompanyVerification(tx, companyId);
    if (!verification) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'No pending company verification submission found.',
        statusCode: 404,
      });
    }
    if (body.submissionId && body.submissionId !== verification.id) {
      throw new ConflictException({
        error: 'conflict',
        message: 'This submission is no longer the active verification review target.',
        statusCode: 409,
      });
    }
    if (verification.reviewedAt) {
      throw new ConflictException({
        error: 'conflict',
        message: 'This verification submission has already been reviewed.',
        statusCode: 409,
      });
    }

    const now = new Date();
    const reviewedDocumentIds: string[] = [];
    if (body.documentReviews?.length) {
      for (const review of body.documentReviews) {
        const document = await tx.companyVerificationDocument.findFirst({
          where: {
            id: review.documentId,
            companyVerificationId: verification.id,
            companyId,
          },
        });
        if (!document) {
          throw new NotFoundException({
            error: 'not_found',
            message: 'One or more document reviews reference an unknown document.',
            statusCode: 404,
          });
        }
        await tx.companyVerificationDocument.update({
          where: { id: document.id },
          data: {
            reviewStatus: review.reviewStatus,
            reviewReason: review.reviewReason ?? null,
            reviewedAt: now,
            reviewedById: actorId,
          },
        });
        reviewedDocumentIds.push(document.id);
      }
    }

    await tx.companyVerification.update({
      where: { id: verification.id },
      data: {
        reviewedAt: now,
        reviewedById: actorId,
        reviewReason: body.reason,
      },
    });

    const updatedCompany = await tx.company.update({
      where: { id: companyId },
      data: {
        verificationStatus: body.decision,
        verificationReason: body.reason,
        ...(pro ? { planId: pro.id } : {}),
      },
    });

    const sessionUpdate =
      body.decision === 'APPROVED'
        ? { onboardingStatus: 'ACCOUNT_ACTIVE' as const }
        : { onboardingStatus: 'RESUBMISSION_ALLOWED' as const };

    if (verification.onboardingSessionId) {
      await tx.companyOnboardingSession.updateMany({
        where: { id: verification.onboardingSessionId, companyId },
        data: sessionUpdate,
      });
    } else {
      await tx.companyOnboardingSession.updateMany({
        where: { companyId, onboardingStatus: 'PENDING_REVIEW' },
        data: sessionUpdate,
      });
    }

    let provisioning: Awaited<ReturnType<typeof provisionCompanyRepresentative>> | null = null;
    if (body.decision === 'APPROVED') {
      provisioning = await provisionCompanyRepresentative(tx, {
        companyId,
        companyName: updatedCompany.name,
        invitedById: actorId,
        onboardingSessionId: verification.onboardingSessionId,
      });
    }

    return {
      updatedCompany,
      verificationId: verification.id,
      reviewedDocumentIds,
      provisioning,
    };
  });

  for (const documentId of result.reviewedDocumentIds) {
    await audit({
      action: 'company.verification_document.reviewed',
      resourceType: 'company_verification_document',
      resourceId: documentId,
      reason: 'reviewed',
      metadata: {
        companyId,
        verificationId: result.verificationId,
        documentId,
        reviewerId: actorId,
      },
    });
  }

  const auditAction =
    body.decision === 'APPROVED'
      ? 'company.verification.approved'
      : 'company.verification.rejected';

  await audit({
    action: auditAction,
    resourceType: 'company',
    resourceId: companyId,
    reason: body.reason,
    metadata: {
      companyId,
      decision: body.decision,
      verificationId: result.verificationId,
      submissionId: body.submissionId ?? result.verificationId,
      reviewerId: actorId,
      internalNotes: body.internalNotes ?? null,
    },
  });

  if (result.provisioning) {
    await audit({
      action: 'company.account.provisioned',
      resourceType: 'user',
      resourceId: result.provisioning.userId,
      reason: 'approved',
      metadata: {
        companyId,
        userId: result.provisioning.userId,
        verificationId: result.verificationId,
        activationEmailQueued: Boolean(result.provisioning.activationEmail),
      },
    });
  }

  const queueItem: VerificationQueueItemDto = {
    tenantType: 'company',
    tenantId: result.updatedCompany.id,
    name: result.updatedCompany.name,
    domain: result.updatedCompany.taxonomyDomain,
    verificationStatus: result.updatedCompany.verificationStatus,
    verificationReason: result.updatedCompany.verificationReason,
    createdAt: result.updatedCompany.createdAt.toISOString(),
  };

  return {
    queueItem,
    activationEmail: result.provisioning?.activationEmail ?? null,
  };
}

async function findOpenCompanyVerification(
  prisma: PrismaService | Prisma.TransactionClient,
  companyId: string,
) {
  return prisma.companyVerification.findFirst({
    where: { companyId, reviewedAt: null },
    orderBy: { submittedAt: 'desc' },
    include: { documents: true },
  });
}
