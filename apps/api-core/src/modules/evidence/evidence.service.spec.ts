import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CandidateEvidenceProvenanceResponseSchema } from '@smart/contracts';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
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
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
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
  const evidenceReconciliationQueue = {
    add: vi.fn().mockResolvedValue({ id: 'reconcile-1' }),
    getJob: vi.fn().mockResolvedValue(null),
  };
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
    evidenceReconciliationQueue as any,
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
    evidenceReconciliationQueue,
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

const FOREIGN_CLAIM_ID = '66666666-6666-4666-8666-666666666666';

function mockEvidenceRow(
  overrides: Partial<{
    id: string;
    studentId: string;
    evidenceType: string;
    verificationStatus: string;
    relatedSkillCodes: string[];
    claim: string | null;
    updatedAt: Date;
  }> = {},
) {
  return {
    id: EVIDENCE_ID_1,
    studentId: STUDENT_ID,
    evidenceType: 'PROJECT',
    source: 'CANDIDATE',
    sourceOwner: null,
    sourceReference: null,
    evidenceDate: null,
    submissionDate: null,
    claim: 'Batch pipeline project',
    context: null,
    provenance: null,
    accessibility: 'PRIVATE',
    relatedSkillCodes: ['SE_REACT'],
    verificationStatus: 'VERIFIED',
    evidenceStrength: null,
    evidenceReliability: null,
    freshness: null,
    sourceEntityId: null,
    sourcePayload: null,
    verificationMetadata: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    artifacts: [],
    ...overrides,
  };
}

describe('EvidenceService listEvidence (VER-01 read)', () => {
  it('returns only evidence linked to the requested claimId', async () => {
    const linkedRow = mockEvidenceRow({ id: EVIDENCE_ID_1 });
    const { service, prisma } = buildService({
      prisma: {
        evidenceRecord: {
          findMany: vi.fn().mockResolvedValue([linkedRow]),
        },
      },
    });

    const rows = await service.listEvidence(STUDENT_ID, { claimId: CLAIM_ID_1 });

    expect(prisma.evidenceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId: STUDENT_ID,
          claimLinks: { some: { claimId: CLAIM_ID_1 } },
        },
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.evidenceId).toBe(EVIDENCE_ID_1);
  });

  it('never returns evidence belonging to another student', async () => {
    const { service, prisma } = buildService({
      prisma: {
        evidenceRecord: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });

    await service.listEvidence(STUDENT_ID, { claimId: FOREIGN_CLAIM_ID });

    expect(prisma.evidenceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: STUDENT_ID }),
      }),
    );
  });

  it('returns an empty array when the claim has no linked evidence', async () => {
    const { service, prisma } = buildService({
      prisma: {
        evidenceRecord: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });

    const rows = await service.listEvidence(STUDENT_ID, { claimId: CLAIM_ID_1 });

    expect(prisma.evidenceRecord.findMany).toHaveBeenCalled();
    expect(rows).toEqual([]);
  });

  it('reflects the latest committed verificationStatus from the evidence row', async () => {
    const updatedAt = new Date('2026-03-15T12:00:00.000Z');
    const { service } = buildService({
      prisma: {
        evidenceRecord: {
          findMany: vi.fn().mockResolvedValue([
            mockEvidenceRow({
              id: EVIDENCE_ID_1,
              verificationStatus: 'EXPIRED',
              updatedAt,
            }),
          ]),
        },
      },
    });

    const rows = await service.listEvidence(STUDENT_ID, { claimId: CLAIM_ID_1 });

    expect(rows[0]?.verificationStatus).toBe('EXPIRED');
    expect(rows[0]?.updatedAt).toBe(updatedAt.toISOString());
  });

  it('includes claim-linked evidence types beyond PROJECT and WORK_EXPERIENCE', async () => {
    const { service } = buildService({
      prisma: {
        evidenceRecord: {
          findMany: vi.fn().mockResolvedValue([
            mockEvidenceRow({
              id: EVIDENCE_ID_1,
              evidenceType: 'CREDENTIAL',
              claim: 'AWS Solutions Architect',
              relatedSkillCodes: [],
              verificationStatus: 'PENDING',
            }),
          ]),
        },
      },
    });

    const rows = await service.listEvidence(STUDENT_ID, { claimId: CLAIM_ID_1 });

    expect(rows[0]?.evidenceType).toBe('CREDENTIAL');
    expect(rows[0]?.verificationStatus).toBe('PENDING');
  });

  it('preserves REJECTED and DISPUTED statuses on linked evidence reads', async () => {
    const { service } = buildService({
      prisma: {
        evidenceRecord: {
          findMany: vi.fn().mockResolvedValue([
            mockEvidenceRow({
              id: EVIDENCE_ID_1,
              verificationStatus: 'REJECTED',
            }),
            mockEvidenceRow({
              id: EVIDENCE_ID_2,
              verificationStatus: 'DISPUTED',
            }),
          ]),
        },
      },
    });

    const rows = await service.listEvidence(STUDENT_ID, { claimId: CLAIM_ID_1 });

    expect(rows.map((row) => row.verificationStatus)).toEqual(['REJECTED', 'DISPUTED']);
  });

  it('returns empty results for a nonexistent claimId without throwing', async () => {
    const { service } = buildService({
      prisma: {
        evidenceRecord: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });

    const rows = await service.listEvidence(STUDENT_ID, { claimId: FOREIGN_CLAIM_ID });

    expect(rows).toEqual([]);
  });

  it('repeated listEvidence calls are read-only and return the same mapped rows', async () => {
    const linkedRow = mockEvidenceRow({ id: EVIDENCE_ID_1 });
    const findMany = vi.fn().mockResolvedValue([linkedRow]);
    const { service } = buildService({
      prisma: {
        evidenceRecord: { findMany },
      },
    });

    const first = await service.listEvidence(STUDENT_ID, { claimId: CLAIM_ID_1 });
    const second = await service.listEvidence(STUDENT_ID, { claimId: CLAIM_ID_1 });

    expect(findMany).toHaveBeenCalledTimes(2);
    expect(second).toEqual(first);
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

  describe('getCandidateEvidenceProvenance (VER-01)', () => {
    const INST_ID_1 = '00000000-0000-0000-0000-000000000001';
    const INST_ID_2 = '00000000-0000-0000-0000-000000000002';
    const COMPANY_ID_1 = '11111111-1111-1111-1111-111111111111';
    const COMPANY_ID_2 = '22222222-2222-2222-2222-222222222222';

    const candidateUser = {
      id: STUDENT_ID,
      role: 'STUDENT',
      institutionId: INST_ID_1,
    };

    const mockEvidenceRecords = [
      {
        id: '00000000-0000-4000-8000-000000000001',
        studentId: STUDENT_ID,
        evidenceType: 'SELF_REPORT',
        source: 'CANDIDATE',
        verificationStatus: 'PENDING',
        verificationMetadata: { verificationMethod: 'SELF_ATTESTED' },
        claim: 'TypeScript Mastery',
        context: 'Self report',
        relatedSkillCodes: ['ts'],
        evidenceStrength: 'WEAK',
        evidenceReliability: 'LOW',
        sourceOwner: 'Candidate',
        sourceReference: null,
        createdAt: new Date('2026-09-01T00:00:00Z'),
        updatedAt: new Date('2026-09-01T00:00:00Z'),
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        studentId: STUDENT_ID,
        evidenceType: 'CREDENTIAL',
        source: 'ISSUER',
        verificationStatus: 'VERIFIED',
        verificationMetadata: { verificationMethod: 'ISSUER' },
        claim: 'AWS Certified Developer',
        context: 'Certification',
        relatedSkillCodes: ['aws'],
        evidenceStrength: 'DIRECT',
        evidenceReliability: 'VERIFIED',
        sourceOwner: 'AWS',
        sourceReference: 'AWS-123',
        createdAt: new Date('2026-09-02T00:00:00Z'),
        updatedAt: new Date('2026-09-02T00:00:00Z'),
      },
      {
        id: '00000000-0000-4000-8000-000000000003',
        studentId: STUDENT_ID,
        evidenceType: 'ASSESSMENT',
        source: 'PLATFORM',
        verificationStatus: 'VERIFIED',
        verificationMetadata: { verificationMethod: 'ASSESSMENT', verifiedBy: 'evaluator-1' },
        claim: 'Fullstack Assessment',
        context: 'Platform evaluation',
        relatedSkillCodes: ['node', 'react'],
        evidenceStrength: 'STRONG',
        evidenceReliability: 'HIGH',
        sourceOwner: 'SMART Engine',
        sourceReference: 'ASM-999',
        createdAt: new Date('2026-09-03T00:00:00Z'),
        updatedAt: new Date('2026-09-03T00:00:00Z'),
      },
    ];

    it('1. COMPANY successfully retrieves candidate evidence with valid application relationship', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          application: { count: vi.fn().mockResolvedValue(1) },
          evidenceRecord: { findMany: vi.fn().mockResolvedValue(mockEvidenceRecords) },
          verificationDecision: { findMany: vi.fn().mockResolvedValue([]) },
        },
      });

      const companyUser: RequestUser = {
        sub: 'usr-company-1',
        role: 'COMPANY',
        inst: null,
        companyId: COMPANY_ID_1,
      };

      const result = await service.getCandidateEvidenceProvenance(companyUser, STUDENT_ID);

      expect(result.studentId).toBe(STUDENT_ID);
      expect(result.total).toBe(3);
      expect(result.summary.SELF_DECLARED).toBe(1);
      expect(result.summary.SOURCE_VERIFIED).toBe(1);
      expect(result.summary.ASSESSED).toBe(1);
      expect(result.summary.HUMAN_REVIEWED).toBe(1);
      expect(result.items.length).toBe(3);
    });

    it('2. COMPANY cannot retrieve candidate with no Application relationship', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          application: { count: vi.fn().mockResolvedValue(0) },
        },
      });

      const companyUser: RequestUser = {
        sub: 'usr-company-1',
        role: 'COMPANY',
        inst: null,
        companyId: COMPANY_ID_1,
      };

      await expect(service.getCandidateEvidenceProvenance(companyUser, STUDENT_ID)).rejects.toThrow(
        'You do not have authorization to view evidence for this candidate.',
      );
    });

    it('3. COMPANY cannot access candidate belonging to another company', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          application: { count: vi.fn().mockResolvedValue(0) },
        },
      });

      const companyUser2: RequestUser = {
        sub: 'usr-company-2',
        role: 'COMPANY',
        inst: null,
        companyId: COMPANY_ID_2,
      };

      await expect(
        service.getCandidateEvidenceProvenance(companyUser2, STUDENT_ID),
      ).rejects.toThrow('You do not have authorization to view evidence for this candidate.');
    });

    it('4. INSTITUTION_ADMIN can retrieve candidate from same institution', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: { findMany: vi.fn().mockResolvedValue(mockEvidenceRecords) },
          verificationDecision: { findMany: vi.fn().mockResolvedValue([]) },
        },
      });

      const instAdminUser: RequestUser = {
        sub: 'usr-tpo-1',
        role: 'INSTITUTION_ADMIN',
        inst: INST_ID_1,
      };

      const result = await service.getCandidateEvidenceProvenance(instAdminUser, STUDENT_ID);
      expect(result.total).toBe(3);
    });

    it('5. INSTITUTION_ADMIN cannot retrieve candidate from another institution', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
        },
      });

      const instAdminOther: RequestUser = {
        sub: 'usr-tpo-2',
        role: 'INSTITUTION_ADMIN',
        inst: INST_ID_2,
      };

      await expect(
        service.getCandidateEvidenceProvenance(instAdminOther, STUDENT_ID),
      ).rejects.toThrow('You do not have access to candidate evidence outside your institution.');
    });

    it('6. PLACEMENT_STAFF same institution access', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: { findMany: vi.fn().mockResolvedValue(mockEvidenceRecords) },
          verificationDecision: { findMany: vi.fn().mockResolvedValue([]) },
        },
      });

      const staffUser: RequestUser = {
        sub: 'usr-staff-1',
        role: 'PLACEMENT_STAFF',
        inst: INST_ID_1,
      };

      const result = await service.getCandidateEvidenceProvenance(staffUser, STUDENT_ID);
      expect(result.total).toBe(3);
    });

    it('7. Unauthorized role rejected', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
        },
      });

      const studentUser: RequestUser = {
        sub: 'usr-student-2',
        role: 'STUDENT',
        inst: INST_ID_1,
      };

      await expect(service.getCandidateEvidenceProvenance(studentUser, STUDENT_ID)).rejects.toThrow(
        'Unauthorized role to view candidate evidence provenance.',
      );
    });

    it('8. SUPER_ADMIN behavior allows unrestricted access', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: { findMany: vi.fn().mockResolvedValue(mockEvidenceRecords) },
          verificationDecision: { findMany: vi.fn().mockResolvedValue([]) },
        },
      });

      const superAdmin: RequestUser = {
        sub: 'usr-super-1',
        role: 'SUPER_ADMIN',
        inst: null,
      };

      const result = await service.getCandidateEvidenceProvenance(superAdmin, STUDENT_ID);
      expect(result.total).toBe(3);
    });

    it('9. Empty evidence returns explicit empty state', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: { findMany: vi.fn().mockResolvedValue([]) },
          verificationDecision: { findMany: vi.fn().mockResolvedValue([]) },
        },
      });

      const superAdmin: RequestUser = {
        sub: 'usr-super-1',
        role: 'SUPER_ADMIN',
        inst: null,
      };

      const result = await service.getCandidateEvidenceProvenance(superAdmin, STUDENT_ID);
      expect(result.studentId).toBe(STUDENT_ID);
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
      expect(result.summary).toEqual({
        SELF_DECLARED: 0,
        SOURCE_VERIFIED: 0,
        ASSESSED: 0,
        HUMAN_REVIEWED: 0,
      });
    });

    it('14. Multiple categories can be returned for the same evidence (ASSESSED + HUMAN_REVIEWED)', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: '00000000-0000-4000-8000-000000000004',
                studentId: STUDENT_ID,
                evidenceType: 'ASSESSMENT',
                source: 'PLATFORM',
                verificationStatus: 'VERIFIED',
                verificationMetadata: {
                  verificationMethod: 'ASSESSMENT',
                  verifiedBy: 'reviewer-user-id',
                },
                claim: 'Algorithm Assessment',
                context: null,
                relatedSkillCodes: ['dsa'],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          },
          verificationDecision: { findMany: vi.fn().mockResolvedValue([]) },
        },
      });

      const superAdmin: RequestUser = {
        sub: 'usr-super-1',
        role: 'SUPER_ADMIN',
        inst: null,
      };

      const result = await service.getCandidateEvidenceProvenance(superAdmin, STUDENT_ID);
      expect(result.items[0].categories).toContain('ASSESSED');
      expect(result.items[0].categories).toContain('HUMAN_REVIEWED');
    });

    it('18. CandidateEvidenceProvenanceResponseSchema validates response structure', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: { findMany: vi.fn().mockResolvedValue(mockEvidenceRecords) },
          verificationDecision: { findMany: vi.fn().mockResolvedValue([]) },
        },
      });

      const superAdmin: RequestUser = {
        sub: 'usr-super-1',
        role: 'SUPER_ADMIN',
        inst: null,
      };

      const result = await service.getCandidateEvidenceProvenance(superAdmin, STUDENT_ID);
      const parsed = CandidateEvidenceProvenanceResponseSchema.safeParse(result);
      if (!parsed.success) {
        console.error('Validation error:', JSON.stringify(parsed.error.format(), null, 2));
      }
      expect(parsed.success).toBe(true);
    });
  });

  describe('EvidenceService audit event emissions (VER-01 retain history)', () => {
    it('emits evidence.created audit event when createEvidence succeeds', async () => {
      const createdRow = {
        id: EVIDENCE_ID_1,
        studentId: STUDENT_ID,
        evidenceType: 'PROJECT',
        source: 'CANDIDATE',
        verificationStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        artifacts: [],
      };
      const { service, prisma, auditPublisher } = buildService({
        prisma: {
          evidenceRecord: {
            create: vi.fn().mockResolvedValue(createdRow),
          },
        },
      });

      await service.createEvidence(STUDENT_ID, {
        evidenceType: 'PROJECT',
        source: 'CANDIDATE',
        claim: 'Built full stack project',
        relatedSkillIds: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
      });

      expect(prisma.evidenceRecord.create).toHaveBeenCalled();
      expect(auditPublisher.record).toHaveBeenCalledWith({
        actorId: STUDENT_ID,
        action: 'evidence.created',
        resourceType: 'evidence_record',
        resourceId: EVIDENCE_ID_1,
        reasonCode: null,
        metadata: {
          priorState: null,
          newState: {
            verificationStatus: 'PENDING',
            source: 'CANDIDATE',
            evidenceType: 'PROJECT',
          },
          source: 'CANDIDATE',
          evidenceType: 'PROJECT',
        },
      });
    });

    it('emits evidence.updated audit event when updateEvidence succeeds', async () => {
      const existingRow = {
        id: EVIDENCE_ID_1,
        studentId: STUDENT_ID,
        evidenceType: 'PROJECT',
        source: 'CANDIDATE',
        verificationStatus: 'PENDING',
        claim: 'Old Claim',
        relatedSkillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
        createdAt: new Date(),
        updatedAt: new Date(),
        artifacts: [],
      };
      const updatedRow = {
        ...existingRow,
        claim: 'Updated Claim',
        relatedSkillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
      };
      const { service, prisma, auditPublisher } = buildService({
        prisma: {
          evidenceRecord: {
            findFirst: vi.fn().mockResolvedValue(existingRow),
            update: vi.fn().mockResolvedValue(updatedRow),
          },
        },
      });

      await service.updateEvidence(STUDENT_ID, EVIDENCE_ID_1, {
        claim: 'Updated Claim',
        relatedSkillIds: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
      });

      expect(prisma.evidenceRecord.update).toHaveBeenCalled();
      expect(auditPublisher.record).toHaveBeenCalledWith({
        actorId: STUDENT_ID,
        action: 'evidence.updated',
        resourceType: 'evidence_record',
        resourceId: EVIDENCE_ID_1,
        reasonCode: null,
        metadata: expect.objectContaining({
          priorState: expect.objectContaining({
            verificationStatus: 'PENDING',
            claim: 'Old Claim',
          }),
          newState: expect.objectContaining({
            verificationStatus: 'PENDING',
            claim: 'Updated Claim',
          }),
        }),
      });
    });
  });

  describe('reviewEvidence (VER-01 reviewer workflow)', () => {
    const INST_ID_1 = '00000000-0000-0000-0000-000000000001';
    const INST_ID_2 = '00000000-0000-0000-0000-000000000002';
    const REVIEWER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    const candidateUser = {
      id: STUDENT_ID,
      role: 'STUDENT',
      institutionId: INST_ID_1,
    };

    const staffUser: RequestUser = {
      sub: REVIEWER_ID,
      role: 'PLACEMENT_STAFF',
      inst: INST_ID_1,
    };

    function mockEvidenceRow(overrides: Record<string, unknown> = {}) {
      return {
        id: EVIDENCE_ID_1,
        studentId: STUDENT_ID,
        evidenceType: 'SELF_REPORT',
        source: 'CANDIDATE',
        verificationStatus: 'PENDING',
        verificationMetadata: { verificationMethod: 'SELF_ATTESTED', auditTrail: [] },
        claim: 'TypeScript mastery',
        context: 'Self report',
        relatedSkillCodes: ['ts'],
        evidenceStrength: 'WEAK',
        evidenceReliability: 'LOW',
        sourceOwner: 'Candidate',
        sourceReference: null,
        sourceEntityId: null,
        sourcePayload: null,
        provenance: null,
        accessibility: 'PRIVATE',
        evidenceDate: null,
        submissionDate: new Date('2026-09-01T00:00:00Z'),
        freshness: null,
        createdAt: new Date('2026-09-01T00:00:00Z'),
        updatedAt: new Date('2026-09-01T00:00:00Z'),
        artifacts: [],
        ...overrides,
      };
    }

    it('1. authorized reviewer ACCEPTED maps to VERIFIED', async () => {
      const pending = mockEvidenceRow();
      const verified = mockEvidenceRow({ verificationStatus: 'VERIFIED' });
      const { service, prisma, auditPublisher, evidenceReconciliationQueue } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(verified),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        },
      });

      const result = await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
        decision: 'ACCEPTED',
      });

      expect(result.decision).toBe('ACCEPTED');
      expect(result.evidence.verificationStatus).toBe('VERIFIED');
      expect(prisma.evidenceRecord.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ verificationStatus: 'PENDING' }),
          data: expect.objectContaining({ verificationStatus: 'VERIFIED' }),
        }),
      );
      expect(auditPublisher.record).toHaveBeenCalledTimes(1);
      expect(evidenceReconciliationQueue.add).toHaveBeenCalledTimes(1);
    });

    it('2. authorized reviewer REJECTED maps to REJECTED', async () => {
      const pending = mockEvidenceRow();
      const rejected = mockEvidenceRow({ verificationStatus: 'REJECTED' });
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(rejected),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        },
      });

      const result = await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
        decision: 'REJECTED',
        reason: 'Insufficient supporting documentation provided.',
      });

      expect(result.evidence.verificationStatus).toBe('REJECTED');
    });

    it('3. NEEDS_INFORMATION keeps PENDING verificationStatus', async () => {
      const pending = mockEvidenceRow();
      const updated = mockEvidenceRow({
        verificationMetadata: {
          verificationMethod: 'SELF_ATTESTED',
          reviewRequired: true,
          auditTrail: [
            {
              at: new Date().toISOString(),
              actorId: REVIEWER_ID,
              action: 'EVIDENCE_REVIEW_NEEDS_INFORMATION',
            },
          ],
        },
      });
      const { service, prisma } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(updated),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        },
      });

      const result = await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
        decision: 'NEEDS_INFORMATION',
        requestedInformation: 'Upload employer verification letter for this role.',
      });

      expect(result.evidence.verificationStatus).toBe('PENDING');
      expect(prisma.evidenceRecord.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ verificationStatus: 'PENDING' }),
        }),
      );
    });

    it('4. NEEDS_INFORMATION sets reviewRequired in metadata merge', async () => {
      const pending = mockEvidenceRow();
      const { service, prisma } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi
              .fn()
              .mockResolvedValueOnce(pending)
              .mockResolvedValueOnce(
                mockEvidenceRow({
                  verificationMetadata: {
                    verificationMethod: 'SELF_ATTESTED',
                    reviewRequired: true,
                    auditTrail: [],
                  },
                }),
              ),
            updateMany: vi.fn().mockImplementation(({ data }) => {
              expect((data.verificationMetadata as Record<string, unknown>).reviewRequired).toBe(
                true,
              );
              return Promise.resolve({ count: 1 });
            }),
          },
        },
      });

      await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
        decision: 'NEEDS_INFORMATION',
        reason: 'Need clearer scope of personal contribution in this project.',
      });
      expect(prisma.evidenceRecord.updateMany).toHaveBeenCalled();
    });

    it('5. preserves existing verification metadata fields', async () => {
      const pending = mockEvidenceRow({
        verificationMetadata: {
          verificationMethod: 'DOCUMENT',
          linkedEvidenceIds: ['link-1'],
          contradictions: [],
        },
      });
      const { service, prisma } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi
              .fn()
              .mockResolvedValueOnce(pending)
              .mockResolvedValueOnce(mockEvidenceRow({ verificationStatus: 'VERIFIED' })),
            updateMany: vi.fn().mockImplementation(({ data }) => {
              const metadata = data.verificationMetadata as Record<string, unknown>;
              expect(metadata.linkedEvidenceIds).toEqual(['link-1']);
              expect(metadata.verificationMethod).toBe('DOCUMENT');
              return Promise.resolve({ count: 1 });
            }),
          },
        },
      });

      await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
        decision: 'ACCEPTED',
      });
      expect(prisma.evidenceRecord.updateMany).toHaveBeenCalled();
    });

    it('6. captures reason in auditTrail and audit event', async () => {
      const pending = mockEvidenceRow();
      const { service, auditPublisher, prisma } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi
              .fn()
              .mockResolvedValueOnce(pending)
              .mockResolvedValueOnce(mockEvidenceRow({ verificationStatus: 'REJECTED' })),
            updateMany: vi.fn().mockImplementation(({ data }) => {
              const metadata = data.verificationMetadata as {
                auditTrail: Array<{ note?: string }>;
              };
              expect(metadata.auditTrail.at(-1)?.note).toContain('does not meet institution bar');
              return Promise.resolve({ count: 1 });
            }),
          },
        },
      });

      await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
        decision: 'REJECTED',
        reason: 'Evidence does not meet institution bar for direct skill proof.',
      });

      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: REVIEWER_ID,
          action: 'evidence.updated',
          resourceType: 'evidence_record',
          resourceId: EVIDENCE_ID_1,
          metadata: expect.objectContaining({
            priorState: expect.objectContaining({ verificationStatus: 'PENDING' }),
            newState: expect.objectContaining({ verificationStatus: 'REJECTED' }),
            source: 'CANDIDATE',
            decision: 'REJECTED',
            institutionId: INST_ID_1,
            trigger: 'evidence_review',
          }),
        }),
      );
      expect(prisma.evidenceRecord.updateMany).toHaveBeenCalled();
    });

    it('7. unauthorized role cannot review', async () => {
      const { service } = buildService();
      const studentUser: RequestUser = { sub: 'student', role: 'STUDENT', inst: INST_ID_1 };
      await expect(
        service.reviewEvidence(studentUser, STUDENT_ID, EVIDENCE_ID_1, { decision: 'ACCEPTED' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('8. wrong institution reviewer rejected', async () => {
      const { service } = buildService({
        prisma: { user: { findUnique: vi.fn().mockResolvedValue(candidateUser) } },
      });
      const otherStaff: RequestUser = {
        sub: REVIEWER_ID,
        role: 'PLACEMENT_STAFF',
        inst: INST_ID_2,
      };
      await expect(
        service.reviewEvidence(otherStaff, STUDENT_ID, EVIDENCE_ID_1, { decision: 'ACCEPTED' }),
      ).rejects.toThrow('outside your institution');
    });

    it('9. COMPANY role cannot mutate evidence', async () => {
      const { service } = buildService({
        prisma: { user: { findUnique: vi.fn().mockResolvedValue(candidateUser) } },
      });
      const companyUser: RequestUser = {
        sub: 'company-user',
        role: 'COMPANY',
        inst: null,
        companyId: 'company-1',
      };
      await expect(
        service.reviewEvidence(companyUser, STUDENT_ID, EVIDENCE_ID_1, { decision: 'ACCEPTED' }),
      ).rejects.toThrow('Unauthorized role to review candidate evidence.');
    });

    it('10. evidence belonging to another student returns not found', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: { findFirst: vi.fn().mockResolvedValue(null) },
        },
      });
      await expect(
        service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, { decision: 'ACCEPTED' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('11. invalid decision fails validation', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: { findFirst: vi.fn().mockResolvedValue(mockEvidenceRow()) },
        },
      });
      await expect(
        service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
          decision: 'MAYBE' as never,
        }),
      ).rejects.toThrow();
    });

    it('12. missing required reason for REJECTED fails validation', async () => {
      const { service } = buildService();
      await expect(
        service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
          decision: 'REJECTED',
          reason: 'short',
        }),
      ).rejects.toThrow();
    });

    it('13. EXPIRED evidence cannot be reviewed', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi
              .fn()
              .mockResolvedValue(mockEvidenceRow({ verificationStatus: 'EXPIRED' })),
          },
        },
      });
      await expect(
        service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, { decision: 'ACCEPTED' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('14. REJECTED then ACCEPTED returns conflict', async () => {
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi
              .fn()
              .mockResolvedValue(mockEvidenceRow({ verificationStatus: 'REJECTED' })),
          },
        },
      });
      await expect(
        service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, { decision: 'ACCEPTED' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('15. repeated identical submission is idempotent without duplicate audit', async () => {
      const verified = mockEvidenceRow({
        verificationStatus: 'VERIFIED',
        verificationMetadata: {
          verificationMethod: 'HUMAN_REVIEW',
          verifiedBy: REVIEWER_ID,
          auditTrail: [
            {
              at: '2026-09-01T00:00:00.000Z',
              actorId: REVIEWER_ID,
              action: 'EVIDENCE_REVIEW_ACCEPTED',
            },
          ],
        },
      });
      const { service, auditPublisher, evidenceReconciliationQueue } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: { findFirst: vi.fn().mockResolvedValue(verified) },
        },
      });

      const result = await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
        decision: 'ACCEPTED',
      });

      expect(result.idempotent).toBe(true);
      expect(result.reconciliation.status).toBe('QUEUED');
      expect(auditPublisher.record).not.toHaveBeenCalled();
      expect(evidenceReconciliationQueue.getJob).toHaveBeenCalled();
      expect(evidenceReconciliationQueue.add).toHaveBeenCalledTimes(1);
    });

    it('15b. idempotent replay re-ensures queue after initial enqueue failure', async () => {
      const verified = mockEvidenceRow({
        verificationStatus: 'VERIFIED',
        verificationMetadata: {
          verificationMethod: 'HUMAN_REVIEW',
          verifiedBy: REVIEWER_ID,
          auditTrail: [
            {
              at: '2026-09-01T00:00:00.000Z',
              actorId: REVIEWER_ID,
              action: 'EVIDENCE_REVIEW_ACCEPTED',
            },
          ],
        },
      });
      const { service, auditPublisher, evidenceReconciliationQueue } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi.fn().mockResolvedValueOnce(verified).mockResolvedValueOnce(verified),
          },
        },
      });

      evidenceReconciliationQueue.getJob.mockResolvedValue(null);
      evidenceReconciliationQueue.add.mockRejectedValueOnce(new Error('redis unavailable'));

      const first = await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
        decision: 'ACCEPTED',
      });
      expect(first.idempotent).toBe(true);
      expect(first.reconciliation.status).toBe('FAILED');
      expect(auditPublisher.record).not.toHaveBeenCalled();

      evidenceReconciliationQueue.add.mockResolvedValueOnce({ id: 'reconcile-1' });
      const second = await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
        decision: 'ACCEPTED',
      });
      expect(second.idempotent).toBe(true);
      expect(second.reconciliation.status).toBe('QUEUED');
      expect(evidenceReconciliationQueue.add).toHaveBeenCalledTimes(2);
      expect(auditPublisher.record).not.toHaveBeenCalled();
    });

    it('16. conflicting repeated submission after transition returns conflict', async () => {
      const verified = mockEvidenceRow({
        verificationStatus: 'VERIFIED',
        verificationMetadata: {
          verificationMethod: 'HUMAN_REVIEW',
          auditTrail: [
            {
              at: '2026-09-01T00:00:00.000Z',
              actorId: REVIEWER_ID,
              action: 'EVIDENCE_REVIEW_ACCEPTED',
            },
          ],
        },
      });
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi.fn().mockResolvedValueOnce(verified).mockResolvedValueOnce(verified),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        },
      });

      await expect(
        service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
          decision: 'REJECTED',
          reason: 'New review decision conflicts with prior acceptance.',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('17. conditional update count 0 surfaces concurrent conflict', async () => {
      const pending = mockEvidenceRow();
      const otherReviewerAccepted = mockEvidenceRow({
        verificationStatus: 'VERIFIED',
        verificationMetadata: {
          auditTrail: [
            {
              at: '2026-09-01T00:00:00.000Z',
              actorId: 'other-reviewer',
              action: 'EVIDENCE_REVIEW_ACCEPTED',
            },
          ],
        },
      });
      const { service } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi
              .fn()
              .mockResolvedValueOnce(pending)
              .mockResolvedValueOnce(otherReviewerAccepted),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        },
      });

      await expect(
        service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, { decision: 'ACCEPTED' }),
      ).rejects.toThrow('another reviewer updated');
    });

    it('18. audit emitted exactly once on success', async () => {
      const pending = mockEvidenceRow();
      const { service, auditPublisher } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi
              .fn()
              .mockResolvedValueOnce(pending)
              .mockResolvedValueOnce(mockEvidenceRow({ verificationStatus: 'VERIFIED' })),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        },
      });

      await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, { decision: 'ACCEPTED' });
      expect(auditPublisher.record).toHaveBeenCalledTimes(1);
    });

    it('19. reconciliation enqueue exactly once on success', async () => {
      const pending = mockEvidenceRow();
      const { service, evidenceReconciliationQueue } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi
              .fn()
              .mockResolvedValueOnce(pending)
              .mockResolvedValueOnce(mockEvidenceRow({ verificationStatus: 'VERIFIED' })),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        },
      });

      await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, { decision: 'ACCEPTED' });
      expect(evidenceReconciliationQueue.add).toHaveBeenCalledTimes(1);
    });

    it('20. updateMany failure leaves state unchanged (no audit/enqueue)', async () => {
      const pending = mockEvidenceRow();
      const { service, auditPublisher, evidenceReconciliationQueue } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi.fn().mockResolvedValue(pending),
            updateMany: vi.fn().mockRejectedValue(new Error('db unavailable')),
          },
        },
      });

      await expect(
        service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, { decision: 'ACCEPTED' }),
      ).rejects.toThrow('db unavailable');
      expect(auditPublisher.record).not.toHaveBeenCalled();
      expect(evidenceReconciliationQueue.add).not.toHaveBeenCalled();
    });

    it('21. CAS success with enqueue failure returns recoverable FAILED reconciliation', async () => {
      const pending = mockEvidenceRow();
      const verified = mockEvidenceRow({ verificationStatus: 'VERIFIED' });
      const { service, auditPublisher, evidenceReconciliationQueue } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(verified),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        },
      });
      evidenceReconciliationQueue.add.mockRejectedValueOnce(new Error('redis unavailable'));

      const result = await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
        decision: 'ACCEPTED',
      });

      expect(result.idempotent).toBe(false);
      expect(result.reconciliation.status).toBe('FAILED');
      expect(auditPublisher.record).toHaveBeenCalledTimes(1);
    });

    it('22. VERIFIED to REJECTED transition is allowed', async () => {
      const verified = mockEvidenceRow({
        verificationStatus: 'VERIFIED',
        verificationMetadata: {
          verificationMethod: 'HUMAN_REVIEW',
          verifiedBy: REVIEWER_ID,
          auditTrail: [
            {
              at: '2026-09-01T00:00:00.000Z',
              actorId: REVIEWER_ID,
              action: 'EVIDENCE_REVIEW_ACCEPTED',
            },
          ],
        },
      });
      const rejected = mockEvidenceRow({ verificationStatus: 'REJECTED' });
      const { service, prisma } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: {
            findFirst: vi.fn().mockResolvedValueOnce(verified).mockResolvedValueOnce(rejected),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        },
      });

      const result = await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
        decision: 'REJECTED',
        reason: 'Overturning prior acceptance after new contradictory evidence.',
      });

      expect(result.evidence.verificationStatus).toBe('REJECTED');
      expect(prisma.evidenceRecord.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ verificationStatus: 'VERIFIED' }),
          data: expect.objectContaining({ verificationStatus: 'REJECTED' }),
        }),
      );
    });

    it('23. unrelated auditTrail entries do not break reviewer idempotency detection', async () => {
      const verified = mockEvidenceRow({
        verificationStatus: 'VERIFIED',
        verificationMetadata: {
          verificationMethod: 'HUMAN_REVIEW',
          verifiedBy: REVIEWER_ID,
          auditTrail: [
            {
              at: '2026-08-01T00:00:00.000Z',
              actorId: REVIEWER_ID,
              action: 'EVIDENCE_REVIEW_ACCEPTED',
            },
            {
              at: '2026-09-01T00:00:00.000Z',
              actorId: null,
              action: 'SYSTEM_SYNC',
              note: 'Unrelated downstream sync marker',
            },
          ],
        },
      });
      const { service, auditPublisher } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: { findFirst: vi.fn().mockResolvedValue(verified) },
        },
      });

      const result = await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
        decision: 'ACCEPTED',
      });

      expect(result.idempotent).toBe(true);
      expect(auditPublisher.record).not.toHaveBeenCalled();
    });

    it('24. idempotent replay does not duplicate queue when job already exists', async () => {
      const verified = mockEvidenceRow({
        verificationStatus: 'VERIFIED',
        verificationMetadata: {
          auditTrail: [
            {
              at: '2026-09-01T00:00:00.000Z',
              actorId: REVIEWER_ID,
              action: 'EVIDENCE_REVIEW_ACCEPTED',
            },
          ],
        },
      });
      const existingJob = { getState: vi.fn().mockResolvedValue('waiting'), retry: vi.fn() };
      const { service, evidenceReconciliationQueue } = buildService({
        prisma: {
          user: { findUnique: vi.fn().mockResolvedValue(candidateUser) },
          evidenceRecord: { findFirst: vi.fn().mockResolvedValue(verified) },
        },
      });
      evidenceReconciliationQueue.getJob.mockResolvedValue(existingJob);

      const result = await service.reviewEvidence(staffUser, STUDENT_ID, EVIDENCE_ID_1, {
        decision: 'ACCEPTED',
      });

      expect(result.idempotent).toBe(true);
      expect(result.reconciliation.status).toBe('QUEUED');
      expect(evidenceReconciliationQueue.add).not.toHaveBeenCalled();
    });
  });
});
