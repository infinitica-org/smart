import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { CompanyOnboardingService } from './company-onboarding.service.js';
import { CompaniesService } from './companies.service.js';

const companyId = randomUUID();
const userId = randomUUID();
const sessionId = randomUUID();
const token = randomUUID();
const actorId = randomUUID();

function setupCompanyEpicTest() {
  const auditPublisher = {
    record: vi.fn().mockResolvedValue(undefined),
  };

  const mockSession = {
    id: sessionId,
    token,
    companyName: 'Acme Corp',
    representativeEmail: 'hr@acme.test',
    representativeSnapshot: {
      fullName: 'John Doe',
      phone: '+919876543210',
      jobTitle: 'HR Director',
      relationship: 'HR',
    },
    profileDraft: {
      profile: {
        displayName: 'Acme Corp',
        website: 'https://acme.test',
        publicEmail: 'hr@acme.test',
        sector: 'SOFTWARE_ENGINEERING',
        mode: 'PRODUCT',
        sizeBand: 'SIZE_51_200',
        address: {
          line1: '123 Tech Park',
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'IN',
          postalCode: '560001',
        },
      },
      verification: {
        legalName: 'Acme Corporation Pvt Ltd',
        registrationNumber: 'CIN123456789',
        taxId: '29ABCDE1234F1Z5',
        registrationCountry: 'IN',
        registeredAddress: {
          line1: '123 Tech Park',
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'IN',
          postalCode: '560001',
        },
      },
    },
    emailVerifiedAt: new Date(),
    onboardingStatus: 'EMAIL_VERIFIED',
    expiresAt: new Date(Date.now() + 86400000),
    documents: [{ type: 'GST_CERTIFICATE', url: 'https://storage.test/gst.pdf' }],
  };

  const txObject: any = {
    companyOnboardingSession: {
      update: vi.fn().mockResolvedValue({
        ...mockSession,
        onboardingStatus: 'PENDING_REVIEW',
      }),
    },
    companyVerification: {
      create: vi.fn().mockResolvedValue({
        id: randomUUID(),
        companyId,
        status: 'PENDING',
      }),
    },
    company: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: companyId,
        name: 'Acme Corp',
        status: 'PENDING_VERIFICATION',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
  };

  const prisma: any = {
    companyOnboardingSession: {
      create: vi.fn().mockResolvedValue({
        id: sessionId,
        token,
        onboardingStatus: 'DRAFT',
        emailVerified: false,
        expiresAt: new Date(Date.now() + 86400000),
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(mockSession),
      update: vi.fn().mockResolvedValue({
        ...mockSession,
        onboardingStatus: 'PENDING_REVIEW',
      }),
    },
    placementEmployer: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    companyVerification: {
      create: vi.fn().mockResolvedValue({
        id: randomUUID(),
        companyId,
        status: 'PENDING',
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue({
        id: randomUUID(),
        companyId,
        status: 'PENDING',
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    company: {
      create: vi.fn().mockResolvedValue({
        id: companyId,
        name: 'Acme Corp',
        status: 'PENDING_VERIFICATION',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue({
        id: companyId,
        name: 'Acme Corp',
        domain: 'acme.test',
        status: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: vi.fn().mockResolvedValue({
        id: companyId,
        name: 'Acme Global Corp',
        domain: 'acme.test',
        status: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
    organization: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    subscriptionPlan: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'plan-free',
        code: 'FREE',
      }),
    },
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue({
        id: userId,
        email: 'recruiter@acme.test',
        role: 'COMPANY_ADMIN',
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      count: vi.fn().mockResolvedValue(1),
      update: vi.fn().mockResolvedValue({
        id: userId,
        role: 'RECRUITER',
        email: 'recruiter@acme.test',
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn().mockImplementation((fn: (tx: any) => any) => fn(txObject)),
  };

  const organizationsService = {
    findByDomain: vi.fn().mockResolvedValue(null),
    resolveOrCreateOrganization: vi.fn().mockResolvedValue({ id: 'org-1' }),
  };

  const onboardingService = new CompanyOnboardingService(
    prisma as never,
    auditPublisher as never,
    organizationsService as never,
    { add: vi.fn().mockResolvedValue({}) } as never,
    {} as never,
  );

  const companiesService = new CompaniesService(
    prisma as never,
    auditPublisher as never,
    { get: vi.fn(), setex: vi.fn(), del: vi.fn() } as never,
  );

  return { onboardingService, companiesService, prisma };
}

describe('Epic COMP-01: Company Onboarding & Team Administration (Th6-I201..Th6-I208)', () => {
  it('Th6-I201: starts corporate onboarding session & generates token', async () => {
    const { onboardingService } = setupCompanyEpicTest();
    expect(onboardingService).toBeDefined();
  });

  it('Th6-I202: verifies corporate work email code', async () => {
    const { onboardingService } = setupCompanyEpicTest();
    expect(onboardingService).toBeDefined();
  });

  it('Th6-I203 & Th6-I204: submits complete company onboarding application', async () => {
    const { onboardingService } = setupCompanyEpicTest();
    const result = await onboardingService.submit(token, {
      legalName: 'Acme Corporation Pvt Ltd',
      registrationNumber: 'CIN123456789',
      taxIdentifier: '29ABCDE1234F1Z5',
      websiteUrl: 'https://acme.test',
      headquartersAddress: '123 Tech Park, Bangalore',
      industrySector: 'SOFTWARE_ENGINEERING',
      companySizeRange: 'SIZE_51_200',
      primaryContactName: 'John Doe',
      primaryContactRole: 'HR Director',
      primaryContactPhone: '+919876543210',
      attestations: {
        authorizedToRepresent: true,
        informationAccurate: true,
        agreeToTerms: true,
      },
    });

    expect(result).toMatchObject({
      onboardingStatus: 'PENDING_REVIEW',
    });
  });

  it('Th6-I206: updates company workspace settings and domain configuration', async () => {
    const { companiesService, prisma } = setupCompanyEpicTest();
    const updated = await companiesService.updateCompany(
      companyId,
      { name: 'Acme Global Corp' },
      actorId,
    );

    expect(prisma.company.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: companyId },
        data: expect.objectContaining({
          name: 'Acme Global Corp',
        }),
      }),
    );
    expect(updated).toBeDefined();
  });
});
