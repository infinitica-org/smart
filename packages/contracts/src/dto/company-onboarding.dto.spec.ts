import { describe, expect, it } from 'vitest';
import { CompanyOnboardingStatusSchema } from '../domain/enums.js';
import { AuthenticatedUserSchema, CompanyPortalAccountSchema } from './auth.dto.js';
import {
  ResolveVerificationRequestSchema,
  VerificationQueueItemDtoSchema,
} from './onboarding.dto.js';
import {
  COMPANY_SIZE_BAND_LABELS,
  COMPANY_SIZE_BANDS,
  COMPANY_WORK_EMAIL_REQUIRED_MESSAGE,
  CompanyOnboardingVerificationDocumentDtoSchema,
  CompanyRepresentativeSchema,
  CompanySignupProfileSchema,
  CompanyVerificationDocumentSchema,
  CompanyVerificationSchema,
  MAX_COMPANY_VERIFICATION_DOCUMENT_BYTES,
  StartCompanyOnboardingRequestSchema,
  SubmitCompanyOnboardingRequestSchema,
  UpdateCompanyOnboardingDraftRequestSchema,
} from './company-onboarding.dto.js';

const companyId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';
const submissionId = '33333333-3333-4333-8333-333333333333';
const sessionId = '44444444-4444-4444-8444-444444444444';
const tenantId = '55555555-5555-4555-8555-555555555555';

describe('CompanyOnboardingStatusSchema', () => {
  it('accepts valid statuses', () => {
    for (const status of [
      'DRAFT',
      'EMAIL_VERIFICATION_PENDING',
      'EMAIL_VERIFIED',
      'SUBMITTED',
      'PENDING_REVIEW',
      'RESUBMISSION_ALLOWED',
      'ACCOUNT_ACTIVE',
      'WITHDRAWN',
      'EXPIRED',
    ] as const) {
      expect(CompanyOnboardingStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    expect(CompanyOnboardingStatusSchema.safeParse('APPROVED').success).toBe(false);
  });
});

describe('CompanyRepresentativeSchema', () => {
  const valid = {
    fullName: 'Ada Recruiter',
    workEmail: 'ada@acme.example',
    phone: '+919876543210',
    jobTitle: 'Head of Talent',
    relationship: 'HR' as const,
  };

  it('accepts valid representative', () => {
    expect(CompanyRepresentativeSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing fullName', () => {
    const { fullName: _removed, ...rest } = valid;
    expect(CompanyRepresentativeSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects invalid email', () => {
    expect(
      CompanyRepresentativeSchema.safeParse({ ...valid, workEmail: 'not-an-email' }).success,
    ).toBe(false);
  });

  it('rejects invalid relationship', () => {
    expect(CompanyRepresentativeSchema.safeParse({ ...valid, relationship: 'CEO' }).success).toBe(
      false,
    );
  });
});

describe('CompanySignupProfileSchema', () => {
  const valid = {
    displayName: 'Acme Labs',
    legalName: 'Acme Labs Private Limited',
    website: 'https://acme.example',
    sector: 'Software',
    mode: 'SERVICE' as const,
    sizeBand: '51-200',
    publicEmail: 'hello@acme.example',
    address: {
      line1: '1 Main Street',
      city: 'Bengaluru',
      country: 'IN',
    },
  };

  it('accepts valid profile', () => {
    expect(CompanySignupProfileSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid website', () => {
    expect(CompanySignupProfileSchema.safeParse({ ...valid, website: 'not-a-url' }).success).toBe(
      false,
    );
  });

  it('rejects invalid public email', () => {
    expect(
      CompanySignupProfileSchema.safeParse({ ...valid, publicEmail: 'bad-email' }).success,
    ).toBe(false);
  });

  it('rejects missing display name', () => {
    expect(CompanySignupProfileSchema.safeParse({ ...valid, displayName: '' }).success).toBe(false);
  });
});

describe('CompanyVerificationSchema', () => {
  const valid = {
    registrationCountry: 'IN',
    legalName: 'Acme Labs Private Limited',
    registeredAddress: {
      line1: '1 Main Street',
      city: 'Bengaluru',
      country: 'IN',
    },
    businessRegistrationNumber: 'U12345KA2020PTC123456',
    taxId: '29ABCDE1234F1Z5',
  };

  it('accepts valid verification', () => {
    expect(CompanyVerificationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid country code', () => {
    expect(
      CompanyVerificationSchema.safeParse({ ...valid, registrationCountry: 'India' }).success,
    ).toBe(false);
  });

  it('accepts optional registration and tax fields omitted', () => {
    const { businessRegistrationNumber: _brn, taxId: _tax, ...minimal } = valid;
    expect(CompanyVerificationSchema.safeParse(minimal).success).toBe(true);
  });
});

describe('CompanyOnboardingVerificationDocumentDtoSchema', () => {
  it('omits storageKey and allows optional downloadUrl', () => {
    const parsed = CompanyOnboardingVerificationDocumentDtoSchema.safeParse({
      documentId: '11111111-1111-4111-8111-111111111111',
      companyId: '22222222-2222-4222-8222-222222222222',
      submissionId: '33333333-3333-4333-8333-333333333333',
      documentType: 'TAX_DOCUMENT',
      fileName: 'gst.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024,
      uploadedAt: '2026-09-21T10:00:00.000Z',
      reviewStatus: 'PENDING',
      reviewReason: null,
      downloadUrl: 'https://cdn.example/signed',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('CompanyVerificationDocumentSchema', () => {
  const valid = {
    documentId,
    companyId,
    submissionId,
    documentType: 'TAX_DOCUMENT' as const,
    fileName: 'gst.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1024,
    storageKey: 'company-verification/111/gst.pdf',
    uploadedAt: '2026-09-21T10:00:00.000Z',
    reviewStatus: 'PENDING' as const,
    reviewReason: null,
  };

  it('accepts valid document metadata', () => {
    expect(CompanyVerificationDocumentSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid document type', () => {
    expect(
      CompanyVerificationDocumentSchema.safeParse({ ...valid, documentType: 'PAYSLIP' }).success,
    ).toBe(false);
  });

  it('rejects invalid review status', () => {
    expect(
      CompanyVerificationDocumentSchema.safeParse({ ...valid, reviewStatus: 'VERIFIED' }).success,
    ).toBe(false);
  });

  it('rejects invalid document UUID', () => {
    expect(
      CompanyVerificationDocumentSchema.safeParse({ ...valid, documentId: 'not-uuid' }).success,
    ).toBe(false);
  });

  it('rejects oversized file', () => {
    expect(
      CompanyVerificationDocumentSchema.safeParse({
        ...valid,
        fileSizeBytes: MAX_COMPANY_VERIFICATION_DOCUMENT_BYTES + 1,
      }).success,
    ).toBe(false);
  });
});

describe('SubmitCompanyOnboardingRequestSchema', () => {
  it('requires both attestations to be true', () => {
    expect(
      SubmitCompanyOnboardingRequestSchema.safeParse({
        attestations: { authorizedToRepresent: true, informationAccurate: true },
      }).success,
    ).toBe(true);
  });

  it('rejects authorizedToRepresent=false', () => {
    expect(
      SubmitCompanyOnboardingRequestSchema.safeParse({
        attestations: { authorizedToRepresent: false, informationAccurate: true },
      }).success,
    ).toBe(false);
  });

  it('rejects informationAccurate=false', () => {
    expect(
      SubmitCompanyOnboardingRequestSchema.safeParse({
        attestations: { authorizedToRepresent: true, informationAccurate: false },
      }).success,
    ).toBe(false);
  });
});

describe('StartCompanyOnboardingRequestSchema', () => {
  it('accepts minimal valid start request', () => {
    expect(
      StartCompanyOnboardingRequestSchema.safeParse({
        representative: { fullName: 'Ada Recruiter', workEmail: 'ada@acme.example' },
      }).success,
    ).toBe(true);
  });

  it.each(['ada@gmail.com', 'ADA@Yahoo.co.in', 'ada@outlook.com'])(
    'rejects the free-mail address %s with a field error on workEmail',
    (workEmail) => {
      const result = StartCompanyOnboardingRequestSchema.safeParse({
        representative: { fullName: 'Ada Recruiter', workEmail },
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(['representative', 'workEmail']);
      expect(result.error?.issues[0]?.message).toBe(COMPANY_WORK_EMAIL_REQUIRED_MESSAGE);
    },
  );
});

describe('UpdateCompanyOnboardingDraftRequestSchema work email', () => {
  it('rejects switching the representative to a free-mail address', () => {
    expect(
      UpdateCompanyOnboardingDraftRequestSchema.safeParse({
        representative: { workEmail: 'ada@gmail.com' },
      }).success,
    ).toBe(false);
  });
});

describe('VerificationQueueItemDtoSchema extension', () => {
  it('still validates institution queue items without company-only fields', () => {
    expect(
      VerificationQueueItemDtoSchema.safeParse({
        tenantType: 'institution',
        tenantId,
        name: 'Example College',
        domain: 'example.edu',
        verificationStatus: 'PENDING',
        verificationReason: null,
        createdAt: '2026-09-21T10:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('validates company queue items with optional onboarding metadata', () => {
    expect(
      VerificationQueueItemDtoSchema.safeParse({
        tenantType: 'company',
        tenantId,
        name: 'Acme Labs',
        domain: 'Software',
        verificationStatus: 'PENDING',
        verificationReason: null,
        createdAt: '2026-09-21T10:00:00.000Z',
        onboardingStatus: 'PENDING_REVIEW',
        submissionId: sessionId,
        representativeEmail: 'ada@acme.example',
        registrationCountry: 'IN',
        documentCount: 2,
        submittedAt: '2026-09-21T11:00:00.000Z',
      }).success,
    ).toBe(true);
  });
});

describe('ResolveVerificationRequestSchema extension', () => {
  it('still validates legacy resolve bodies', () => {
    expect(
      ResolveVerificationRequestSchema.safeParse({
        tenantType: 'institution',
        decision: 'APPROVED',
        reason: 'Documents verified manually.',
      }).success,
    ).toBe(true);
  });

  it('accepts optional submissionId for stale-resolve protection', () => {
    expect(
      ResolveVerificationRequestSchema.safeParse({
        tenantType: 'company',
        decision: 'APPROVED',
        reason: 'Documents verified manually.',
        submissionId: sessionId,
      }).success,
    ).toBe(true);
  });

  it('accepts optional company document reviews', () => {
    expect(
      ResolveVerificationRequestSchema.safeParse({
        tenantType: 'company',
        decision: 'REJECTED',
        reason: 'Tax document is illegible.',
        documentReviews: [{ documentId, reviewStatus: 'REJECTED', reviewReason: 'Blurry scan' }],
        internalNotes: 'Asked applicant to resubmit.',
      }).success,
    ).toBe(true);
  });
});

describe('CompanyPortalAccountSchema', () => {
  it('accepts tenant-safe company account fields', () => {
    expect(
      CompanyPortalAccountSchema.safeParse({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'hr@acme.example',
        fullName: 'Jane Rep',
        role: 'COMPANY',
        institutionId: null,
        institutionName: null,
        companyId: '223e4567-e89b-12d3-a456-426614174001',
        companyName: 'Acme Corp',
        primaryTrack: null,
        secondaryTrack: null,
        provider: 'PASSWORD',
        emailVerified: true,
        createdAt: '2026-09-21T10:00:00.000Z',
        onboardingCompleted: true,
        profilePhotoUrl: null,
        cgpa: null,
        sscPercentage: null,
        hscPercentage: null,
        sessionHold: null,
        companyVerificationStatus: 'APPROVED',
        companyWebsite: 'https://acme.example',
        companyIndustry: 'Software',
        companyLocation: 'Bengaluru',
      }).success,
    ).toBe(true);
  });
});

describe('AuthenticatedUserSchema company fields', () => {
  const baseUser = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'student@example.edu',
    fullName: 'Student Example',
    role: 'STUDENT' as const,
    institutionId: '223e4567-e89b-12d3-a456-426614174001',
    institutionName: 'Example College',
    primaryTrack: null,
    secondaryTrack: null,
    provider: 'PASSWORD' as const,
    emailVerified: true,
    createdAt: '2026-09-21T10:00:00.000Z',
    onboardingCompleted: true,
    profilePhotoUrl: null,
    cgpa: null,
    sscPercentage: null,
    hscPercentage: null,
    sessionHold: null,
    companyId: null,
    companyName: null,
  };

  it('accepts student user with companyId null', () => {
    expect(AuthenticatedUserSchema.safeParse(baseUser).success).toBe(true);
  });

  it('accepts TPO admin with companyId null', () => {
    expect(
      AuthenticatedUserSchema.safeParse({
        ...baseUser,
        role: 'INSTITUTION_ADMIN',
        email: 'tpo@example.edu',
      }).success,
    ).toBe(true);
  });

  it('accepts COMPANY user with company tenant fields', () => {
    expect(
      AuthenticatedUserSchema.safeParse({
        ...baseUser,
        role: 'COMPANY',
        email: 'hr@acme.example',
        institutionId: null,
        institutionName: null,
        companyId: '423e4567-e89b-12d3-a456-426614174002',
        companyName: 'Acme Corp',
      }).success,
    ).toBe(true);
  });

  it('accepts legacy payloads without company fields until auth phase ships', () => {
    const { companyId: _c, companyName: _n, ...legacy } = baseUser;
    expect(AuthenticatedUserSchema.safeParse(legacy).success).toBe(true);
  });
});

describe('company size band (dropdown values)', () => {
  const profile = {
    displayName: 'Acme Labs',
    legalName: 'Acme Labs Private Limited',
    website: 'https://acme.example',
    sector: 'Software',
    mode: 'SERVICE' as const,
    sizeBand: '51-200',
    publicEmail: 'hello@acme.example',
    address: { line1: '1 Main Street', city: 'Bengaluru', country: 'IN' },
  };

  it('accepts every offered band', () => {
    for (const sizeBand of COMPANY_SIZE_BANDS) {
      expect(CompanySignupProfileSchema.safeParse({ ...profile, sizeBand }).success).toBe(true);
    }
  });

  it('labels every offered band', () => {
    for (const band of COMPANY_SIZE_BANDS) {
      expect(COMPANY_SIZE_BAND_LABELS[band]).toMatch(/employees$/);
    }
  });

  it('rejects free text with a message the user can act on', () => {
    for (const sizeBand of ['lots', '51 to 200', '', '10000', '51-200 ']) {
      const result = CompanySignupProfileSchema.safeParse({ ...profile, sizeBand });
      if (sizeBand === '51-200 ') {
        // Surrounding whitespace is trimmed before the enum check by the API layer; the enum itself is strict.
        expect(result.success).toBe(false);
        continue;
      }
      expect(result.success).toBe(false);
      expect(JSON.stringify(result.error?.issues)).toContain(
        'Choose a company size from the list.',
      );
    }
  });
});

describe('company phone number (digits only)', () => {
  const rep = {
    fullName: 'Ada Recruiter',
    workEmail: 'ada@acme.example',
    jobTitle: 'Head of Talent',
    relationship: 'HR' as const,
  };

  it('accepts digits with an optional leading +', () => {
    for (const phone of ['+919876543210', '9876543210', '12345678', '123456789012345']) {
      expect(CompanyRepresentativeSchema.safeParse({ ...rep, phone }).success).toBe(true);
    }
  });

  it('rejects letters, spaces, dashes, brackets and out-of-range lengths', () => {
    for (const phone of [
      'call me',
      '+91 98765 43210',
      '98765-43210',
      '(987) 6543210',
      '1234567',
      '1234567890123456',
      '++919876543210',
      '',
    ]) {
      expect(CompanyRepresentativeSchema.safeParse({ ...rep, phone }).success).toBe(false);
    }
  });

  it('explains the rule in the error message', () => {
    const result = CompanyRepresentativeSchema.safeParse({ ...rep, phone: 'abc' });
    expect(JSON.stringify(result.error?.issues)).toContain('digits only');
  });
});
