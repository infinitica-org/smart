import { describe, expect, it, vi } from 'vitest';
import { Tier1IssuerRegistry } from '../../candidate-certificates/verification/tier1-issuer-registry.js';
import { Tier2PublicUrlVerifier } from '../../candidate-certificates/verification/tier2-public-url-verifier.js';
import { Tier3OcrVerifier } from '../../candidate-certificates/verification/tier3-ocr-verifier.js';
import { CredentialVerificationService } from './credential-verification.service.js';

function buildService(
  mockPrisma: unknown,
  overrides?: {
    tier1?: Tier1IssuerRegistry;
    tier2?: Tier2PublicUrlVerifier;
    tier3?: Tier3OcrVerifier;
  },
) {
  const reconciliation = { reconcileForStudent: vi.fn().mockResolvedValue(undefined) };
  return {
    service: new CredentialVerificationService(
      mockPrisma as any,
      reconciliation as any,
      overrides?.tier1 ?? new Tier1IssuerRegistry(),
      overrides?.tier2 ?? new Tier2PublicUrlVerifier(),
      overrides?.tier3 ?? new Tier3OcrVerifier(),
    ),
    reconciliation,
  };
}

function baseCredential(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cred-1',
    studentId: 'student-1',
    issuer: 'Amazon Web Services',
    credentialName: 'AWS Certified Solutions Architect',
    credentialType: 'CERTIFICATION',
    externalCredentialId: 'AWS-100',
    verificationSource: 'https://aws.amazon.com/verify/100',
    documentObjectKey: null,
    student: { fullName: 'Alice Smith' },
    ...overrides,
  };
}

describe('CredentialVerificationService', () => {
  it('marks the credential ACTIVE and the evidence record VERIFIED when a tier verifies it', async () => {
    const mockPrisma = {
      professionalCredential: {
        findUnique: vi.fn().mockResolvedValue(baseCredential()),
        update: vi.fn().mockResolvedValue({}),
      },
      evidenceRecord: {
        findFirst: vi.fn().mockResolvedValue({ id: 'evidence-1' }),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const tier2 = new Tier2PublicUrlVerifier();
    vi.spyOn(tier2, 'verify').mockResolvedValue({
      status: 'VERIFIED',
      tier: 'TIER_2_PUBLIC_URL',
      confidence: 0.95,
      reason: 'Verified public registry page',
    });

    const { service, reconciliation } = buildService(mockPrisma, { tier2 });
    await service.runVerification('cred-1');

    expect(mockPrisma.professionalCredential.update).toHaveBeenCalledWith({
      where: { id: 'cred-1' },
      data: { status: 'ACTIVE', verificationMethod: 'ISSUER' },
    });
    expect(mockPrisma.evidenceRecord.update).toHaveBeenCalledWith({
      where: { id: 'evidence-1' },
      data: expect.objectContaining({ verificationStatus: 'VERIFIED' }),
    });
    expect(reconciliation.reconcileForStudent).toHaveBeenCalledWith('student-1');
  });

  it('rejects the evidence record but leaves the credential status untouched on FAILED', async () => {
    const mockPrisma = {
      professionalCredential: {
        findUnique: vi.fn().mockResolvedValue(baseCredential()),
        update: vi.fn().mockResolvedValue({}),
      },
      evidenceRecord: {
        findFirst: vi.fn().mockResolvedValue({ id: 'evidence-1' }),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const tier2 = new Tier2PublicUrlVerifier();
    vi.spyOn(tier2, 'verify').mockResolvedValue({
      status: 'FAILED',
      tier: 'TIER_2_PUBLIC_URL',
      confidence: 0.9,
      reason: 'Registry page contradicts the claimed credential.',
    });

    const { service } = buildService(mockPrisma, { tier2 });
    await service.runVerification('cred-1');

    expect(mockPrisma.professionalCredential.update).toHaveBeenCalledWith({
      where: { id: 'cred-1' },
      data: {},
    });
    expect(mockPrisma.evidenceRecord.update).toHaveBeenCalledWith({
      where: { id: 'evidence-1' },
      data: expect.objectContaining({ verificationStatus: 'REJECTED' }),
    });
  });

  it('skips automated verification for DEGREE credentials', async () => {
    const mockPrisma = {
      professionalCredential: {
        findUnique: vi.fn().mockResolvedValue(baseCredential({ credentialType: 'DEGREE' })),
        update: vi.fn(),
      },
      evidenceRecord: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };

    const { service, reconciliation } = buildService(mockPrisma);
    await service.runVerification('cred-1');

    expect(mockPrisma.professionalCredential.update).not.toHaveBeenCalled();
    expect(reconciliation.reconcileForStudent).not.toHaveBeenCalled();
  });

  it('falls back to AMBIGUOUS and leaves everything PENDING when no tier is available', async () => {
    const mockPrisma = {
      professionalCredential: {
        findUnique: vi
          .fn()
          .mockResolvedValue(
            baseCredential({ verificationSource: null, externalCredentialId: null }),
          ),
        update: vi.fn().mockResolvedValue({}),
      },
      evidenceRecord: {
        findFirst: vi.fn().mockResolvedValue({ id: 'evidence-1' }),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const { service } = buildService(mockPrisma);
    await service.runVerification('cred-1');

    expect(mockPrisma.professionalCredential.update).toHaveBeenCalledWith({
      where: { id: 'cred-1' },
      data: {},
    });
    expect(mockPrisma.evidenceRecord.update).toHaveBeenCalledWith({
      where: { id: 'evidence-1' },
      data: expect.objectContaining({ verificationStatus: 'PENDING' }),
    });
  });
});
