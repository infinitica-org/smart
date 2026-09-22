import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
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
});
