import {
  BadRequestException,
  ConflictException,
  GoneException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompanySignupProfile, CompanyVerification } from '@smart/contracts';
import { hashOnboardingSecret } from './company-onboarding.util.js';
import { CompanyOnboardingService } from './company-onboarding.service.js';

const freePlan = { id: '11111111-1111-4111-8111-111111111111', code: 'FREE' };
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const COMPANY_ID = '33333333-3333-4333-8333-333333333333';

function fullProfile(): CompanySignupProfile {
  return {
    displayName: 'Acme Labs',
    legalName: 'Acme Labs Pvt Ltd',
    website: 'https://acme.example.com',
    sector: 'Software',
    mode: 'PRODUCT',
    sizeBand: '51-200',
    publicEmail: 'hello@acme.example.com',
    address: {
      line1: '1 Main St',
      city: 'Bengaluru',
      stateProvince: 'KA',
      country: 'IN',
      postalCode: '560001',
    },
  };
}

function fullVerification(): CompanyVerification {
  return {
    registrationCountry: 'IN',
    legalName: 'Acme Labs Pvt Ltd',
    registeredAddress: {
      line1: '1 Main St',
      city: 'Bengaluru',
      stateProvince: 'KA',
      country: 'IN',
    },
    businessRegistrationNumber: 'U12345',
    taxId: '29ABCDE1234F1Z5',
    registrationAuthority: 'ROC',
  };
}

function futureDate(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}

describe('CompanyOnboardingService', () => {
  let service: CompanyOnboardingService;
  let prisma: any;
  let audit: any;
  let organizations: any;
  let emailQueue: any;

  beforeEach(() => {
    prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      company: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
      },
      organization: { findFirst: vi.fn().mockResolvedValue(null) },
      placementEmployer: { findFirst: vi.fn().mockResolvedValue(null) },
      subscriptionPlan: { findUnique: vi.fn().mockResolvedValue(freePlan) },
      companyOnboardingSession: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      companyVerification: { create: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) },
      companyVerificationDocument: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      $transaction: vi.fn(async (fn: (tx: any) => Promise<unknown>) => fn(prisma)),
    };
    audit = { record: vi.fn().mockResolvedValue(undefined) };
    organizations = {
      resolveOrCreateOrganization: vi.fn().mockResolvedValue({ id: 'org-1' }),
    };
    emailQueue = { add: vi.fn().mockResolvedValue(undefined) };
    const documents = {
      listDocumentsForSession: vi.fn().mockResolvedValue([]),
    };
    service = new CompanyOnboardingService(prisma, audit, organizations, emailQueue, documents);
  });

  describe('startSession', () => {
    it('creates session with hashed token only and EMAIL_VERIFICATION_PENDING', async () => {
      prisma.companyOnboardingSession.create.mockImplementation(async ({ data }: any) => ({
        id: SESSION_ID,
        ...data,
      }));

      const result = await service.startSession({
        representative: { fullName: 'Jane Doe', workEmail: 'Jane@Acme.Example.com' },
        website: 'https://acme.example.com',
      });

      expect(result.sessionToken.length).toBeGreaterThan(31);
      expect(result.onboardingStatus).toBe('EMAIL_VERIFICATION_PENDING');
      const createArg = prisma.companyOnboardingSession.create.mock.calls[0][0].data;
      expect(createArg.sessionTokenHash).toBe(hashOnboardingSecret(result.sessionToken));
      expect(createArg.sessionTokenHash).not.toBe(result.sessionToken);
      expect(createArg.representativeEmail).toBe('jane@acme.example.com');
      expect(createArg.expiresAt).toBeInstanceOf(Date);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'company.onboarding.started' }),
      );
    });

    it('rejects when a platform user already owns the email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      await expect(
        service.startSession({
          representative: { fullName: 'Jane', workEmail: 'jane@acme.com' },
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('getSession', () => {
    it('returns session state for valid token', async () => {
      const raw = 'a'.repeat(43);
      prisma.companyOnboardingSession.findUnique.mockResolvedValue({
        id: SESSION_ID,
        sessionTokenHash: hashOnboardingSecret(raw),
        expiresAt: futureDate(),
        onboardingStatus: 'EMAIL_VERIFIED',
        companyId: null,
        company: null,
        representativeEmail: 'jane@acme.com',
        representativeSnapshot: { fullName: 'Jane', workEmail: 'jane@acme.com' },
        profileDraft: { profile: { displayName: 'Acme' } },
        updatedAt: new Date('2026-09-21T10:00:00.000Z'),
      });

      const dto = await service.getSession(raw);
      expect(dto.sessionId).toBe(SESSION_ID);
      expect(dto.profile.displayName).toBe('Acme');
    });

    it('rejects unknown token', async () => {
      prisma.companyOnboardingSession.findUnique.mockResolvedValue(null);
      await expect(service.getSession('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects expired token', async () => {
      const raw = 'b'.repeat(43);
      prisma.companyOnboardingSession.findUnique.mockResolvedValue({
        id: SESSION_ID,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.getSession(raw)).rejects.toBeInstanceOf(GoneException);
    });

    it('prevents session B token from reading session A row', async () => {
      const tokenA = 'c'.repeat(43);
      const tokenB = 'd'.repeat(43);
      prisma.companyOnboardingSession.findUnique.mockImplementation(({ where }: any) => {
        if (where.sessionTokenHash === hashOnboardingSecret(tokenA)) {
          return Promise.resolve({
            id: '44444444-4444-4444-8444-444444444444',
            expiresAt: futureDate(),
            onboardingStatus: 'EMAIL_VERIFIED',
            companyId: null,
            company: null,
            representativeEmail: 'a@acme.com',
            representativeSnapshot: {},
            profileDraft: {},
            updatedAt: new Date(),
          });
        }
        return Promise.resolve(null);
      });

      await service.getSession(tokenA);
      await expect(service.getSession(tokenB)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateDraft', () => {
    it('merges draft fields without changing onboarding status', async () => {
      const raw = 'e'.repeat(43);
      prisma.companyOnboardingSession.findUnique.mockResolvedValue({
        id: SESSION_ID,
        sessionTokenHash: hashOnboardingSecret(raw),
        expiresAt: futureDate(),
        onboardingStatus: 'EMAIL_VERIFIED',
        companyId: null,
        company: null,
        representativeEmail: 'jane@acme.com',
        representativeSnapshot: { fullName: 'Jane', workEmail: 'jane@acme.com' },
        profileDraft: {},
        updatedAt: new Date('2026-09-21T10:00:00.000Z'),
      });
      prisma.companyOnboardingSession.update.mockImplementation(async ({ data }: any) => ({
        id: SESSION_ID,
        sessionTokenHash: hashOnboardingSecret(raw),
        expiresAt: futureDate(),
        onboardingStatus: 'EMAIL_VERIFIED',
        companyId: null,
        company: null,
        representativeEmail: 'jane@acme.com',
        representativeSnapshot: data.representativeSnapshot,
        profileDraft: data.profileDraft,
        updatedAt: new Date('2026-09-21T10:05:00.000Z'),
      }));

      const dto = await service.updateDraft(raw, {
        profile: { displayName: 'Acme Labs' },
        representative: { phone: '+911234567890', jobTitle: 'HR', relationship: 'HR' },
      });
      expect(dto.profile.displayName).toBe('Acme Labs');
      expect(dto.representative.phone).toBe('+911234567890');
      expect(dto.onboardingStatus).toBe('EMAIL_VERIFIED');
    });

    it('blocks edits after submission', async () => {
      const raw = 'f'.repeat(43);
      prisma.companyOnboardingSession.findUnique.mockResolvedValue({
        id: SESSION_ID,
        sessionTokenHash: hashOnboardingSecret(raw),
        expiresAt: futureDate(),
        onboardingStatus: 'PENDING_REVIEW',
        companyId: COMPANY_ID,
        company: { verificationStatus: 'PENDING' },
        representativeEmail: 'jane@acme.com',
        representativeSnapshot: {},
        profileDraft: {},
        updatedAt: new Date(),
      });
      await expect(
        service.updateDraft(raw, { profile: { displayName: 'Nope' } }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('email verification', () => {
    const raw = 'g'.repeat(43);
    const baseSession = {
      id: 'sess-1',
      sessionTokenHash: hashOnboardingSecret(raw),
      expiresAt: futureDate(),
      onboardingStatus: 'EMAIL_VERIFICATION_PENDING',
      companyId: null,
      company: null,
      representativeEmail: 'jane@acme.com',
      representativeSnapshot: { fullName: 'Jane' },
      profileDraft: {},
      updatedAt: new Date(),
      emailVerifiedAt: null,
      lastEmailSentAt: null,
    };

    it('stores hashed code and enqueues email', async () => {
      prisma.companyOnboardingSession.findUnique.mockResolvedValue(baseSession);
      prisma.companyOnboardingSession.update.mockResolvedValue(undefined);

      const result = await service.sendEmailVerification(raw);
      expect(result.expiresAt).toBeDefined();
      const updateData = prisma.companyOnboardingSession.update.mock.calls[0][0].data;
      expect(updateData.emailVerificationCodeHash).toMatch(/^[a-f0-9]{64}$/);
      expect(emailQueue.add).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'company.email.verification_sent' }),
      );
    });

    it('enforces resend cooldown', async () => {
      prisma.companyOnboardingSession.findUnique.mockResolvedValue({
        ...baseSession,
        lastEmailSentAt: new Date(),
      });
      await expect(service.sendEmailVerification(raw)).rejects.toBeInstanceOf(ConflictException);
    });

    it('verifies email and clears code hash', async () => {
      const code = '123456';
      prisma.companyOnboardingSession.findUnique.mockResolvedValue({
        ...baseSession,
        emailVerificationCodeHash: hashOnboardingSecret(code),
        emailVerificationExpiresAt: futureDate(),
      });
      prisma.companyOnboardingSession.update.mockResolvedValue({
        onboardingStatus: 'EMAIL_VERIFIED',
      });

      const result = await service.verifyEmail(raw, { code });
      expect(result.emailVerified).toBe(true);
      expect(result.onboardingStatus).toBe('EMAIL_VERIFIED');
      expect(
        prisma.companyOnboardingSession.update.mock.calls[0][0].data.emailVerificationCodeHash,
      ).toBeNull();
    });

    it('rejects invalid and expired codes', async () => {
      prisma.companyOnboardingSession.findUnique.mockResolvedValue({
        ...baseSession,
        emailVerificationCodeHash: hashOnboardingSecret('111111'),
        emailVerificationExpiresAt: futureDate(),
      });
      await expect(service.verifyEmail(raw, { code: '999999' })).rejects.toBeInstanceOf(
        BadRequestException,
      );

      prisma.companyOnboardingSession.findUnique.mockResolvedValue({
        ...baseSession,
        emailVerificationCodeHash: hashOnboardingSecret('111111'),
        emailVerificationExpiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.verifyEmail(raw, { code: '111111' })).rejects.toBeInstanceOf(
        GoneException,
      );
    });
  });

  describe('submit', () => {
    const raw = 'h'.repeat(43);
    const verifiedSession = {
      id: 'sess-1',
      sessionTokenHash: hashOnboardingSecret(raw),
      expiresAt: futureDate(),
      onboardingStatus: 'EMAIL_VERIFIED',
      companyId: null,
      company: null,
      representativeEmail: 'jane@acme.com',
      representativeSnapshot: {
        fullName: 'Jane Doe',
        workEmail: 'jane@acme.com',
        phone: '+911234567890',
        jobTitle: 'HR Lead',
        relationship: 'HR',
      },
      profileDraft: { profile: fullProfile(), verification: fullVerification() },
      updatedAt: new Date(),
      emailVerifiedAt: new Date(),
    };

    it('creates company, verification, and links session in one transaction', async () => {
      prisma.companyOnboardingSession.findUnique.mockResolvedValue(verifiedSession);
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.company.create.mockResolvedValue({ id: COMPANY_ID });
      prisma.companyVerification.create.mockResolvedValue({
        id: '55555555-5555-4555-8555-555555555555',
      });
      prisma.companyOnboardingSession.update.mockResolvedValue(undefined);

      const result = await service.submit(raw, {
        attestations: { authorizedToRepresent: true, informationAccurate: true },
      });

      expect(result.companyId).toBe(COMPANY_ID);
      expect(result.verificationStatus).toBe('PENDING');
      expect(result.onboardingStatus).toBe('PENDING_REVIEW');
      expect(prisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ verificationStatus: 'PENDING' }),
        }),
      );
      expect(prisma.companyVerification.create).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'company.onboarding.submitted' }),
      );
    });

    it('requires email verification and full draft', async () => {
      prisma.companyOnboardingSession.findUnique.mockResolvedValue({
        ...verifiedSession,
        emailVerifiedAt: null,
      });
      await expect(
        service.submit(raw, {
          attestations: { authorizedToRepresent: true, informationAccurate: true },
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      prisma.companyOnboardingSession.findUnique.mockResolvedValue({
        ...verifiedSession,
        profileDraft: {},
      });
      await expect(
        service.submit(raw, {
          attestations: { authorizedToRepresent: true, informationAccurate: true },
        }),
      ).rejects.toThrow();
    });

    it('tells the user to add verification details instead of a generic validation failure', async () => {
      prisma.companyOnboardingSession.findUnique.mockResolvedValue({
        ...verifiedSession,
        profileDraft: { profile: fullProfile() },
      });

      const error = await service
        .submit(raw, { attestations: { authorizedToRepresent: true, informationAccurate: true } })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      const body = (error as UnprocessableEntityException).getResponse() as {
        message: string;
        details: { path: string; message: string }[];
      };
      expect(body.message).toBe(
        'Add your verification details (registered address and business registration information) before submitting.',
      );
      expect(body.details.map((d) => d.path)).toContain('verification.registeredAddress');
      expect(prisma.company.create).not.toHaveBeenCalled();
      expect(prisma.companyVerification.create).not.toHaveBeenCalled();
    });

    it('names the incomplete sections when the saved draft is incomplete', async () => {
      prisma.companyOnboardingSession.findUnique.mockResolvedValue({
        ...verifiedSession,
        profileDraft: { verification: fullVerification() },
      });

      const error = await service
        .submit(raw, { attestations: { authorizedToRepresent: true, informationAccurate: true } })
        .catch((e: unknown) => e);

      const body = (error as UnprocessableEntityException).getResponse() as { message: string };
      expect(body.message).toBe('Complete your company profile before submitting.');
      expect(prisma.company.create).not.toHaveBeenCalled();
    });

    it('rolls back when verification insert fails', async () => {
      prisma.companyOnboardingSession.findUnique.mockResolvedValue(verifiedSession);
      prisma.company.create.mockResolvedValue({ id: COMPANY_ID });
      prisma.companyVerification.create.mockRejectedValue(new Error('db fail'));
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
        try {
          return await fn(prisma);
        } catch {
          throw new Error('tx aborted');
        }
      });

      await expect(
        service.submit(raw, {
          attestations: { authorizedToRepresent: true, informationAccurate: true },
        }),
      ).rejects.toThrow('tx aborted');
      expect(prisma.companyOnboardingSession.update).not.toHaveBeenCalled();
    });

    it('creates a new verification row on resubmission without approving company', async () => {
      prisma.companyOnboardingSession.findUnique.mockResolvedValue({
        ...verifiedSession,
        onboardingStatus: 'RESUBMISSION_ALLOWED',
        companyId: COMPANY_ID,
        company: { verificationStatus: 'REJECTED' },
      });
      prisma.company.update.mockResolvedValue(undefined);
      prisma.companyVerification.create.mockResolvedValue({ id: 'ver-2' });
      prisma.companyOnboardingSession.update.mockResolvedValue(undefined);

      const result = await service.submit(raw, {
        attestations: { authorizedToRepresent: true, informationAccurate: true },
      });

      expect(result.companyId).toBe(COMPANY_ID);
      expect(prisma.company.create).not.toHaveBeenCalled();
      expect(prisma.company.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ verificationStatus: 'PENDING' }),
        }),
      );
      expect(prisma.companyVerification.create).toHaveBeenCalled();
    });

    it('carries re-uploaded and approved documents forward to the resubmission', async () => {
      prisma.companyOnboardingSession.findUnique.mockResolvedValue({
        ...verifiedSession,
        onboardingStatus: 'RESUBMISSION_ALLOWED',
        companyId: COMPANY_ID,
        company: { verificationStatus: 'REJECTED' },
      });
      prisma.companyVerification.findFirst.mockResolvedValue({ id: 'ver-1' });
      prisma.company.update.mockResolvedValue(undefined);
      prisma.companyVerification.create.mockResolvedValue({ id: 'ver-2' });
      prisma.companyOnboardingSession.update.mockResolvedValue(undefined);

      await service.submit(raw, {
        attestations: { authorizedToRepresent: true, informationAccurate: true },
      });

      expect(prisma.companyVerificationDocument.updateMany).toHaveBeenCalledWith({
        where: { companyVerificationId: 'ver-1', reviewStatus: { not: 'REJECTED' } },
        data: { companyVerificationId: 'ver-2' },
      });
    });

    it('does not move documents on a first submission', async () => {
      prisma.companyOnboardingSession.findUnique.mockResolvedValue(verifiedSession);
      prisma.company.create.mockResolvedValue({ id: COMPANY_ID });
      prisma.companyVerification.create.mockResolvedValue({ id: 'ver-1' });
      prisma.companyOnboardingSession.update.mockResolvedValue(undefined);

      await service.submit(raw, {
        attestations: { authorizedToRepresent: true, informationAccurate: true },
      });

      expect(prisma.companyVerificationDocument.updateMany).not.toHaveBeenCalled();
    });
  });
});
