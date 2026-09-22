import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mapCompanyVerificationQueueItems,
  resolveCompanyVerification,
} from './company-verification-review.js';

const COMPANY_ID = '33333333-3333-4333-8333-333333333333';
const VERIFICATION_ID = '44444444-4444-4444-8444-444444444444';
const DOCUMENT_ID = '55555555-5555-4555-8555-555555555555';
const ACTOR_ID = '66666666-6666-4666-8666-666666666666';

describe('company verification review', () => {
  let prisma: any;
  let audit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    audit = vi.fn().mockResolvedValue(undefined);
    prisma = {
      subscriptionPlan: { findUnique: vi.fn().mockResolvedValue({ id: 'plan-pro', code: 'PRO' }) },
      companyVerification: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      company: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      companyVerificationDocument: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      companyOnboardingSession: {
        findFirst: vi.fn().mockResolvedValue({
          id: '22222222-2222-4222-8222-222222222222',
          representativeEmail: 'hr@acme.example',
          representativeSnapshot: { fullName: 'Jane Rep' },
        }),
        updateMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: '77777777-7777-4777-8777-777777777777' }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ passwordHash: null }),
      },
      invitation: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'inv-1' }),
      },
      $transaction: vi.fn(async (fn: (tx: any) => Promise<unknown>) => fn(prisma)),
    };
  });

  describe('mapCompanyVerificationQueueItems', () => {
    it('enriches company queue rows with open submission metadata', async () => {
      prisma.companyVerification.findMany.mockResolvedValue([
        {
          id: VERIFICATION_ID,
          companyId: COMPANY_ID,
          registrationCountry: 'IN',
          submittedAt: new Date('2026-09-21T11:00:00.000Z'),
          onboardingSession: {
            onboardingStatus: 'PENDING_REVIEW',
            representativeEmail: 'hr@acme.example',
          },
          _count: { documents: 2 },
        },
      ]);

      const rows = await mapCompanyVerificationQueueItems(prisma, [
        {
          id: COMPANY_ID,
          name: 'Acme',
          taxonomyDomain: 'Software',
          website: 'https://acme.example',
          verificationStatus: 'PENDING',
          verificationReason: null,
          createdAt: new Date('2026-09-21T10:00:00.000Z'),
        },
      ]);

      expect(rows[0]?.submissionId).toBe(VERIFICATION_ID);
      expect(rows[0]?.documentCount).toBe(2);
      expect(rows[0]?.representativeEmail).toBe('hr@acme.example');
    });
  });

  describe('resolveCompanyVerification', () => {
    beforeEach(() => {
      prisma.company.findUnique.mockResolvedValue({
        id: COMPANY_ID,
        name: 'Acme',
        taxonomyDomain: 'Software',
        verificationStatus: 'PENDING',
        verificationReason: null,
        createdAt: new Date('2026-09-21T10:00:00.000Z'),
      });
      prisma.companyVerification.findFirst.mockResolvedValue({
        id: VERIFICATION_ID,
        companyId: COMPANY_ID,
        onboardingSessionId: '22222222-2222-4222-8222-222222222222',
        reviewedAt: null,
        documents: [],
      });
      prisma.company.update.mockResolvedValue({
        id: COMPANY_ID,
        name: 'Acme',
        taxonomyDomain: 'Software',
        verificationStatus: 'APPROVED',
        verificationReason: 'Verified manually.',
        createdAt: new Date('2026-09-21T10:00:00.000Z'),
      });
    });

    it('approves company and updates verification review fields in one transaction', async () => {
      const result = await resolveCompanyVerification(
        prisma,
        COMPANY_ID,
        {
          tenantType: 'company',
          decision: 'APPROVED',
          reason: 'Verified manually.',
          submissionId: VERIFICATION_ID,
        },
        ACTOR_ID,
        audit,
      );

      expect(result.queueItem.verificationStatus).toBe('APPROVED');
      expect(result.activationEmail?.email).toBe('hr@acme.example');
      expect(prisma.companyVerification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: VERIFICATION_ID },
          data: expect.objectContaining({ reviewedById: ACTOR_ID }),
        }),
      );
      expect(prisma.companyOnboardingSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { onboardingStatus: 'ACCOUNT_ACTIVE' },
        }),
      );
      expect(audit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'company.verification.approved' }),
      );
      expect(audit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'company.account.provisioned',
          resourceType: 'user',
          metadata: expect.objectContaining({
            companyId: COMPANY_ID,
            verificationId: VERIFICATION_ID,
            activationEmailQueued: true,
          }),
        }),
      );
    });

    it('rejects stale submissionId targets', async () => {
      await expect(
        resolveCompanyVerification(
          prisma,
          COMPANY_ID,
          {
            tenantType: 'company',
            decision: 'APPROVED',
            reason: 'Verified manually.',
            submissionId: '77777777-7777-4777-8777-777777777777',
          },
          ACTOR_ID,
          audit,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects document reviews outside the open verification', async () => {
      prisma.companyVerificationDocument.findFirst.mockResolvedValue(null);
      await expect(
        resolveCompanyVerification(
          prisma,
          COMPANY_ID,
          {
            tenantType: 'company',
            decision: 'REJECTED',
            reason: 'Document mismatch found.',
            documentReviews: [{ documentId: DOCUMENT_ID, reviewStatus: 'REJECTED' }],
          },
          ACTOR_ID,
          audit,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('sets resubmission session state on rejection', async () => {
      prisma.company.update.mockResolvedValue({
        id: COMPANY_ID,
        name: 'Acme',
        taxonomyDomain: 'Software',
        verificationStatus: 'REJECTED',
        verificationReason: 'Need clearer tax doc.',
        createdAt: new Date('2026-09-21T10:00:00.000Z'),
      });

      await resolveCompanyVerification(
        prisma,
        COMPANY_ID,
        {
          tenantType: 'company',
          decision: 'REJECTED',
          reason: 'Need clearer tax doc.',
        },
        ACTOR_ID,
        audit,
      );

      expect(prisma.companyOnboardingSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { onboardingStatus: 'RESUBMISSION_ALLOWED' },
        }),
      );
      expect(audit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'company.verification.rejected' }),
      );
    });
  });
});
