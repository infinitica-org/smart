import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CredentialDedupService } from '../candidate-certificates/verification/credential-dedup.service.js';
import { EvidenceService } from './evidence.service.js';

function buildService(overrides?: { prisma?: Record<string, unknown> }) {
  const prisma = {
    professionalCredential: {
      create: vi.fn().mockResolvedValue({ id: 'cred-1', studentId: 'student-1' }),
      findFirst: vi.fn().mockResolvedValue({ id: 'cred-1', studentId: 'student-1' }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: 'cred-1', studentId: 'student-1' }),
    },
    candidateCertificate: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    evidenceRecord: {
      create: vi.fn().mockResolvedValue({}),
    },
    ...overrides?.prisma,
  };
  const reconciliation = { reconcileForStudent: vi.fn().mockResolvedValue(undefined) };
  const storageService = {
    upload: vi.fn().mockResolvedValue('credential-documents/student-1/file.pdf'),
  };
  const credentialVerificationQueue = { add: vi.fn().mockResolvedValue({ id: 'job-1' }) };
  const dedup = new CredentialDedupService(prisma as never);

  const service = new EvidenceService(
    prisma as any,
    reconciliation as any,
    storageService as any,
    credentialVerificationQueue as any,
    dedup,
  );
  return { service, prisma, reconciliation, storageService, credentialVerificationQueue, dedup };
}

describe('EvidenceService credentials', () => {
  it('ignores a client-supplied status and always creates credentials as PENDING_VERIFICATION', async () => {
    const { service, prisma, credentialVerificationQueue } = buildService();

    await service.createCredential('student-1', {
      issuer: 'Amazon Web Services',
      credentialName: 'AWS Certified Solutions Architect',
      credentialType: 'CERTIFICATION',
      status: 'ACTIVE',
      verificationMethod: 'ISSUER',
    });

    expect(prisma.professionalCredential.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING_VERIFICATION',
          verificationMethod: 'SELF_ATTESTED',
        }),
      }),
    );
    expect(credentialVerificationQueue.add).toHaveBeenCalledWith('verify-credential', {
      credentialId: 'cred-1',
    });
  });

  it('reconciles the student evidence profile after creating a credential', async () => {
    const { service, reconciliation } = buildService();

    await service.createCredential('student-1', {
      issuer: 'Amazon Web Services',
      credentialName: 'AWS Certified Solutions Architect',
      credentialType: 'CERTIFICATION',
    });

    expect(reconciliation.reconcileForStudent).toHaveBeenCalledWith('student-1');
  });

  it('refuses to create a credential that duplicates an existing candidate certificate', async () => {
    const { service, prisma } = buildService({
      prisma: {
        candidateCertificate: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'cert-1',
              title: 'AWS Certified Solutions Architect',
              issuer: 'Amazon Web Services',
              certificateNumber: null,
            },
          ]),
        },
      },
    });

    await expect(
      service.createCredential('student-1', {
        issuer: 'Amazon Web Services',
        credentialName: 'AWS Certified Solutions Architect',
        credentialType: 'CERTIFICATION',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.professionalCredential.create).not.toHaveBeenCalled();
  });

  it('uploads a credential document, stores the object key, and re-triggers verification', async () => {
    const { service, prisma, storageService, credentialVerificationQueue } = buildService();

    await service.uploadCredentialDocument('student-1', 'cred-1', {
      buffer: Buffer.from('pdf-bytes'),
      fileName: 'license.pdf',
      mimeType: 'application/pdf',
    });

    expect(storageService.upload).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: 'credential-documents/student-1' }),
    );
    expect(prisma.professionalCredential.update).toHaveBeenCalledWith({
      where: { id: 'cred-1' },
      data: { documentObjectKey: 'credential-documents/student-1/file.pdf' },
    });
    expect(credentialVerificationQueue.add).toHaveBeenCalledWith('verify-credential', {
      credentialId: 'cred-1',
    });
  });

  it('rejects an oversized credential document before uploading', async () => {
    const { service, storageService } = buildService();

    await expect(
      service.uploadCredentialDocument('student-1', 'cred-1', {
        buffer: Buffer.alloc(6 * 1024 * 1024),
        fileName: 'license.pdf',
        mimeType: 'application/pdf',
      }),
    ).rejects.toThrow();
    expect(storageService.upload).not.toHaveBeenCalled();
  });

  it('rejects a disallowed mime type before uploading', async () => {
    const { service, storageService } = buildService();

    await expect(
      service.uploadCredentialDocument('student-1', 'cred-1', {
        buffer: Buffer.from('data'),
        fileName: 'license.exe',
        mimeType: 'application/x-msdownload',
      }),
    ).rejects.toThrow();
    expect(storageService.upload).not.toHaveBeenCalled();
  });
});
