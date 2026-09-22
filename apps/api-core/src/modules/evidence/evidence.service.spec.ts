import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CredentialDedupService } from '../candidate-certificates/verification/credential-dedup.service.js';
import { EvidenceService } from './evidence.service.js';

const CLAIM_ID_1 = '11111111-1111-4111-8111-111111111111';
const EVIDENCE_ID_1 = '22222222-2222-4222-8222-222222222222';
const EVIDENCE_ID_2 = '33333333-3333-4333-8333-333333333333';
const STUDENT_ID = '44444444-4444-4444-8444-444444444444';

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
      findMany: vi.fn().mockResolvedValue([]),
    },
    skillClaim: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    skillClaimEvidenceLink: {
      upsert: vi.fn().mockImplementation(({ create }) =>
        Promise.resolve({
          id: 'link-1',
          claimId: create.claimId,
          evidenceId: create.evidenceId,
          weight: create.weight,
          createdAt: new Date(),
        }),
      ),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    ...overrides?.prisma,
  };
  const reconciliation = {
    reconcileForStudent: vi
      .fn()
      .mockResolvedValue({ contradictionsDetected: 0, reviewRequired: false }),
  };
  const storageService = {
    upload: vi.fn().mockResolvedValue('credential-documents/student-1/file.pdf'),
  };
  const credentialVerificationQueue = { add: vi.fn().mockResolvedValue({ id: 'job-1' }) };
  const dedup = new CredentialDedupService(prisma as never);
  const auditPublisher = { record: vi.fn().mockResolvedValue(undefined) };

  const skillClaimAutoDeclare = {
    ensureClaimsForProjectTags: vi.fn().mockResolvedValue(undefined),
  };
  const service = new EvidenceService(
    prisma as any,
    reconciliation as any,
    storageService as any,
    credentialVerificationQueue as any,
    dedup,
    skillClaimAutoDeclare as any,
    auditPublisher as any,
  );
  return {
    service,
    prisma,
    reconciliation,
    storageService,
    credentialVerificationQueue,
    dedup,
    skillClaimAutoDeclare,
    auditPublisher,
  };
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

  it('auto-declares skill claims when project skill mappings are saved', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'proj-1', studentId: 'student-1' });
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const createMapping = vi.fn().mockResolvedValue({});
    const findMany = vi.fn().mockResolvedValue([
      {
        projectId: 'proj-1',
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        verificationStatus: 'PENDING',
      },
    ]);
    const { service, skillClaimAutoDeclare } = buildService({
      prisma: {
        project: { findFirst },
        projectSkillMapping: { deleteMany, create: createMapping, findMany },
        $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
      },
    });

    await service.replaceProjectSkillMappings('student-1', 'proj-1', [
      {
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        specificContribution: 'Built the API layer for the capstone.',
        componentWorkedOn: 'Backend',
      },
    ]);

    expect(skillClaimAutoDeclare.ensureClaimsForProjectTags).toHaveBeenCalledWith(
      'student-1',
      'proj-1',
      ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
    );
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

describe('EvidenceService associateEvidenceWithClaim (VER-01)', () => {
  it('successfully associates a single evidence item with a skill claim', async () => {
    const { service, auditPublisher, reconciliation } = buildService({
      prisma: {
        skillClaim: {
          findFirst: vi.fn().mockResolvedValue({
            id: CLAIM_ID_1,
            studentId: STUDENT_ID,
            status: 'DECLARED',
          }),
        },
        evidenceRecord: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: EVIDENCE_ID_1, studentId: STUDENT_ID, verificationStatus: 'VERIFIED' },
            ]),
        },
      },
    });

    const result = await service.associateEvidenceWithClaim(STUDENT_ID, CLAIM_ID_1, {
      evidenceIds: [EVIDENCE_ID_1],
      weight: 1,
    });

    expect(result.claimId).toBe(CLAIM_ID_1);
    expect(result.associatedCount).toBe(1);
    expect(result.links).toHaveLength(1);
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: STUDENT_ID,
        action: 'evidence.associated_with_claim',
        resourceType: 'skill_claim',
        resourceId: CLAIM_ID_1,
      }),
    );
    expect(reconciliation.reconcileForStudent).toHaveBeenCalledWith(STUDENT_ID);
  });

  it('successfully associates multiple evidence items with a skill claim', async () => {
    const { service, auditPublisher } = buildService({
      prisma: {
        skillClaim: {
          findFirst: vi.fn().mockResolvedValue({
            id: CLAIM_ID_1,
            studentId: STUDENT_ID,
            status: 'DECLARED',
          }),
        },
        evidenceRecord: {
          findMany: vi.fn().mockResolvedValue([
            { id: EVIDENCE_ID_1, studentId: STUDENT_ID, verificationStatus: 'VERIFIED' },
            { id: EVIDENCE_ID_2, studentId: STUDENT_ID, verificationStatus: 'PENDING' },
          ]),
        },
      },
    });

    const result = await service.associateEvidenceWithClaim(STUDENT_ID, CLAIM_ID_1, {
      evidenceIds: [EVIDENCE_ID_1, EVIDENCE_ID_2],
      weight: 0.8,
    });

    expect(result.associatedCount).toBe(2);
    expect(result.links).toHaveLength(2);
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          evidenceIds: [EVIDENCE_ID_1, EVIDENCE_ID_2],
          associatedCount: 2,
        }),
      }),
    );
  });

  it('throws NotFoundException if the claim does not exist or belongs to another user', async () => {
    const { service } = buildService({
      prisma: {
        skillClaim: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    });

    await expect(
      service.associateEvidenceWithClaim(STUDENT_ID, CLAIM_ID_1, {
        evidenceIds: [EVIDENCE_ID_1],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException if any evidence item does not exist or belongs to another user', async () => {
    const { service } = buildService({
      prisma: {
        skillClaim: {
          findFirst: vi.fn().mockResolvedValue({
            id: CLAIM_ID_1,
            studentId: STUDENT_ID,
            status: 'DECLARED',
          }),
        },
        evidenceRecord: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: EVIDENCE_ID_1, studentId: STUDENT_ID, verificationStatus: 'VERIFIED' },
            ]),
        },
      },
    });

    await expect(
      service.associateEvidenceWithClaim(STUDENT_ID, CLAIM_ID_1, {
        evidenceIds: [EVIDENCE_ID_1, EVIDENCE_ID_2],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException if evidenceIds array is empty', async () => {
    const { service } = buildService();

    await expect(
      service.associateEvidenceWithClaim(STUDENT_ID, CLAIM_ID_1, {
        evidenceIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException if duplicate evidence IDs are provided in request', async () => {
    const { service } = buildService();

    await expect(
      service.associateEvidenceWithClaim(STUDENT_ID, CLAIM_ID_1, {
        evidenceIds: [EVIDENCE_ID_1, EVIDENCE_ID_1],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException if claim status is LOCKED', async () => {
    const { service } = buildService({
      prisma: {
        skillClaim: {
          findFirst: vi.fn().mockResolvedValue({
            id: CLAIM_ID_1,
            studentId: STUDENT_ID,
            status: 'LOCKED',
          }),
        },
      },
    });

    await expect(
      service.associateEvidenceWithClaim(STUDENT_ID, CLAIM_ID_1, {
        evidenceIds: [EVIDENCE_ID_1],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException if any evidence item status is REJECTED', async () => {
    const { service } = buildService({
      prisma: {
        skillClaim: {
          findFirst: vi.fn().mockResolvedValue({
            id: CLAIM_ID_1,
            studentId: STUDENT_ID,
            status: 'DECLARED',
          }),
        },
        evidenceRecord: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: EVIDENCE_ID_1, studentId: STUDENT_ID, verificationStatus: 'REJECTED' },
            ]),
        },
      },
    });

    await expect(
      service.associateEvidenceWithClaim(STUDENT_ID, CLAIM_ID_1, {
        evidenceIds: [EVIDENCE_ID_1],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('performs idempotent upsert so repeated requests update weight without creating duplicates', async () => {
    const upsertSpy = vi.fn().mockImplementation(({ create }) =>
      Promise.resolve({
        id: 'link-1',
        claimId: create.claimId,
        evidenceId: create.evidenceId,
        weight: create.weight,
        createdAt: new Date(),
      }),
    );

    const { service } = buildService({
      prisma: {
        skillClaim: {
          findFirst: vi.fn().mockResolvedValue({
            id: CLAIM_ID_1,
            studentId: STUDENT_ID,
            status: 'DECLARED',
          }),
        },
        evidenceRecord: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: EVIDENCE_ID_1, studentId: STUDENT_ID, verificationStatus: 'VERIFIED' },
            ]),
        },
        skillClaimEvidenceLink: {
          upsert: upsertSpy,
        },
      },
    });

    await service.associateEvidenceWithClaim(STUDENT_ID, CLAIM_ID_1, {
      evidenceIds: [EVIDENCE_ID_1],
      weight: 0.5,
    });

    expect(upsertSpy).toHaveBeenCalledWith({
      where: { claimId_evidenceId: { claimId: CLAIM_ID_1, evidenceId: EVIDENCE_ID_1 } },
      create: { claimId: CLAIM_ID_1, evidenceId: EVIDENCE_ID_1, weight: 0.5 },
      update: { weight: 0.5 },
    });
  });

  it('delegates single linkEvidenceToClaim to associateEvidenceWithClaim seamlessly', async () => {
    const { service } = buildService({
      prisma: {
        skillClaim: {
          findFirst: vi.fn().mockResolvedValue({
            id: CLAIM_ID_1,
            studentId: STUDENT_ID,
            status: 'DECLARED',
          }),
        },
        evidenceRecord: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: EVIDENCE_ID_1, studentId: STUDENT_ID, verificationStatus: 'VERIFIED' },
            ]),
        },
      },
    });

    const link = await service.linkEvidenceToClaim(STUDENT_ID, EVIDENCE_ID_1, {
      claimId: CLAIM_ID_1,
      weight: 1,
    });

    expect(link.claimId).toBe(CLAIM_ID_1);
    expect(link.evidenceId).toBe(EVIDENCE_ID_1);
  });
});
