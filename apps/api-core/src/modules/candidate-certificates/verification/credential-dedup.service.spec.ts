import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CredentialDedupService } from './credential-dedup.service.js';

const CANDIDATE_ID = '00000000-0000-4000-8000-000000000001';

function buildPrisma(
  overrides: {
    certificates?: unknown[];
    credentials?: unknown[];
  } = {},
) {
  return {
    candidateCertificate: {
      findMany: vi.fn().mockResolvedValue(overrides.certificates ?? []),
    },
    professionalCredential: {
      findMany: vi.fn().mockResolvedValue(overrides.credentials ?? []),
    },
  };
}

describe('CredentialDedupService', () => {
  it('allows the first declaration when nothing else exists', async () => {
    const prisma = buildPrisma();
    const dedup = new CredentialDedupService(prisma as never);

    await expect(
      dedup.assertNoDuplicate(CANDIDATE_ID, {
        issuer: 'Amazon Web Services',
        title: 'AWS Certified Solutions Architect',
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects a candidate-certificate duplicate by normalized issuer+title', async () => {
    const prisma = buildPrisma({
      certificates: [
        {
          id: 'cert-1',
          title: 'AWS Certified Solutions Architect - Associate',
          issuer: 'Amazon Web Services',
          certificateNumber: null,
        },
      ],
    });
    const dedup = new CredentialDedupService(prisma as never);

    await expect(
      dedup.assertNoDuplicate(CANDIDATE_ID, {
        issuer: 'amazon web services',
        title: 'aws certified solutions architect – associate',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a duplicate matched by identifier number even if the title differs', async () => {
    const prisma = buildPrisma({
      certificates: [
        {
          id: 'cert-1',
          title: 'AWS SAA-C03',
          issuer: 'Amazon Web Services',
          certificateNumber: 'ABC-123',
        },
      ],
    });
    const dedup = new CredentialDedupService(prisma as never);

    await expect(
      dedup.assertNoDuplicate(CANDIDATE_ID, {
        issuer: 'Amazon Web Services',
        title: 'AWS Solutions Architect Associate',
        identifierNumber: 'abc-123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects when the duplicate already exists as a professional credential', async () => {
    const prisma = buildPrisma({
      credentials: [
        {
          id: 'pc-1',
          credentialName: 'AWS Certified Solutions Architect',
          issuer: 'Amazon Web Services',
          externalCredentialId: null,
        },
      ],
    });
    const dedup = new CredentialDedupService(prisma as never);

    await expect(
      dedup.assertNoDuplicate(CANDIDATE_ID, {
        issuer: 'Amazon Web Services',
        title: 'AWS Certified Solutions Architect',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('ignores rejected/voided candidate-certificate rows when checking for duplicates', async () => {
    const prisma = buildPrisma();
    const dedup = new CredentialDedupService(prisma as never);

    await dedup.assertNoDuplicate(CANDIDATE_ID, {
      issuer: 'Amazon Web Services',
      title: 'AWS Certified Solutions Architect',
    });

    expect(prisma.candidateCertificate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { notIn: ['REJECTED', 'VOIDED'] },
        }),
      }),
    );
  });
});
