import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CandidateEvidenceProvenanceResponseSchema as _CandidateEvidenceProvenanceResponseSchema } from '@smart/contracts';
import type { RequestUser as _RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { CredentialDedupService } from '../candidate-certificates/verification/credential-dedup.service.js';
import { EvidenceService } from './evidence.service.js';

const _CLAIM_ID_1 = '11111111-1111-4111-8111-111111111111';
const _EVIDENCE_ID_1 = '22222222-2222-4222-8222-222222222222';
const _EVIDENCE_ID_2 = '33333333-3333-4333-8333-333333333333';
const _STUDENT_ID = '44444444-4444-4444-8444-444444444444';

function buildService(overrides?: { prisma?: Record<string, unknown> }) {
  const evidenceRecordCreate = vi.fn().mockResolvedValue({
    id: 'evidence-1',
    studentId: 'student-1',
    source: 'CANDIDATE',
    verificationStatus: 'PENDING',
    evidenceType: 'CREDENTIAL',
    relatedSkillCodes: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    artifacts: [],
  });

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
    user: {
      findUnique: vi.fn().mockResolvedValue({ institutionId: 'inst-1' }),
    },
    evidenceRecord: {
      create: evidenceRecordCreate,
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: typeof prisma) => Promise<unknown>) =>
      callback(prisma),
    ),
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
  const evidenceReconciliationQueue = {
    add: vi.fn().mockResolvedValue({ id: 'reconcile-1' }),
    getJob: vi.fn().mockResolvedValue(null),
  };
  const dedup = new CredentialDedupService(prisma as never);
  const skillClaimAutoDeclare = {
    ensureClaimsForProjectTags: vi.fn().mockResolvedValue(undefined),
  };
  const evidenceSync = {
    syncProjectEvidenceRecord: vi.fn().mockResolvedValue(undefined),
    linkProjectEvidenceToTaggedClaims: vi.fn().mockResolvedValue(undefined),
  };
  const skillInference = {
    recomputeForStudentSkills: vi.fn().mockResolvedValue(undefined),
  };
  const evidenceVersions = {
    resolveStudentOrganizationId: vi.fn().mockResolvedValue('org-1'),
    createInitialVersion: vi.fn().mockResolvedValue('created'),
    appendVersion: vi.fn().mockResolvedValue('created'),
    contentEquals: vi.fn().mockReturnValue(false),
    hashContent: vi.fn().mockReturnValue('hash'),
    listStudentEvidenceVersions: vi.fn().mockResolvedValue({ evidenceId: '', total: 0, items: [] }),
    getStudentEvidenceVersion: vi.fn(),
    listCandidateEvidenceVersions: vi
      .fn()
      .mockResolvedValue({ evidenceId: '', total: 0, items: [] }),
    getCandidateEvidenceVersion: vi.fn(),
  };
  const service = new EvidenceService(
    prisma as any,
    reconciliation as any,
    storageService as any,
    credentialVerificationQueue as any,
    evidenceReconciliationQueue as any,
    dedup,
    skillClaimAutoDeclare as any,
    evidenceSync as any,
    skillInference as any,
    evidenceVersions as any,
    _auditPublisher as any,
  );
  return {
    service,
    prisma,
    reconciliation,
    storageService,
    credentialVerificationQueue,
    evidenceReconciliationQueue,
    dedup,
    skillClaimAutoDeclare,
    evidenceSync,
    skillInference,
    evidenceVersions,
    auditPublisher: _auditPublisher,
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
    const { service, reconciliation, evidenceVersions } = buildService();

    await service.createCredential('student-1', {
      issuer: 'Amazon Web Services',
      credentialName: 'AWS Certified Solutions Architect',
      credentialType: 'CERTIFICATION',
    });

    expect(reconciliation.reconcileForStudent).toHaveBeenCalledWith('student-1');
    expect(evidenceVersions.createInitialVersion).toHaveBeenCalled();
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
    const { service, skillClaimAutoDeclare, evidenceSync } = buildService({
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
    expect(evidenceSync.syncProjectEvidenceRecord).toHaveBeenCalledWith('student-1', 'proj-1');
    expect(evidenceSync.linkProjectEvidenceToTaggedClaims).toHaveBeenCalledWith(
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

describe('EvidenceService versioning', () => {
  it('creates version 1 when creating evidence', async () => {
    const created = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      studentId: '323e4567-e89b-12d3-a456-426614174002',
      evidenceType: 'PROJECT',
      source: 'CANDIDATE',
      verificationStatus: 'PENDING',
      relatedSkillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      artifacts: [],
    };
    const { service, evidenceVersions, prisma } = buildService({
      prisma: {
        evidenceRecord: {
          create: vi.fn().mockResolvedValue(created),
        },
      },
    });

    await service.createEvidence('323e4567-e89b-12d3-a456-426614174002', {
      evidenceType: 'PROJECT',
      source: 'CANDIDATE',
      relatedSkillIds: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(evidenceVersions.createInitialVersion).toHaveBeenCalledWith(
      expect.anything(),
      created,
      expect.objectContaining({ mutationKey: 'create:123e4567-e89b-12d3-a456-426614174000' }),
    );
  });

  it('skips update when normalized content is unchanged', async () => {
    const existing = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      studentId: '323e4567-e89b-12d3-a456-426614174002',
      evidenceType: 'PROJECT',
      source: 'CANDIDATE',
      verificationStatus: 'PENDING',
      relatedSkillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
      claim: 'Same',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      artifacts: [],
    };
    const { service, evidenceVersions, prisma } = buildService({
      prisma: {
        evidenceRecord: {
          findFirst: vi.fn().mockResolvedValue(existing),
          update: vi.fn(),
        },
      },
    });
    evidenceVersions.contentEquals.mockReturnValue(true);

    await service.updateEvidence(
      '323e4567-e89b-12d3-a456-426614174002',
      '123e4567-e89b-12d3-a456-426614174000',
      {
        claim: 'Same',
        relatedSkillIds: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
      },
    );

    expect(prisma.evidenceRecord.update).not.toHaveBeenCalled();
    expect(evidenceVersions.appendVersion).not.toHaveBeenCalled();
  });
});

describe('EvidenceService credentials: isolation and validation (STU-02)', () => {
  const pdf = { buffer: Buffer.from('%PDF'), fileName: 'cert.pdf', mimeType: 'application/pdf' };

  it('lists only the caller’s credentials', async () => {
    const { service, prisma } = buildService();

    await service.listCredentials('student-1');

    expect(prisma.professionalCredential.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: 'student-1' } }),
    );
  });

  it('does not let a student attach a document to someone else’s credential', async () => {
    const { service, prisma, storageService } = buildService({
      prisma: {
        professionalCredential: {
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
      },
    });

    await expect(
      service.uploadCredentialDocument('student-2', 'cred-1', pdf),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.professionalCredential.findFirst).toHaveBeenCalledWith({
      where: { id: 'cred-1', studentId: 'student-2' },
    });
    expect(storageService.upload).not.toHaveBeenCalled();
    expect(prisma.professionalCredential.update).not.toHaveBeenCalled();
  });

  it('rejects unsupported document types before storing anything', async () => {
    const { service, storageService } = buildService();

    await expect(
      service.uploadCredentialDocument('student-1', 'cred-1', {
        ...pdf,
        fileName: 'cert.exe',
        mimeType: 'application/x-msdownload',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(storageService.upload).not.toHaveBeenCalled();
  });

  it('rejects documents over the 5MB limit before storing anything', async () => {
    const { service, storageService } = buildService();

    await expect(
      service.uploadCredentialDocument('student-1', 'cred-1', {
        ...pdf,
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(storageService.upload).not.toHaveBeenCalled();
  });

  it('does not create a credential from an invalid payload', async () => {
    const { service, prisma } = buildService();

    await expect(service.createCredential('student-1', { issuer: '' })).rejects.toBeDefined();

    expect(prisma.professionalCredential.create).not.toHaveBeenCalled();
  });
});
