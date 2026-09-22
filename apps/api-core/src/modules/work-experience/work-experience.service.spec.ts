import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import {
  WorkExperienceService,
  extractDomain,
  validateEmployerDomain,
} from './work-experience.service.js';
import { parseStoredDocumentAuthenticity } from './work-experience-document-authenticity.util.js';
import {
  assertStudentControlledProofFileUrl,
  InvalidStudentProofFileUrlError,
} from './work-experience-proof-url.util.js';

describe('WorkExperienceService', () => {
  let prisma: any;
  let auditPublisher: any;
  let aiGateway: any;
  let publicProfileService: any;
  let evidenceSync: any;
  let storage: any;
  let emailQueue: any;
  let service: WorkExperienceService;

  const mockStudentId = randomUUID();

  const OFFER_DOC = {
    documentType: 'OFFER_LETTER',
    fileUrl: 'storage/proofs/offer.pdf',
    fileName: 'offer.pdf',
    fileSizeBytes: 1024,
    mimeType: 'application/pdf',
  };

  const RELIEVING_DOC = {
    documentType: 'RELIEVING_LETTER',
    fileUrl: 'storage/proofs/relieving.pdf',
    fileName: 'relieving.pdf',
    fileSizeBytes: 1024,
    mimeType: 'application/pdf',
  };

  function buildValidCreatePayload(overrides: Record<string, unknown> = {}) {
    return {
      companyName: 'Acme Corp',
      role: 'Senior Developer',
      employmentType: 'FULL_TIME',
      startDate: '2022-01-01T00:00:00.000Z',
      isCurrent: true,
      domain: 'Software Engineering',
      responsibilities: 'Built and maintained backend services.',
      skillsClaimed: ['GITOPS_CONTINUOUS_DELIVERY', 'SQL_QUERY_OPTIMIZATION'],
      documents: [OFFER_DOC],
      ...overrides,
    };
  }

  function buildCompleteExpRecord(overrides: Record<string, unknown> = {}) {
    return {
      companyName: 'Acme Corp',
      role: 'Senior Software Engineer',
      employmentType: 'FULL_TIME',
      startDate: new Date('2022-01-01'),
      endDate: new Date('2023-01-01'),
      isCurrent: false,
      domain: 'Software Engineering',
      responsibilities: 'Built and maintained backend services.',
      skills: ['SQL_QUERY_OPTIMIZATION'],
      companyWebsite: 'https://acme.com',
      companyLinkedinUrl: 'https://linkedin.com/company/acme',
      companyId: null,
      documents: [{ documentType: 'OFFER_LETTER' }, { documentType: 'EXPERIENCE_LETTER' }],
      ...overrides,
    };
  }

  beforeEach(() => {
    emailQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    };

    prisma = {
      workExperience: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      workExperienceDocument: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      workExperienceVerificationAttempt: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      workExperienceManagerEndorsement: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      workExperienceResponsibility: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockImplementation(async ({ data }: any) => ({
          id: randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        })),
        findMany: vi.fn().mockResolvedValue([]),
      },
      organization: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      company: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: mockStudentId,
          fullName: 'John Doe',
        }),
      },
      $transaction: vi.fn().mockImplementation(async (promises) => Promise.all(promises)),
    };

    auditPublisher = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    aiGateway = {
      complete: vi.fn(),
    };

    publicProfileService = {
      recheckActivationAfterVoid: vi.fn().mockResolvedValue(undefined),
    };

    evidenceSync = {
      syncWorkExperienceEvidenceRecord: vi.fn().mockResolvedValue(undefined),
    };

    storage = {
      upload: vi.fn().mockResolvedValue('work-experience-proofs/student/uuid-offer.pdf'),
    };

    service = new WorkExperienceService(
      prisma,
      auditPublisher,
      aiGateway,
      emailQueue,
      undefined,
      publicProfileService,
      evidenceSync,
      storage,
    );
  });

  describe('create', () => {
    it('creates an ongoing work experience record with offer letter and publishes audit event', async () => {
      const payload = buildValidCreatePayload({
        companyWebsite: 'https://acme.com',
        companyLinkedinUrl: 'https://linkedin.com/company/acme',
      });

      const experienceId = randomUUID();
      const mockCreated = {
        id: experienceId,
        studentId: mockStudentId,
        companyId: null,
        companyName: payload.companyName,
        companyWebsite: payload.companyWebsite,
        companyLinkedinUrl: null,
        role: payload.role,
        employmentType: payload.employmentType,
        department: null,
        domain: payload.domain,
        workLocation: null,
        startDate: new Date(payload.startDate),
        endDate: null,
        isCurrent: true,
        responsibilities: payload.responsibilities,
        skills: payload.skillsClaimed,
        projects: null,
        candidateLinkedin: null,
        verifierName: null,
        verifierEmail: null,
        verifierDesignation: null,
        verifierPhone: null,
        status: 'SUBMITTED',
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: payload.documents.map((doc) => ({
          ...doc,
          id: randomUUID(),
          experienceId,
          createdAt: new Date(),
        })),
      };

      prisma.organization.findFirst.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue({
        id: 'org-uuid-1',
        name: 'Acme Corp',
        domain: 'acme.com',
        verificationStatus: 'PENDING',
      });
      prisma.company.findFirst.mockResolvedValue(null);
      prisma.workExperience.create.mockResolvedValueOnce(mockCreated);

      const result = await service.create(mockStudentId, payload);

      expect(result.companyName).toBe('Acme Corp');
      expect(result.status).toBe('SUBMITTED');
      expect(result.skillsClaimed).toEqual(payload.skillsClaimed);
      expect(result.skillsClaimedSnapshot).toBeNull();
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockStudentId,
          action: 'WORK_EXPERIENCE_SUBMITTED',
          resourceType: 'WorkExperience',
          resourceId: mockCreated.id,
        }),
      );
    });

    it('creates an ended work experience record when both offer letter and completion/relieving letter are provided', async () => {
      const payload = buildValidCreatePayload({
        companyName: 'Beta Corp',
        role: 'Developer',
        startDate: '2021-01-01T00:00:00.000Z',
        endDate: '2022-01-01T00:00:00.000Z',
        isCurrent: false,
        documents: [OFFER_DOC, RELIEVING_DOC],
      });

      prisma.organization.findFirst.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue({ id: 'org-2', name: 'Beta Corp' });
      prisma.company.findFirst.mockResolvedValue(null);
      const experienceId = randomUUID();
      prisma.workExperience.create.mockResolvedValueOnce({
        id: experienceId,
        studentId: mockStudentId,
        companyName: 'Beta Corp',
        role: 'Developer',
        employmentType: 'FULL_TIME',
        department: null,
        domain: payload.domain,
        workLocation: null,
        responsibilities: payload.responsibilities,
        startDate: new Date('2021-01-01'),
        endDate: new Date('2022-01-01'),
        isCurrent: false,
        status: 'SUBMITTED',
        skills: payload.skillsClaimed,
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: payload.documents.map((doc) => ({
          ...doc,
          id: randomUUID(),
          experienceId,
          createdAt: new Date(),
        })),
        structuredResponsibilities: [],
      });

      const result = await service.create(mockStudentId, payload);
      expect(result.companyName).toBe('Beta Corp');
    });

    it('allows draft create without proof documents (letter rules enforced at verification)', async () => {
      const payload = buildValidCreatePayload({ documents: [] });
      const experienceId = randomUUID();

      prisma.organization.findFirst.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue({
        id: 'org-draft',
        name: 'Acme Corp',
        domain: 'acme.com',
        verificationStatus: 'PENDING',
      });
      prisma.company.findFirst.mockResolvedValue(null);
      prisma.workExperience.create.mockResolvedValueOnce({
        id: experienceId,
        studentId: mockStudentId,
        companyName: payload.companyName,
        role: payload.role,
        employmentType: payload.employmentType,
        department: null,
        domain: payload.domain,
        workLocation: null,
        responsibilities: payload.responsibilities,
        startDate: new Date(payload.startDate),
        endDate: null,
        isCurrent: true,
        status: 'SUBMITTED',
        skills: payload.skillsClaimed,
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: [],
        structuredResponsibilities: [],
      });
      prisma.workExperience.findUnique.mockResolvedValueOnce({
        id: experienceId,
        studentId: mockStudentId,
        companyName: payload.companyName,
        role: payload.role,
        employmentType: payload.employmentType,
        department: null,
        domain: payload.domain,
        workLocation: null,
        responsibilities: payload.responsibilities,
        startDate: new Date(payload.startDate),
        endDate: null,
        isCurrent: true,
        status: 'SUBMITTED',
        skills: payload.skillsClaimed,
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: [],
        structuredResponsibilities: [],
      });

      const result = await service.create(mockStudentId, payload);
      expect(result.id).toBe(experienceId);
    });

    it('rejects creating ended role without offer letter', async () => {
      const payload = buildValidCreatePayload({
        endDate: '2023-01-01T00:00:00.000Z',
        isCurrent: false,
        documents: [
          {
            documentType: 'RELIEVING_LETTER',
            fileUrl: 'url',
            fileName: 'file.pdf',
            fileSizeBytes: 100,
            mimeType: 'application/pdf',
          },
        ],
      });

      await expect(service.create(mockStudentId, payload)).rejects.toThrow(BadRequestException);
    });

    it('rejects creating ended role without completion/relieving letter', async () => {
      const payload = buildValidCreatePayload({
        endDate: '2023-01-01T00:00:00.000Z',
        isCurrent: false,
        documents: [OFFER_DOC],
      });

      await expect(service.create(mockStudentId, payload)).rejects.toThrow(BadRequestException);
    });
    it('rejects free-text skillsClaimed values outside the taxonomy', async () => {
      await expect(
        service.create(mockStudentId, buildValidCreatePayload({ skillsClaimed: ['TypeScript'] })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects invalid payload without start date or end date when not current', async () => {
      const payload = buildValidCreatePayload({
        isCurrent: false,
        endDate: undefined,
        documents: [OFFER_DOC, RELIEVING_DOC],
      });
      delete (payload as { endDate?: string }).endDate;

      await expect(service.create(mockStudentId, payload)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('evidence metadata integration', () => {
    it('persists structured metadata on create and syncs evidence record', async () => {
      const payload = buildValidCreatePayload({
        deliverables: ['Auth microservice v2'],
        personalContributions: [
          {
            whatWasDone: 'Designed OAuth2 flow',
            personalContribution: 'Owned auth module rollout',
            responsibilityLevel: 'OWNED',
          },
        ],
        structuredResponsibilities: [
          {
            task: 'Owned auth service',
            personalContribution: 'Designed OAuth2 flow',
            responsibilityLevel: 'OWNED',
            skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
          },
        ],
      });
      const experienceId = randomUUID();
      const mockCreated = {
        id: experienceId,
        studentId: mockStudentId,
        companyId: null,
        companyName: payload.companyName,
        companyWebsite: null,
        companyLinkedinUrl: null,
        role: payload.role,
        employmentType: payload.employmentType,
        department: null,
        domain: payload.domain,
        workLocation: null,
        startDate: new Date(payload.startDate),
        endDate: null,
        isCurrent: true,
        responsibilities: payload.responsibilities,
        skills: payload.skillsClaimed,
        projects: null,
        candidateLinkedin: null,
        verifierName: null,
        verifierEmail: null,
        verifierDesignation: null,
        verifierPhone: null,
        status: 'SUBMITTED',
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliverablesStructured: payload.deliverables,
        personalContributions: payload.personalContributions,
        documents: payload.documents.map((doc) => ({
          ...doc,
          id: randomUUID(),
          experienceId,
          createdAt: new Date(),
        })),
        structuredResponsibilities: [],
      };

      prisma.organization.findFirst.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue({
        id: 'org-evidence',
        name: 'Acme Corp',
        domain: 'acme.com',
        verificationStatus: 'PENDING',
      });
      prisma.company.findFirst.mockResolvedValue(null);
      prisma.workExperience.create.mockResolvedValueOnce(mockCreated);

      const result = await service.create(mockStudentId, payload);

      const createArgs = prisma.workExperience.create.mock.calls[0][0];
      expect(createArgs.data.deliverablesStructured).toEqual(payload.deliverables);
      expect(createArgs.data.personalContributions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            whatWasDone: 'Designed OAuth2 flow',
            personalContribution: 'Owned auth module rollout',
            responsibilityLevel: 'OWNED',
          }),
        ]),
      );
      expect(prisma.workExperienceResponsibility.create).toHaveBeenCalled();
      expect(evidenceSync.syncWorkExperienceEvidenceRecord).toHaveBeenCalledTimes(1);
      const [, syncedExperienceId, syncOverrides] =
        evidenceSync.syncWorkExperienceEvidenceRecord.mock.calls[0];
      expect(syncedExperienceId).toBe(experienceId);
      expect(syncOverrides.deliverables).toEqual(payload.deliverables);
      expect(syncOverrides.structuredResponsibilities?.[0]?.task).toBe('Owned auth service');
      expect(result.evidence?.employer).toBe('Acme Corp');
    });

    it('replaceStructuredResponsibilities replaces rows and re-syncs evidence', async () => {
      const experienceId = randomUUID();
      const existing = {
        id: experienceId,
        studentId: mockStudentId,
        companyName: 'Acme Corp',
        companyWebsite: null,
        companyLinkedinUrl: null,
        role: 'Developer',
        employmentType: 'FULL_TIME',
        department: null,
        domain: 'Software Engineering',
        workLocation: null,
        startDate: new Date('2022-01-01'),
        endDate: null,
        isCurrent: true,
        responsibilities: 'Built APIs.',
        skills: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
        projects: null,
        candidateLinkedin: null,
        verifierName: null,
        verifierEmail: null,
        verifierDesignation: null,
        verifierPhone: null,
        status: 'SUBMITTED',
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: [
          {
            ...OFFER_DOC,
            id: randomUUID(),
            experienceId,
            createdAt: new Date(),
          },
        ],
        structuredResponsibilities: [],
      };
      const replacement = [
        {
          task: 'Owned auth service',
          personalContribution: 'Designed OAuth2 flow',
          responsibilityLevel: 'OWNED',
          skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        },
      ];

      prisma.workExperience.findUnique.mockResolvedValue(existing);
      prisma.workExperienceResponsibility.findMany.mockResolvedValueOnce([
        {
          id: randomUUID(),
          experienceId,
          task: replacement[0].task,
          skillCode: replacement[0].skillCode,
          personalContribution: replacement[0].personalContribution,
          responsibilityLevel: replacement[0].responsibilityLevel,
          independence: null,
          tools: [],
          decision: null,
          constraintText: null,
          outcome: null,
          artifactId: null,
          activity: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.replaceStructuredResponsibilities(
        mockStudentId,
        experienceId,
        replacement,
      );

      expect(prisma.workExperienceResponsibility.deleteMany).toHaveBeenCalledWith({
        where: { experienceId },
      });
      expect(evidenceSync.syncWorkExperienceEvidenceRecord).toHaveBeenCalledTimes(1);
      const [, syncedExperienceId, syncOverrides] =
        evidenceSync.syncWorkExperienceEvidenceRecord.mock.calls[0];
      expect(syncedExperienceId).toBe(experienceId);
      expect(syncOverrides.structuredResponsibilities?.[0]?.task).toBe('Owned auth service');
      expect(result).toHaveLength(1);
      expect(result[0].task).toBe('Owned auth service');
    });
  });

  describe('update', () => {
    const expId = randomUUID();

    it('rejects skillsClaimed edits on a verified entry', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce({
        id: expId,
        studentId: mockStudentId,
        companyName: 'Acme Corp',
        companyWebsite: null,
        companyLinkedinUrl: null,
        role: 'Developer',
        employmentType: 'FULL_TIME',
        department: null,
        domain: 'Software Engineering',
        workLocation: null,
        startDate: new Date('2022-01-01'),
        endDate: null,
        isCurrent: true,
        responsibilities: 'Built and maintained backend services.',
        skills: ['SQL_QUERY_OPTIMIZATION'],
        projects: null,
        candidateLinkedin: null,
        verifierName: null,
        verifierEmail: null,
        verifierDesignation: null,
        verifierPhone: null,
        status: 'VERIFIED',
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: [OFFER_DOC],
      });

      await expect(
        service.update(mockStudentId, expId, {
          skillsClaimed: ['RELATIONAL_DATABASE_DESIGN_ADMINISTRATION'],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('S6-VB-01 mandatory field enforcement (api-core)', () => {
    const expId = randomUUID();

    function mockCompleteExisting(overrides: Record<string, unknown> = {}) {
      return {
        id: expId,
        studentId: mockStudentId,
        ...buildCompleteExpRecord(),
        projects: null,
        candidateLinkedin: null,
        verifierName: null,
        verifierEmail: 'manager@acme.com',
        verifierDesignation: null,
        verifierPhone: null,
        status: 'SUBMITTED',
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: [OFFER_DOC, RELIEVING_DOC],
        student: { fullName: 'John Doe' },
        organization: { domain: 'acme.com' },
        ...overrides,
      };
    }

    it('create rejects missing domain', async () => {
      await expect(
        service.create(mockStudentId, buildValidCreatePayload({ domain: '' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('create rejects empty responsibilities', async () => {
      await expect(
        service.create(mockStudentId, buildValidCreatePayload({ responsibilities: '' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('create rejects empty skillsClaimed', async () => {
      await expect(
        service.create(mockStudentId, buildValidCreatePayload({ skillsClaimed: [] })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('update rejects clearing domain', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(mockCompleteExisting());
      await expect(service.update(mockStudentId, expId, { domain: '' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('update rejects clearing responsibilities', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(mockCompleteExisting());
      await expect(
        service.update(mockStudentId, expId, { responsibilities: '' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('update rejects empty skillsClaimed', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(mockCompleteExisting());
      await expect(
        service.update(mockStudentId, expId, { skillsClaimed: [] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('validateProofDocument rejects incomplete claims before OCR', async () => {
      const docId = randomUUID();
      prisma.workExperience.findUnique.mockResolvedValueOnce(
        mockCompleteExisting({
          domain: null,
          documents: [
            {
              id: docId,
              experienceId: expId,
              documentType: 'EXPERIENCE_LETTER',
              fileName: 'exp.pdf',
              mimeType: 'application/pdf',
              fileUrl: 'data:application/pdf;base64,cHJvb2Y=',
              fileSizeBytes: 100,
              createdAt: new Date(),
            },
          ],
        }),
      );

      await expect(
        service.validateProofDocument(mockStudentId, expId, docId),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(aiGateway.complete).not.toHaveBeenCalled();
    });

    it('sendEmployerVerification rejects incomplete claims', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(
        mockCompleteExisting({
          domain: null,
          verifierEmail: 'manager@acme.com',
        }),
      );

      await expect(service.sendEmployerVerification(mockStudentId, expId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('restartEmployerVerification rejects incomplete claims', async () => {
      const incompleteExp = mockCompleteExisting({
        responsibilities: null,
        verifierEmail: 'manager@acme.com',
      });
      prisma.workExperience.findUnique
        .mockResolvedValueOnce(incompleteExp)
        .mockResolvedValueOnce(incompleteExp);

      await expect(
        service.restartEmployerVerification(mockStudentId, expId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('sendManagerEndorsement rejects incomplete claims', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(
        mockCompleteExisting({
          skills: [],
          documents: [{ documentType: 'OFFER_LETTER', validationResult: null }],
        }),
      );

      await expect(
        service.sendManagerEndorsement(mockStudentId, expId, {
          managerEmail: 'manager@acme.com',
          managerName: 'Jane Smith',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('valid complete work experience continues through existing downstream flows', async () => {
      const completeExp = mockCompleteExisting({
        isCurrent: true,
        endDate: null,
        documents: [OFFER_DOC],
      });
      prisma.workExperience.findUnique.mockResolvedValueOnce(completeExp);
      prisma.workExperienceVerificationAttempt.create.mockResolvedValueOnce({
        id: randomUUID(),
        experienceId: expId,
      });
      prisma.workExperience.update.mockResolvedValueOnce({
        ...completeExp,
        status: 'PENDING_EMPLOYER',
      });

      const sent = await service.sendEmployerVerification(mockStudentId, expId);
      expect(sent.status).toBe('PENDING_EMPLOYER');
    });
  });

  describe('listForStudent', () => {
    it('returns list of student work experiences', async () => {
      const expId = randomUUID();
      prisma.workExperience.findMany.mockResolvedValueOnce([
        {
          id: expId,
          studentId: mockStudentId,
          companyId: null,
          companyName: 'Tech Corp',
          companyWebsite: null,
          companyLinkedinUrl: null,
          role: 'Backend Engineer',
          employmentType: 'FULL_TIME',
          department: null,
          domain: null,
          workLocation: null,
          startDate: new Date('2021-01-01'),
          endDate: new Date('2022-01-01'),
          isCurrent: false,
          responsibilities: null,
          skills: [],
          projects: null,
          candidateLinkedin: null,
          verifierName: null,
          verifierEmail: null,
          verifierDesignation: null,
          verifierPhone: null,
          status: 'SUBMITTED',
          rejectionReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          documents: [],
        },
      ]);

      const result = await service.listForStudent(mockStudentId);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('Backend Engineer');
    });

    it('includes skillsClaimedSnapshot on verified entries', async () => {
      const expId = randomUUID();
      prisma.workExperience.findMany.mockResolvedValueOnce([
        {
          id: expId,
          studentId: mockStudentId,
          companyId: null,
          companyName: 'Tech Corp',
          companyWebsite: null,
          companyLinkedinUrl: null,
          role: 'Backend Engineer',
          employmentType: 'FULL_TIME',
          department: null,
          domain: null,
          workLocation: null,
          startDate: new Date('2021-01-01'),
          endDate: new Date('2022-01-01'),
          isCurrent: false,
          responsibilities: null,
          skills: ['SQL_QUERY_OPTIMIZATION'],
          projects: null,
          candidateLinkedin: null,
          verifierName: null,
          verifierEmail: null,
          verifierDesignation: null,
          verifierPhone: null,
          status: 'VERIFIED',
          rejectionReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          documents: [],
        },
      ]);

      const result = await service.listForStudent(mockStudentId);
      expect(result[0]?.skillsClaimedSnapshot).toEqual({
        taxonomyVersion: 'skill@1',
        skillCodes: ['SQL_QUERY_OPTIMIZATION'],
      });
    });
  });

  describe('attachDocument', () => {
    it('attaches proof document and runs letter authenticity check', async () => {
      const expId = randomUUID();
      const docId = randomUUID();
      const letterText =
        'Acme Corporation letterhead. Jane Doe served as Engineer. Signed by HR Manager.';
      const dataUri = `data:text/plain;base64,${Buffer.from(letterText).toString('base64')}`;

      prisma.workExperience.findUnique.mockResolvedValueOnce({
        id: expId,
        studentId: mockStudentId,
        companyName: 'Acme Corporation',
        companyWebsite: 'https://acme.com',
      });

      prisma.workExperienceDocument.create.mockResolvedValueOnce({
        id: docId,
        experienceId: expId,
        documentType: 'EXPERIENCE_LETTER',
        fileUrl: dataUri,
        fileName: 'letter.pdf',
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
        validationResult: null,
        createdAt: new Date(),
      });

      prisma.workExperienceDocument.findUnique.mockResolvedValueOnce({
        id: docId,
        experienceId: expId,
        documentType: 'EXPERIENCE_LETTER',
        fileUrl: dataUri,
        fileName: 'letter.pdf',
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
        validationResult: null,
        createdAt: new Date(),
      });

      aiGateway.complete.mockResolvedValueOnce({
        output: {
          candidateName: 'Jane Doe',
          companyName: 'Acme Corporation',
          companyDomain: 'acme.com',
          hasLetterhead: true,
          hasSignatureBlock: true,
          confidence: 0.93,
        },
      });

      prisma.workExperienceDocument.update.mockResolvedValueOnce({
        id: docId,
        experienceId: expId,
        documentType: 'EXPERIENCE_LETTER',
        fileUrl: dataUri,
        fileName: 'letter.pdf',
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
        validationResult: {
          authenticity: {
            status: 'doc_ok',
            result: {
              companyNameMatch: true,
              domainMatch: true,
              hasLetterhead: true,
              hasSignatureBlock: true,
              ocrConfidence: 0.93,
              flagReasons: [],
            },
            checkedAt: '2026-09-10T00:00:00.000Z',
          },
        },
        createdAt: new Date(),
      });

      const result = await service.attachDocument(mockStudentId, expId, {
        documentType: 'EXPERIENCE_LETTER',
        fileUrl: dataUri,
        fileName: 'letter.pdf',
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
      });

      expect(result.id).toBe(docId);
      expect(result.authenticityStatus).toBe('doc_ok');
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'WORK_EXPERIENCE_DOCUMENT_ATTACHED',
          resourceType: 'WorkExperienceDocument',
          resourceId: docId,
        }),
      );
    });

    it('rejects remote HTTP(S) proof file URLs before persistence', async () => {
      const expId = randomUUID();
      prisma.workExperience.findUnique.mockResolvedValueOnce({
        id: expId,
        studentId: mockStudentId,
        companyName: 'Acme Corporation',
        companyWebsite: 'https://acme.com',
      });

      await expect(
        service.attachDocument(mockStudentId, expId, {
          documentType: 'OFFER_LETTER',
          fileUrl: 'https://169.254.169.254/latest/meta-data/',
          fileName: 'offer.pdf',
          fileSizeBytes: 2048,
          mimeType: 'application/pdf',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.workExperienceDocument.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if experience entry does not exist or belong to student', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.attachDocument(mockStudentId, randomUUID(), {
          documentType: 'PAYSLIP',
          fileUrl: 'url',
          fileName: 'file.pdf',
          fileSizeBytes: 100,
          mimeType: 'application/pdf',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('uploadProofDocument', () => {
    it('uploads file to object storage then attaches document metadata', async () => {
      const expId = randomUUID();
      const docId = randomUUID();

      prisma.workExperience.findUnique.mockResolvedValue({
        id: expId,
        studentId: mockStudentId,
        companyName: 'Acme Corporation',
        companyWebsite: 'https://acme.com',
      });

      prisma.workExperienceDocument.create.mockResolvedValueOnce({
        id: docId,
        experienceId: expId,
        documentType: 'OFFER_LETTER',
        fileUrl: 'work-experience-proofs/student/uuid-offer.pdf',
        fileName: 'offer.pdf',
        fileSizeBytes: 128,
        mimeType: 'application/pdf',
        validationResult: null,
        createdAt: new Date(),
      });

      prisma.workExperienceDocument.findUnique.mockResolvedValueOnce({
        id: docId,
        experienceId: expId,
        documentType: 'OFFER_LETTER',
        fileUrl: 'work-experience-proofs/student/uuid-offer.pdf',
        fileName: 'offer.pdf',
        fileSizeBytes: 128,
        mimeType: 'application/pdf',
        validationResult: null,
        createdAt: new Date(),
      });

      aiGateway.complete.mockResolvedValueOnce({
        output: {
          candidateName: 'Jane Doe',
          companyName: 'Acme Corporation',
          companyDomain: 'acme.com',
          hasLetterhead: true,
          hasSignatureBlock: true,
          confidence: 0.9,
        },
      });

      prisma.workExperienceDocument.update.mockResolvedValueOnce({
        id: docId,
        experienceId: expId,
        documentType: 'OFFER_LETTER',
        fileUrl: 'work-experience-proofs/student/uuid-offer.pdf',
        fileName: 'offer.pdf',
        fileSizeBytes: 128,
        mimeType: 'application/pdf',
        validationResult: {
          authenticity: {
            status: 'doc_ok',
            result: {
              companyNameMatch: true,
              domainMatch: true,
              hasLetterhead: true,
              hasSignatureBlock: true,
              ocrConfidence: 0.9,
              flagReasons: [],
            },
            checkedAt: '2026-09-10T00:00:00.000Z',
          },
        },
        createdAt: new Date(),
      });

      const result = await service.uploadProofDocument(
        mockStudentId,
        expId,
        {
          buffer: Buffer.from('Offer letter body for Jane Doe at Acme.'),
          fileName: 'offer.pdf',
          mimeType: 'application/pdf',
        },
        'OFFER_LETTER',
      );

      expect(storage.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          namespace: `work-experience-proofs/${mockStudentId}`,
          fileName: 'offer.pdf',
        }),
      );
      expect(result.fileUrl).toBe('work-experience-proofs/student/uuid-offer.pdf');
    });
  });

  describe('validateProofDocument', () => {
    const expId = randomUUID();
    const docId = randomUUID();

    const sampleProofText =
      'EXPERIENCE CERTIFICATE: Candidate John Doe worked at Acme Corporation as Senior Software Engineer from 2022-01-01 to 2023-01-01.';
    const sampleDataUri = `data:application/pdf;base64,${Buffer.from(sampleProofText).toString('base64')}`;

    const mockExpRecord = {
      id: expId,
      studentId: mockStudentId,
      ...buildCompleteExpRecord(),
      status: 'SUBMITTED',
      documents: [
        {
          id: randomUUID(),
          experienceId: expId,
          documentType: 'OFFER_LETTER',
          fileName: 'offer.pdf',
          mimeType: 'application/pdf',
          fileUrl: 'storage/offer.pdf',
          fileSizeBytes: 1024,
          createdAt: new Date(),
        },
        {
          id: docId,
          experienceId: expId,
          documentType: 'EXPERIENCE_LETTER',
          fileName: 'Acme_Experience_Letter.pdf',
          mimeType: 'application/pdf',
          fileUrl: sampleDataUri,
          fileSizeBytes: 1024,
          createdAt: new Date(),
        },
      ],
    };

    it('validates a genuine Experience Letter and retains SUBMITTED experience status', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(mockExpRecord);
      prisma.workExperienceDocument.update.mockResolvedValueOnce({});

      aiGateway.complete.mockResolvedValueOnce({
        output: {
          documentType: 'EXPERIENCE_LETTER',
          isActualEmploymentProof: true,
          candidateName: 'John Doe',
          companyName: 'Acme Corporation Pvt Ltd',
          role: 'Software Engineer',
          startDate: '2022-01-01',
          endDate: '2023-01-01',
          confidence: 0.95,
        },
      });

      const result = await service.validateProofDocument(mockStudentId, expId, docId);

      expect(result.validationResult.validationStatus).toBe('VALIDATED');
      expect(result.experienceStatus).toBe('SUBMITTED'); // MUST NOT BE VERIFIED
      expect(result.validationResult.isOfferLetter).toBe(false);
      expect(result.validationResult.matchResult.companyNameMatch).toBe(true);
      expect(result.validationResult.matchResult.candidateNameMatch).toBe(true);
      expect(prisma.workExperience.update).not.toHaveBeenCalled();
    });

    it('rejects OFFER_LETTER attachment as INVALID_DOCUMENT_TYPE without invoking AI', async () => {
      const offerDocRecord = {
        ...mockExpRecord,
        ...buildCompleteExpRecord({ isCurrent: true, endDate: null }),
        documents: [{ ...mockExpRecord.documents[0], id: docId, documentType: 'OFFER_LETTER' }],
      };
      prisma.workExperience.findUnique.mockResolvedValueOnce(offerDocRecord);
      prisma.workExperienceDocument.update.mockResolvedValueOnce({});

      const result = await service.validateProofDocument(mockStudentId, expId, docId);

      expect(aiGateway.complete).not.toHaveBeenCalled();
      expect(result.validationResult.validationStatus).toBe('REJECTED');
      expect(result.validationResult.reasonCode).toBe('INVALID_DOCUMENT_TYPE');
      expect(result.experienceStatus).toBe('SUBMITTED');
      expect(prisma.workExperience.update).not.toHaveBeenCalled();
    });

    it('rejects AI-classified offer letter as INVALID_DOCUMENT_TYPE without voiding experience', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(mockExpRecord);
      prisma.workExperienceDocument.update.mockResolvedValueOnce({});

      aiGateway.complete.mockResolvedValueOnce({
        output: {
          documentType: 'OFFER_LETTER',
          isActualEmploymentProof: true,
          candidateName: 'John Doe',
          companyName: 'Acme Corporation',
          role: 'Senior Software Engineer',
          startDate: '2022-01-01',
          endDate: null,
          confidence: 0.98,
        },
      });

      const result = await service.validateProofDocument(mockStudentId, expId, docId);

      expect(result.validationResult.validationStatus).toBe('REJECTED');
      expect(result.validationResult.reasonCode).toBe('INVALID_DOCUMENT_TYPE');
      expect(result.experienceStatus).toBe('SUBMITTED');
      expect(prisma.workExperience.update).not.toHaveBeenCalled();
    });

    it('rejects validation when document company name does not match submitted claim', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(mockExpRecord);
      prisma.workExperienceDocument.update.mockResolvedValueOnce({});
      prisma.workExperience.update.mockResolvedValueOnce({
        ...mockExpRecord,
        status: 'REJECTED',
      });

      aiGateway.complete.mockResolvedValueOnce({
        output: {
          documentType: 'EXPERIENCE_LETTER',
          isActualEmploymentProof: true,
          candidateName: 'John Doe',
          companyName: 'Unrelated Global Corp',
          role: 'Senior Software Engineer',
          startDate: '2022-01-01',
          endDate: '2023-01-01',
          confidence: 0.9,
        },
      });

      const result = await service.validateProofDocument(mockStudentId, expId, docId);

      expect(result.validationResult.validationStatus).toBe('REJECTED');
      expect(result.validationResult.matchResult.companyNameMatch).toBe(false);
      expect(result.validationResult.rejectionReason).toContain('Unrelated Global Corp');
    });

    it('rejects validation when document candidate name does not match student name', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(mockExpRecord);
      prisma.workExperienceDocument.update.mockResolvedValueOnce({});
      prisma.workExperience.update.mockResolvedValueOnce({
        ...mockExpRecord,
        status: 'REJECTED',
      });

      aiGateway.complete.mockResolvedValueOnce({
        output: {
          documentType: 'EXPERIENCE_LETTER',
          isActualEmploymentProof: true,
          candidateName: 'Alice Smith',
          companyName: 'Acme Corporation',
          role: 'Senior Software Engineer',
          startDate: '2022-01-01',
          endDate: '2023-01-01',
          confidence: 0.95,
        },
      });

      const result = await service.validateProofDocument(mockStudentId, expId, docId);

      expect(result.validationResult.validationStatus).toBe('REJECTED');
      expect(result.validationResult.matchResult.candidateNameMatch).toBe(false);
      expect(result.validationResult.rejectionReason).toContain('Alice Smith');
    });

    it('flags NEEDS_MANUAL_REVIEW when document role does not match submitted role without auto-rejecting experience', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(mockExpRecord);
      prisma.workExperienceDocument.update.mockResolvedValueOnce({});

      aiGateway.complete.mockResolvedValueOnce({
        output: {
          documentType: 'EXPERIENCE_LETTER',
          isActualEmploymentProof: true,
          candidateName: 'John Doe',
          companyName: 'Acme Corporation',
          role: 'Graphic Designer',
          startDate: '2022-01-01',
          endDate: '2023-01-01',
          confidence: 0.95,
        },
      });

      const result = await service.validateProofDocument(mockStudentId, expId, docId);

      expect(result.validationResult.validationStatus).toBe('NEEDS_MANUAL_REVIEW');
      expect(result.validationResult.matchResult.roleMatch).toBe(false);
      expect(result.validationResult.rejectionReason).toContain('Role variance');
      expect(prisma.workExperience.update).not.toHaveBeenCalled();
    });

    it('flags NEEDS_MANUAL_REVIEW when employment dates have variance without auto-rejecting experience', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(mockExpRecord);
      prisma.workExperienceDocument.update.mockResolvedValueOnce({});

      aiGateway.complete.mockResolvedValueOnce({
        output: {
          documentType: 'EXPERIENCE_LETTER',
          isActualEmploymentProof: true,
          candidateName: 'John Doe',
          companyName: 'Acme Corporation',
          role: 'Senior Software Engineer',
          startDate: null,
          endDate: null,
          confidence: 0.9,
        },
      });

      const result = await service.validateProofDocument(mockStudentId, expId, docId);

      expect(result.validationResult.validationStatus).toBe('NEEDS_MANUAL_REVIEW');
      expect(result.validationResult.matchResult.dateMatch).toBe(false);
      expect(result.validationResult.rejectionReason).toContain('Employment dates variance');
      expect(prisma.workExperience.update).not.toHaveBeenCalled();
    });

    it('reads actual document content from Data URI in production flow', async () => {
      const sampleText =
        'OFFICIAL EXPERIENCE CERTIFICATE: Candidate John Doe worked at Acme Corporation as Senior Software Engineer from 2022-01-01 to 2023-01-01.';
      const base64Content = Buffer.from(sampleText).toString('base64');
      const dataUriDocId = randomUUID();

      const dataUriExpRecord = {
        ...mockExpRecord,
        documents: [
          mockExpRecord.documents[0],
          {
            id: dataUriDocId,
            experienceId: expId,
            documentType: 'EXPERIENCE_LETTER',
            fileName: 'Proof.pdf',
            mimeType: 'application/pdf',
            fileUrl: `data:application/pdf;base64,${base64Content}`,
            fileSizeBytes: 1024,
            createdAt: new Date(),
          },
        ],
      };

      prisma.workExperience.findUnique.mockResolvedValueOnce(dataUriExpRecord);
      prisma.workExperienceDocument.update.mockResolvedValueOnce({});

      aiGateway.complete.mockResolvedValueOnce({
        output: {
          documentType: 'EXPERIENCE_LETTER',
          isActualEmploymentProof: true,
          candidateName: 'John Doe',
          companyName: 'Acme Corporation',
          role: 'Senior Software Engineer',
          startDate: '2022-01-01',
          endDate: '2023-01-01',
          confidence: 0.99,
        },
      });

      const result = await service.validateProofDocument(mockStudentId, expId, dataUriDocId);

      expect(result.validationResult.validationStatus).toBe('VALIDATED');
      expect(aiGateway.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            rawText: expect.stringContaining('OFFICIAL EXPERIENCE CERTIFICATE'),
          }),
        }),
      );
    });

    it('fails closed when file retrieval fails due to unreadable local path', async () => {
      const badPathDocId = randomUUID();
      const badPathExpRecord = {
        ...mockExpRecord,
        documents: [
          {
            id: badPathDocId,
            experienceId: expId,
            documentType: 'EXPERIENCE_LETTER',
            fileName: 'NonExistentFile.pdf',
            mimeType: 'application/pdf',
            fileUrl: 'non_existent_directory/NonExistentFile.pdf',
            fileSizeBytes: 1024,
            createdAt: new Date(),
          },
        ],
      };

      prisma.workExperience.findUnique.mockResolvedValueOnce(badPathExpRecord);

      await expect(
        service.validateProofDocument(mockStudentId, expId, badPathDocId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException for malformed AI output', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(mockExpRecord);
      aiGateway.complete.mockResolvedValueOnce({
        output: { invalidField: 'malformed_data' },
      });

      await expect(
        service.validateProofDocument(mockStudentId, expId, docId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException for cross-student validation attempt', async () => {
      const otherStudentId = randomUUID();
      prisma.workExperience.findUnique.mockResolvedValueOnce(mockExpRecord);

      await expect(
        service.validateProofDocument(otherStudentId, expId, docId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when AI gateway fails', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(mockExpRecord);
      aiGateway.complete.mockRejectedValueOnce(new Error('AI Gateway Timeout'));

      await expect(
        service.validateProofDocument(mockStudentId, expId, docId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects local file reference attempting path traversal outside storage directory', async () => {
      const traversalDocId = randomUUID();
      const traversalExpRecord = {
        ...mockExpRecord,
        documents: [
          {
            id: traversalDocId,
            experienceId: expId,
            documentType: 'EXPERIENCE_LETTER',
            fileName: 'Secret.env',
            mimeType: 'text/plain',
            fileUrl: '../../.env',
            fileSizeBytes: 1024,
            createdAt: new Date(),
          },
        ],
      };

      prisma.workExperience.findUnique.mockResolvedValueOnce(traversalExpRecord);

      await expect(
        service.validateProofDocument(mockStudentId, expId, traversalDocId),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects Base64 Data URI when decoded payload exceeds 5MB limit', async () => {
      const oversizedDataUriDocId = randomUUID();
      // Generate large dummy buffer (> 5MB)
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 100, 'a');
      const base64Data = largeBuffer.toString('base64');

      const oversizedExpRecord = {
        ...mockExpRecord,
        documents: [
          {
            id: oversizedDataUriDocId,
            experienceId: expId,
            documentType: 'EXPERIENCE_LETTER',
            fileName: 'LargeDoc.pdf',
            mimeType: 'application/pdf',
            fileUrl: `data:application/pdf;base64,${base64Data}`,
            fileSizeBytes: largeBuffer.length,
            createdAt: new Date(),
          },
        ],
      };

      prisma.workExperience.findUnique.mockResolvedValueOnce(oversizedExpRecord);

      await expect(
        service.validateProofDocument(mockStudentId, expId, oversizedDataUriDocId),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects local filesystem proof document if file size exceeds 5MB', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      const storageDir = path.resolve(process.cwd(), 'storage');
      await fs.mkdir(storageDir, { recursive: true });
      const testFile = path.resolve(storageDir, `test_oversized_${randomUUID()}.tmp`);

      try {
        // Write 5.1 MB dummy file inside storage directory
        const handle = await fs.open(testFile, 'w');
        await handle.truncate(5 * 1024 * 1024 + 1024);
        await handle.close();

        const oversizedLocalDocId = randomUUID();
        const oversizedLocalExpRecord = {
          ...mockExpRecord,
          documents: [
            {
              id: oversizedLocalDocId,
              experienceId: expId,
              documentType: 'EXPERIENCE_LETTER',
              fileName: 'Oversized.pdf',
              mimeType: 'application/pdf',
              fileUrl: testFile,
              fileSizeBytes: 5 * 1024 * 1024 + 1024,
              createdAt: new Date(),
            },
          ],
        };

        prisma.workExperience.findUnique.mockResolvedValueOnce(oversizedLocalExpRecord);

        await expect(
          service.validateProofDocument(mockStudentId, expId, oversizedLocalDocId),
        ).rejects.toThrow(BadRequestException);
      } finally {
        await fs.unlink(testFile).catch(() => undefined);
      }
    });
  });

  describe('Employer Verification (Phase 3)', () => {
    describe('sendEmployerVerification', () => {
      it('throws NotFoundException if experience does not exist', async () => {
        prisma.workExperience.findUnique.mockResolvedValueOnce(null);

        await expect(service.sendEmployerVerification(mockStudentId, randomUUID())).rejects.toThrow(
          NotFoundException,
        );
      });

      it('throws BadRequestException if verifier email is missing', async () => {
        const expId = randomUUID();
        prisma.workExperience.findUnique.mockResolvedValueOnce({
          id: expId,
          studentId: mockStudentId,
          verifierEmail: null,
        });

        await expect(service.sendEmployerVerification(mockStudentId, expId)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('creates verification attempt, updates status to PENDING_EMPLOYER, and returns response', async () => {
        const expId = randomUUID();
        const mockExp = {
          id: expId,
          studentId: mockStudentId,
          ...buildCompleteExpRecord({
            isCurrent: true,
            endDate: null,
            documents: [{ documentType: 'OFFER_LETTER' }],
          }),
          verifierName: 'Jane Smith',
          verifierEmail: 'jane@acme.com',
          student: { fullName: 'John Candidate' },
          organization: { domain: 'acme.com' },
        };

        prisma.workExperience.findUnique.mockResolvedValueOnce(mockExp);
        prisma.workExperienceVerificationAttempt.create.mockResolvedValueOnce({
          id: randomUUID(),
          experienceId: expId,
          tokenHash: 'hash',
          verifierEmail: 'jane@acme.com',
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
        });
        prisma.workExperience.update.mockResolvedValueOnce({
          ...mockExp,
          status: 'PENDING_EMPLOYER',
        });

        const res = await service.sendEmployerVerification(mockStudentId, expId);

        expect(res.success).toBe(true);
        expect(res.status).toBe('PENDING_EMPLOYER');
        expect(prisma.workExperienceVerificationAttempt.create).toHaveBeenCalled();
        expect(prisma.workExperience.update).toHaveBeenCalledWith({
          where: { id: expId },
          data: { status: 'PENDING_EMPLOYER', rejectionReason: null },
        });
      });
    });

    describe('getVerificationByToken', () => {
      it('throws NotFoundException for invalid token', async () => {
        prisma.workExperienceVerificationAttempt.findUnique.mockResolvedValueOnce(null);

        await expect(service.getVerificationByToken('invalid-token')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('returns verification details for valid token', async () => {
        const expId = randomUUID();
        prisma.workExperienceVerificationAttempt.findUnique.mockResolvedValueOnce({
          id: randomUUID(),
          tokenHash: 'hash',
          verifierEmail: 'jane@acme.com',
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          respondedAt: null,
          experience: {
            id: expId,
            companyName: 'Acme Corp',
            role: 'Lead Developer',
            employmentType: 'FULL_TIME',
            startDate: new Date('2021-01-01'),
            endDate: null,
            isCurrent: true,
            responsibilities: 'Coding',
            verifierName: 'Jane Manager',
            verifierDesignation: 'VP Eng',
            status: 'PENDING_EMPLOYER',
            student: { fullName: 'Alice Student' },
          },
        });

        const res = await service.getVerificationByToken('valid-raw-token');

        expect(res.experienceId).toBe(expId);
        expect(res.candidateName).toBe('Alice Student');
        expect(res.companyName).toBe('Acme Corp');
        expect(res.isExpired).toBe(false);
        expect(res.isAlreadyResponded).toBe(false);
      });
    });

    describe('submitEmployerVerification', () => {
      it('approves verification claim and updates status to VERIFIED', async () => {
        const expId = randomUUID();
        const attemptId = randomUUID();
        prisma.workExperienceVerificationAttempt.findUnique.mockResolvedValueOnce({
          id: attemptId,
          tokenHash: 'hash',
          verifierEmail: 'jane@acme.com',
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          respondedAt: null,
          experience: {
            id: expId,
            status: 'PENDING_EMPLOYER',
          },
        });

        prisma.workExperienceVerificationAttempt.update.mockResolvedValueOnce({});
        prisma.workExperience.update.mockResolvedValueOnce({
          id: expId,
          status: 'VERIFIED',
        });

        const res = await service.submitEmployerVerification('valid-raw-token', {
          approved: true,
          comments: 'Everything checks out!',
        });

        expect(res.success).toBe(true);
        expect(res.status).toBe('VERIFIED');
        expect(auditPublisher.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'WORK_EXPERIENCE_EMPLOYER_VERIFICATION_APPROVED',
            resourceId: expId,
          }),
        );
      });

      it('rejects verification claim and updates status to REJECTED with reason', async () => {
        const expId = randomUUID();
        const attemptId = randomUUID();
        prisma.workExperienceVerificationAttempt.findUnique.mockResolvedValueOnce({
          id: attemptId,
          tokenHash: 'hash',
          verifierEmail: 'jane@acme.com',
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          respondedAt: null,
          experience: {
            id: expId,
            status: 'PENDING_EMPLOYER',
          },
        });

        prisma.workExperienceVerificationAttempt.update.mockResolvedValueOnce({});
        prisma.workExperience.update.mockResolvedValueOnce({
          id: expId,
          status: 'REJECTED',
        });

        const res = await service.submitEmployerVerification('valid-raw-token', {
          approved: false,
          comments: 'Did not work here during stated dates',
        });

        expect(res.success).toBe(true);
        expect(res.status).toBe('REJECTED');
        expect(auditPublisher.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'WORK_EXPERIENCE_EMPLOYER_VERIFICATION_REJECTED',
            resourceId: expId,
          }),
        );
      });

      it('returns verified message when decision is YES without legacy approved flag', async () => {
        const expId = randomUUID();
        prisma.workExperienceVerificationAttempt.findUnique.mockResolvedValueOnce({
          id: randomUUID(),
          tokenHash: 'hash',
          verifierEmail: 'jane@acme.com',
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          respondedAt: null,
          experience: { id: expId, status: 'PENDING_EMPLOYER' },
        });
        prisma.workExperienceVerificationAttempt.update.mockResolvedValueOnce({});
        prisma.workExperience.update.mockResolvedValueOnce({ id: expId, status: 'VERIFIED' });

        const res = await service.submitEmployerVerification('valid-raw-token', {
          decision: 'YES',
        });

        expect(res.status).toBe('VERIFIED');
        expect(res.message).toBe('Work experience successfully verified.');
      });

      it('marks PARTIAL employer decision as VERIFIED with notes', async () => {
        const expId = randomUUID();
        prisma.workExperienceVerificationAttempt.findUnique.mockResolvedValueOnce({
          id: randomUUID(),
          tokenHash: 'hash',
          verifierEmail: 'jane@acme.com',
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          respondedAt: null,
          experience: { id: expId, status: 'PENDING_EMPLOYER' },
        });
        prisma.workExperienceVerificationAttempt.update.mockResolvedValueOnce({});
        prisma.workExperience.update.mockResolvedValueOnce({ id: expId, status: 'VERIFIED' });

        const res = await service.submitEmployerVerification('valid-raw-token', {
          decision: 'PARTIAL',
          comments: 'Dates match; role title slightly different.',
        });

        expect(res.status).toBe('VERIFIED');
      });

      it('returns NEED_CLARIFICATION employer decision to SUBMITTED', async () => {
        const expId = randomUUID();
        prisma.workExperienceVerificationAttempt.findUnique.mockResolvedValueOnce({
          id: randomUUID(),
          tokenHash: 'hash',
          verifierEmail: 'jane@acme.com',
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          respondedAt: null,
          experience: { id: expId, status: 'PENDING_EMPLOYER' },
        });
        prisma.workExperienceVerificationAttempt.update.mockResolvedValueOnce({});
        prisma.workExperience.update.mockResolvedValueOnce({ id: expId, status: 'SUBMITTED' });

        const res = await service.submitEmployerVerification('valid-raw-token', {
          decision: 'NEED_CLARIFICATION',
          comments: 'Please confirm exact end date.',
        });

        expect(res.status).toBe('SUBMITTED');
      });

      it('rejects submission for expired employer verification token', async () => {
        prisma.workExperienceVerificationAttempt.findUnique.mockResolvedValueOnce({
          id: randomUUID(),
          tokenHash: 'hash',
          verifierEmail: 'jane@acme.com',
          expiresAt: new Date(Date.now() - 3600 * 1000),
          respondedAt: null,
          experience: { id: randomUUID(), status: 'PENDING_EMPLOYER' },
        });

        await expect(
          service.submitEmployerVerification('expired-token', { decision: 'YES' }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('S6 Gap 1 & 2 & 3: Domain Validation, INVALID_DOCUMENT_TYPE & EXPIRED Restart', () => {
      it('extractDomain correctly parses emails, URLs, and normalizes www.', () => {
        expect(extractDomain('jane@acme.com')).toBe('acme.com');
        expect(extractDomain('https://www.acme.com/about')).toBe('acme.com');
        expect(extractDomain('http://sub.acme.com')).toBe('sub.acme.com');
        expect(extractDomain(null)).toBeNull();
        expect(extractDomain('')).toBeNull();
      });

      it('validateEmployerDomain correctly checks official domain matching', () => {
        expect(validateEmployerDomain('jane@acme.com', 'https://www.acme.com')).toEqual({
          verifierDomain: 'acme.com',
          companyDomain: 'acme.com',
          domainMatch: true,
        });

        expect(validateEmployerDomain('jane@gmail.com', 'https://www.acme.com')).toEqual({
          verifierDomain: 'gmail.com',
          companyDomain: 'acme.com',
          domainMatch: false,
        });

        expect(validateEmployerDomain('jane@sub.acme.com', 'https://acme.com')).toEqual({
          verifierDomain: 'sub.acme.com',
          companyDomain: 'acme.com',
          domainMatch: true,
        });

        expect(validateEmployerDomain('jane@acmescam.com', 'https://acme.com')).toEqual({
          verifierDomain: 'acmescam.com',
          companyDomain: 'acme.com',
          domainMatch: false,
        });
      });

      it('sendEmployerVerification logs domain match metadata in audit publisher', async () => {
        const expId = randomUUID();
        prisma.workExperience.findUnique.mockResolvedValueOnce({
          id: expId,
          studentId: mockStudentId,
          ...buildCompleteExpRecord({
            isCurrent: true,
            endDate: null,
            documents: [{ documentType: 'OFFER_LETTER' }],
          }),
          verifierEmail: 'manager@acme.com',
          companyWebsite: 'https://www.acme.com',
          student: { fullName: 'Alice Student' },
          organization: { domain: 'acme.com' },
        });

        prisma.workExperienceVerificationAttempt.create.mockResolvedValueOnce({ id: 'att-1' });
        prisma.workExperience.update.mockResolvedValueOnce({
          id: expId,
          status: 'PENDING_EMPLOYER',
        });

        const res = await service.sendEmployerVerification(mockStudentId, expId);
        expect(res.success).toBe(true);
        expect(auditPublisher.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'WORK_EXPERIENCE_EMPLOYER_VERIFICATION_SENT',
            resourceId: expId,
            metadata: expect.objectContaining({
              verifierDomain: 'acme.com',
              companyDomain: 'acme.com',
              domainMatch: true,
            }),
          }),
        );
      });

      it('blocks sendEmployerVerification if verifier email is a personal domain', async () => {
        const expId = randomUUID();
        prisma.workExperience.findUnique.mockResolvedValueOnce({
          id: expId,
          studentId: mockStudentId,
          ...buildCompleteExpRecord({
            isCurrent: true,
            endDate: null,
            documents: [{ documentType: 'OFFER_LETTER' }],
          }),
          verifierEmail: 'manager@gmail.com',
          student: { fullName: 'Alice Student' },
          organization: { domain: 'acme.com' },
        });

        await expect(service.sendEmployerVerification(mockStudentId, expId)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('blocks sendEmployerVerification if verifier domain does not match company domain', async () => {
        const expId = randomUUID();
        prisma.workExperience.findUnique.mockResolvedValueOnce({
          id: expId,
          studentId: mockStudentId,
          ...buildCompleteExpRecord({
            isCurrent: true,
            endDate: null,
            documents: [{ documentType: 'OFFER_LETTER' }],
          }),
          verifierEmail: 'manager@differentdomain.com',
          student: { fullName: 'Alice Student' },
          organization: { domain: 'acme.com' },
        });

        await expect(service.sendEmployerVerification(mockStudentId, expId)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('restarts verification from EXPIRED state creating a new attempt row and token', async () => {
        const expId = randomUUID();
        const expMock = {
          id: expId,
          studentId: mockStudentId,
          ...buildCompleteExpRecord({
            isCurrent: true,
            endDate: null,
            documents: [{ documentType: 'OFFER_LETTER' }],
          }),
          verifierEmail: 'manager@acme.com',
          status: 'EXPIRED',
          student: { fullName: 'Alice Student' },
          organization: { domain: 'acme.com' },
        };
        prisma.workExperience.findUnique
          .mockResolvedValueOnce(expMock)
          .mockResolvedValueOnce(expMock);

        prisma.workExperienceVerificationAttempt.create.mockResolvedValueOnce({ id: 'att-new' });
        prisma.workExperience.update.mockResolvedValueOnce({
          id: expId,
          status: 'PENDING_EMPLOYER',
        });

        const res = await service.restartEmployerVerification(mockStudentId, expId);
        expect(res.success).toBe(true);
        expect(res.status).toBe('PENDING_EMPLOYER');
        expect(prisma.workExperienceVerificationAttempt.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            experienceId: expId,
            verifierEmail: 'manager@acme.com',
            tokenHash: expect.any(String),
          }),
        });
      });

      it('restartEmployerVerification throws NotFoundException if experience does not exist or belongs to another student', async () => {
        prisma.workExperience.findUnique.mockResolvedValueOnce(null);
        await expect(
          service.restartEmployerVerification(mockStudentId, randomUUID()),
        ).rejects.toThrow(NotFoundException);
      });

      it('restartEmployerVerification throws BadRequestException if verifierEmail is missing', async () => {
        const expId = randomUUID();
        prisma.workExperience.findUnique.mockResolvedValueOnce({
          id: expId,
          studentId: mockStudentId,
          verifierEmail: null,
        });

        await expect(service.restartEmployerVerification(mockStudentId, expId)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('getOpsDashboard returns candidate verification items with step and emailState', async () => {
        const expId = randomUUID();
        prisma.workExperience.findMany.mockResolvedValueOnce([
          {
            id: expId,
            studentId: mockStudentId,
            companyName: 'Acme Corp',
            companyWebsite: 'https://acme.com',
            role: 'Senior Developer',
            status: 'PENDING_EMPLOYER',
            verifierEmail: 'hr@acme.com',
            createdAt: new Date(),
            student: { fullName: 'John Doe', email: 'john@student.edu' },
            documents: [],
            verificationAttempts: [
              {
                id: 'att-1',
                expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
                respondedAt: null,
                reminderSentAt: null,
              },
            ],
          },
        ]);

        const items = await service.getOpsDashboard({
          sub: mockStudentId,
          role: 'SUPER_ADMIN',
          inst: null,
        });
        expect(prisma.workExperience.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {},
          }),
        );
        expect(items).toHaveLength(1);
        expect(items[0].candidateName).toBe('John Doe');
        expect(items[0].companyName).toBe('Acme Corp');
        expect(items[0].currentStep).toBe('EMPLOYER_DISPATCHED');
        expect(items[0].emailState).toBe('SENT');
        expect(items[0].flaggedDocumentCount).toBe(0);
        expect(items[0].hasFlaggedDocuments).toBe(false);
        expect(items[0].nextAction).toContain('Awaiting employer response');
      });
    });

    describe('S6-VB-01 lifecycle', () => {
      it('runs create → validate proof → send → YES → VERIFIED', async () => {
        const expId = randomUUID();
        const payload = buildValidCreatePayload({
          role: 'Engineer',
          startDate: '2023-01-01T00:00:00.000Z',
          companyWebsite: 'https://acme.com',
          companyLinkedinUrl: 'https://linkedin.com/company/acme',
          verifierEmail: 'manager@acme.com',
        });

        prisma.organization.findFirst.mockResolvedValueOnce(null);
        prisma.organization.create.mockResolvedValueOnce({ id: randomUUID(), domain: 'acme.com' });
        prisma.company.findFirst.mockResolvedValueOnce(null);
        prisma.workExperience.create.mockResolvedValueOnce({
          id: expId,
          studentId: mockStudentId,
          companyId: null,
          companyName: payload.companyName,
          companyWebsite: payload.companyWebsite,
          companyLinkedinUrl: payload.companyLinkedinUrl,
          role: payload.role,
          employmentType: 'FULL_TIME',
          department: null,
          domain: payload.domain,
          workLocation: null,
          startDate: new Date(payload.startDate),
          endDate: null,
          isCurrent: true,
          responsibilities: payload.responsibilities,
          skills: payload.skillsClaimed,
          projects: null,
          candidateLinkedin: null,
          verifierName: null,
          verifierEmail: payload.verifierEmail,
          verifierDesignation: null,
          verifierPhone: null,
          status: 'SUBMITTED',
          rejectionReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          documents: payload.documents.map((doc) => ({
            ...doc,
            id: randomUUID(),
            experienceId: expId,
            createdAt: new Date(),
          })),
        });

        const created = await service.create(mockStudentId, payload);
        expect(created.id).toBe(expId);

        const proofDocId = randomUUID();
        const proofExp = {
          id: expId,
          studentId: mockStudentId,
          ...buildCompleteExpRecord({ role: 'Engineer', isCurrent: true, endDate: null }),
          status: 'SUBMITTED',
          documents: [
            {
              id: randomUUID(),
              experienceId: expId,
              documentType: 'OFFER_LETTER',
              fileName: 'offer.pdf',
              mimeType: 'application/pdf',
              fileUrl: 'storage/offer.pdf',
              fileSizeBytes: 100,
              createdAt: new Date(),
            },
            {
              id: proofDocId,
              experienceId: expId,
              documentType: 'EXPERIENCE_LETTER',
              fileName: 'exp.pdf',
              mimeType: 'application/pdf',
              fileUrl:
                'data:application/pdf;base64,' +
                Buffer.from('proof text long enough here').toString('base64'),
              fileSizeBytes: 100,
              createdAt: new Date(),
            },
          ],
        };
        prisma.workExperience.findUnique.mockResolvedValueOnce(proofExp);
        prisma.workExperienceDocument.update.mockResolvedValueOnce({});
        aiGateway.complete.mockResolvedValueOnce({
          output: {
            documentType: 'EXPERIENCE_LETTER',
            isActualEmploymentProof: true,
            candidateName: 'John Doe',
            companyName: 'Acme Corp',
            role: 'Engineer',
            startDate: '2023-01-01',
            endDate: null,
            confidence: 0.95,
          },
        });
        const validated = await service.validateProofDocument(mockStudentId, expId, proofDocId);
        expect(validated.validationResult.validationStatus).toBe('VALIDATED');

        prisma.workExperience.findUnique.mockResolvedValueOnce({
          id: expId,
          studentId: mockStudentId,
          ...buildCompleteExpRecord({
            role: 'Engineer',
            isCurrent: true,
            endDate: null,
            documents: [{ documentType: 'OFFER_LETTER' }],
          }),
          verifierEmail: 'manager@acme.com',
          student: { fullName: 'John Doe' },
          organization: { domain: 'acme.com' },
        });
        prisma.workExperienceVerificationAttempt.create.mockResolvedValueOnce({ id: 'att-1' });
        prisma.workExperience.update.mockResolvedValueOnce({
          id: expId,
          status: 'PENDING_EMPLOYER',
        });
        const sent = await service.sendEmployerVerification(mockStudentId, expId);
        expect(sent.status).toBe('PENDING_EMPLOYER');

        prisma.workExperienceVerificationAttempt.findUnique.mockResolvedValueOnce({
          id: 'att-1',
          tokenHash: 'hash',
          verifierEmail: 'manager@acme.com',
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          respondedAt: null,
          experience: { id: expId, status: 'PENDING_EMPLOYER' },
        });
        prisma.workExperienceVerificationAttempt.update.mockResolvedValueOnce({});
        prisma.workExperience.update.mockResolvedValueOnce({ id: expId, status: 'VERIFIED' });
        const verified = await service.submitEmployerVerification('token', { decision: 'YES' });
        expect(verified.status).toBe('VERIFIED');
      });
    });
  });

  describe('letter authenticity (WE-T02)', () => {
    const expId = randomUUID();
    const docId = randomUUID();

    it('flags company mismatch without changing experience status', async () => {
      prisma.workExperienceDocument.findUnique.mockResolvedValueOnce({
        id: docId,
        experienceId: expId,
        fileUrl:
          'data:text/plain;base64,' +
          Buffer.from('Globex letter content long enough').toString('base64'),
        fileName: 'letter.pdf',
        mimeType: 'text/plain',
        validationResult: null,
      });
      aiGateway.complete.mockResolvedValueOnce({
        output: {
          candidateName: 'Jane',
          companyName: 'Globex Industries',
          companyDomain: 'globex.com',
          hasLetterhead: true,
          hasSignatureBlock: true,
          confidence: 0.9,
        },
      });
      prisma.workExperienceDocument.update.mockResolvedValueOnce({
        id: docId,
        experienceId: expId,
        documentType: 'EXPERIENCE_LETTER',
        fileUrl: 'data:text/plain;base64,abc',
        fileName: 'letter.pdf',
        fileSizeBytes: 100,
        mimeType: 'text/plain',
        validationResult: {
          authenticity: {
            status: 'doc_flagged',
            result: { flagReasons: ['COMPANY_MISMATCH'] },
            checkedAt: '2026-09-10T00:00:00.000Z',
          },
        },
        createdAt: new Date(),
      });

      const updated = await service.runDocumentAuthenticityCheck(
        {
          id: expId,
          studentId: mockStudentId,
          companyName: 'Acme Corporation',
          companyWebsite: 'https://acme.com',
        },
        docId,
      );

      expect(parseStoredDocumentAuthenticity(updated.validationResult).status).toBe('doc_flagged');
      expect(prisma.workExperience.update).not.toHaveBeenCalled();
    });

    it('approves flagged documents and audit-logs the admin action', async () => {
      const actorId = randomUUID();
      prisma.workExperience.findUnique.mockResolvedValueOnce({
        id: expId,
        documents: [
          {
            id: docId,
            validationResult: {
              authenticity: {
                status: 'doc_flagged',
                result: { flagReasons: ['MISSING_SIGNATURE_BLOCK'] },
                checkedAt: '2026-09-10T00:00:00.000Z',
              },
            },
          },
        ],
      });
      prisma.workExperienceDocument.update.mockResolvedValueOnce({});

      const result = await service.approveWorkExperienceAuthenticity(actorId, expId, {
        reason: 'Manual review confirmed letter is genuine.',
      });

      expect(result.flaggedDocumentsCleared).toBe(1);
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId,
          action: 'work_experience.authenticity_approved',
          resourceId: expId,
        }),
      );
    });

    it('strips fileUrl for company-lite document mapping', () => {
      const redacted = service.mapToCompanyLiteDto({
        id: expId,
        studentId: mockStudentId,
        companyId: null,
        companyName: 'Acme',
        role: 'Engineer',
        employmentType: 'FULL_TIME',
        skills: [],
        startDate: new Date(),
        endDate: null,
        isCurrent: true,
        status: 'SUBMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: [
          {
            id: docId,
            experienceId: expId,
            documentType: 'EXPERIENCE_LETTER',
            fileUrl: 'storage/secret-letter.pdf',
            fileName: 'letter.pdf',
            fileSizeBytes: 100,
            mimeType: 'application/pdf',
            validationResult: {
              authenticity: { status: 'doc_ok', result: null, checkedAt: '2026-09-10' },
            },
            createdAt: new Date(),
          },
        ],
      });

      expect(redacted.documents[0]).not.toHaveProperty('fileUrl');
      expect(redacted.documents[0]?.authenticityStatus).toBe('doc_ok');
    });
  });

  describe('voidWorkExperience (SA-T08)', () => {
    const experienceId = randomUUID();

    it('voids a work-experience entry and writes an immutable audit row', async () => {
      const actorId = randomUUID();
      prisma.workExperience.findUnique.mockResolvedValue({
        id: experienceId,
        studentId: mockStudentId,
        status: 'VERIFIED',
        documents: [
          {
            id: randomUUID(),
            validationResult: {
              authenticity: { status: 'doc_flagged', result: null, checkedAt: '2026-09-10' },
            },
          },
        ],
      });
      prisma.workExperienceDocument.update.mockResolvedValue({});
      prisma.workExperience.update.mockResolvedValue({
        id: experienceId,
        status: 'VOIDED',
        updatedAt: new Date('2026-09-09T00:00:00.000Z'),
      });

      const result = await service.voidWorkExperience(actorId, experienceId, {
        reason: 'Employer confirmed candidate never worked there.',
      });

      expect(prisma.workExperience.update).toHaveBeenCalledWith({
        where: { id: experienceId },
        data: {
          status: 'VOIDED',
          rejectionReason: 'Employer confirmed candidate never worked there.',
        },
      });
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId,
          action: 'work_experience.voided',
          resourceType: 'WorkExperience',
          resourceId: experienceId,
          reasonCode: 'Employer confirmed candidate never worked there.',
        }),
      );
      expect(result.status).toBe('VOIDED');
      expect(result.voidedAt).toBe('2026-09-09T00:00:00.000Z');
      expect(publicProfileService.recheckActivationAfterVoid).toHaveBeenCalledWith(mockStudentId);
    });

    it('404s when voiding a work-experience entry that does not exist', async () => {
      prisma.workExperience.findUnique.mockResolvedValue(null);
      await expect(
        service.voidWorkExperience(randomUUID(), randomUUID(), { reason: 'Does not matter here.' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('WE-T03: Manager Endorsement Flow', () => {
    const experienceId = randomUUID();
    /** 32-byte manager endorsement token as lowercase hex (matches randomBytes(32).toString('hex')). */
    const VALID_MANAGER_TOKEN = 'a'.repeat(64);
    const TTL_120H = 120 * 60 * 60 * 1000;
    const TTL_72H = 72 * 60 * 60 * 1000;
    const mockExp = {
      id: experienceId,
      studentId: mockStudentId,
      ...buildCompleteExpRecord({ isCurrent: true, endDate: null }),
      docOk: true,
      completedConfirmed: false,
      overallVerified: false,
      student: { fullName: 'John Doe' },
      organization: { domain: 'acme.com' },
      documents: [
        {
          documentType: 'OFFER_LETTER',
          validationResult: {
            extractedData: { companyName: 'Acme Corp', domain: 'acme.com' },
          },
        },
      ],
    };

    describe('sendManagerEndorsement', () => {
      const validEndorsementRequest = {
        managerEmail: 'manager@acme.com',
        managerName: 'Jane Smith',
      };

      beforeEach(() => {
        prisma.workExperienceManagerEndorsement.findFirst.mockImplementation(
          ({ where }: { where: { status?: string } }) => {
            if (where.status === 'CONFIRMED') {
              return Promise.resolve(null);
            }
            if (where.status === 'PENDING') {
              return Promise.resolve(null);
            }
            return Promise.resolve(null);
          },
        );
      });

      it('throws NotFoundException when experience does not belong to student', async () => {
        prisma.workExperience.findUnique.mockResolvedValue({
          ...mockExp,
          studentId: randomUUID(),
        });

        await expect(
          service.sendManagerEndorsement(mockStudentId, experienceId, validEndorsementRequest),
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(prisma.workExperienceManagerEndorsement.create).not.toHaveBeenCalled();
      });

      it('rejects personal/free email domains (gmail.com)', async () => {
        prisma.workExperience.findUnique.mockResolvedValue(mockExp);
        await expect(
          service.sendManagerEndorsement(mockStudentId, experienceId, {
            managerEmail: 'manager@gmail.com',
            managerName: 'Jane Smith',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.workExperienceManagerEndorsement.create).not.toHaveBeenCalled();
        expect(auditPublisher.record).not.toHaveBeenCalled();
      });

      it('rejects email domain that does not match employer domain', async () => {
        prisma.workExperience.findUnique.mockResolvedValue(mockExp);
        await expect(
          service.sendManagerEndorsement(mockStudentId, experienceId, {
            managerEmail: 'manager@othercompany.com',
            managerName: 'Jane Smith',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.workExperienceManagerEndorsement.create).not.toHaveBeenCalled();
        expect(auditPublisher.record).not.toHaveBeenCalled();
      });

      it('accepts manager email on supported employer subdomain', async () => {
        prisma.workExperience.findUnique.mockResolvedValue(mockExp);
        const endorsementId = randomUUID();
        prisma.workExperienceManagerEndorsement.create.mockResolvedValue({
          id: endorsementId,
          experienceId,
          managerEmail: 'manager@sub.acme.com',
          expiresAt: new Date(Date.now() + 120 * 3600 * 1000),
          status: 'PENDING',
        });

        const res = await service.sendManagerEndorsement(mockStudentId, experienceId, {
          managerEmail: 'manager@sub.acme.com',
          managerName: 'Jane Smith',
        });

        expect(res.success).toBe(true);
        expect(prisma.workExperienceManagerEndorsement.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              managerEmail: 'manager@sub.acme.com',
              resolvedDomain: 'acme.com',
            }),
          }),
        );
        expect(auditPublisher.record).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              managerDomain: 'sub.acme.com',
              resolvedDomain: 'acme.com',
              domainMatch: true,
            }),
          }),
        );
      });

      it('allows corporate manager email when no authoritative employer domain is resolved', async () => {
        const expWithoutResolvedDomain = {
          ...mockExp,
          organization: null,
          companyWebsite: null,
          documents: [{ documentType: 'OFFER_LETTER', validationResult: {} }],
        };
        prisma.workExperience.findUnique.mockResolvedValue(expWithoutResolvedDomain);
        const endorsementId = randomUUID();
        prisma.workExperienceManagerEndorsement.create.mockResolvedValue({
          id: endorsementId,
          experienceId,
          managerEmail: 'manager@othercorp.com',
          expiresAt: new Date(Date.now() + 120 * 3600 * 1000),
          status: 'PENDING',
        });

        const res = await service.sendManagerEndorsement(mockStudentId, experienceId, {
          managerEmail: 'manager@othercorp.com',
          managerName: 'Jane Smith',
        });

        expect(res.success).toBe(true);
        expect(prisma.workExperienceManagerEndorsement.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              managerEmail: 'manager@othercorp.com',
              resolvedDomain: null,
            }),
          }),
        );
        expect(auditPublisher.record).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              managerDomain: 'othercorp.com',
              resolvedDomain: null,
              domainMatch: null,
            }),
          }),
        );
      });

      it('rejects missing endorser name', async () => {
        prisma.workExperience.findUnique.mockResolvedValue(mockExp);
        await expect(
          service.sendManagerEndorsement(mockStudentId, experienceId, {
            managerEmail: 'manager@acme.com',
            managerName: '',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('rejects endorser name shorter than 2 characters', async () => {
        prisma.workExperience.findUnique.mockResolvedValue(mockExp);
        await expect(
          service.sendManagerEndorsement(mockStudentId, experienceId, {
            managerEmail: 'manager@acme.com',
            managerName: 'J',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('rejects endorser name longer than 120 characters', async () => {
        prisma.workExperience.findUnique.mockResolvedValue(mockExp);
        await expect(
          service.sendManagerEndorsement(mockStudentId, experienceId, {
            managerEmail: 'manager@acme.com',
            managerName: 'A'.repeat(121),
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('dispatches manager endorsement request and schedules 3d reminder & 5d expiry jobs', async () => {
        prisma.workExperience.findUnique.mockResolvedValue(mockExp);
        const endorsementId = randomUUID();
        prisma.workExperienceManagerEndorsement.create.mockResolvedValue({
          id: endorsementId,
          experienceId,
          managerEmail: 'manager@acme.com',
          expiresAt: new Date(Date.now() + 120 * 3600 * 1000),
          status: 'PENDING',
        });

        const res = await service.sendManagerEndorsement(
          mockStudentId,
          experienceId,
          validEndorsementRequest,
        );

        expect(res.success).toBe(true);
        expect(res.endorsementId).toBe(endorsementId);
        expect(prisma.workExperienceManagerEndorsement.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              managerEmail: 'manager@acme.com',
              managerName: 'Jane Smith',
              resolvedDomain: 'acme.com',
            }),
          }),
        );
        expect(auditPublisher.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'WORK_EXPERIENCE_MANAGER_ENDORSEMENT_SENT',
            metadata: expect.objectContaining({
              managerEmail: 'manager@acme.com',
              managerDomain: 'acme.com',
              resolvedDomain: 'acme.com',
              domainMatch: true,
            }),
          }),
        );
        expect(evidenceSync.syncWorkExperienceEvidenceRecord).not.toHaveBeenCalled();
        expect(emailQueue.add).toHaveBeenCalledTimes(3);
        expect(emailQueue.add).toHaveBeenNthCalledWith(
          1,
          'send',
          expect.objectContaining({
            template: 'work-experience-manager-invite',
            to: 'manager@acme.com',
          }),
          { jobId: `manager-invite:${endorsementId}` },
        );
        expect(emailQueue.add).toHaveBeenNthCalledWith(
          2,
          'send-manager-reminder',
          expect.objectContaining({ endorsementId }),
          expect.objectContaining({
            delay: TTL_72H,
            jobId: `manager-reminder:${endorsementId}`,
          }),
        );
        expect(emailQueue.add).toHaveBeenNthCalledWith(
          3,
          'expire-manager-endorsement',
          { endorsementId, experienceId },
          expect.objectContaining({
            delay: TTL_120H,
            jobId: `manager-expire:${endorsementId}`,
          }),
        );
        const auditMetadata = auditPublisher.record.mock.calls[0]?.[0]?.metadata;
        expect(JSON.stringify(auditMetadata ?? {})).not.toMatch(/surveyUrl|tokenHash/);
      });

      it('persists only tokenHash and never the raw token on create', async () => {
        prisma.workExperience.findUnique.mockResolvedValue(mockExp);
        const endorsementId = randomUUID();
        prisma.workExperienceManagerEndorsement.create.mockImplementation(
          ({ data }: { data: Record<string, unknown> }) => {
            expect(data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
            expect(data).not.toHaveProperty('token');
            expect(data).not.toHaveProperty('rawToken');
            return Promise.resolve({
              id: endorsementId,
              experienceId,
              managerEmail: 'manager@acme.com',
              expiresAt: new Date(Date.now() + TTL_120H),
              status: 'PENDING',
            });
          },
        );

        await service.sendManagerEndorsement(mockStudentId, experienceId, validEndorsementRequest);

        const invitePayload = emailQueue.add.mock.calls.find(
          (call: unknown[]) => call[0] === 'send',
        )?.[1];
        expect(invitePayload?.data?.surveyUrl).toContain('/work-experience/manager-survey/');
      });

      it('returns existing active pending request without creating duplicate rows', async () => {
        prisma.workExperience.findUnique.mockResolvedValue(mockExp);
        const existingEndorsement = {
          id: randomUUID(),
          managerEmail: 'manager@acme.com',
          managerName: 'Jane Smith',
          expiresAt: new Date(Date.now() + 120 * 3600 * 1000),
        };
        prisma.workExperienceManagerEndorsement.findFirst.mockImplementation(
          ({ where }: { where: { status?: string } }) => {
            if (where.status === 'CONFIRMED') {
              return Promise.resolve(null);
            }
            if (where.status === 'PENDING') {
              return Promise.resolve(existingEndorsement);
            }
            return Promise.resolve(null);
          },
        );

        const res = await service.sendManagerEndorsement(
          mockStudentId,
          experienceId,
          validEndorsementRequest,
        );

        expect(res.idempotent).toBe(true);
        expect(res.endorsementId).toBe(existingEndorsement.id);
        expect(prisma.workExperienceManagerEndorsement.create).not.toHaveBeenCalled();
        expect(auditPublisher.record).not.toHaveBeenCalled();
        expect(emailQueue.add).not.toHaveBeenCalled();
        expect(evidenceSync.syncWorkExperienceEvidenceRecord).not.toHaveBeenCalled();
      });

      it('rejects a pending request with different contact details', async () => {
        prisma.workExperience.findUnique.mockResolvedValue(mockExp);
        prisma.workExperienceManagerEndorsement.findFirst.mockImplementation(
          ({ where }: { where: { status?: string } }) => {
            if (where.status === 'CONFIRMED') {
              return Promise.resolve(null);
            }
            if (where.status === 'PENDING') {
              return Promise.resolve({
                id: randomUUID(),
                managerEmail: 'manager@acme.com',
                managerName: 'Jane Smith',
                expiresAt: new Date(Date.now() + 120 * 3600 * 1000),
              });
            }
            return Promise.resolve(null);
          },
        );

        await expect(
          service.sendManagerEndorsement(mockStudentId, experienceId, {
            managerEmail: 'other.manager@acme.com',
            managerName: 'Other Manager',
          }),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(prisma.workExperienceManagerEndorsement.create).not.toHaveBeenCalled();
        expect(auditPublisher.record).not.toHaveBeenCalled();
        expect(emailQueue.add).not.toHaveBeenCalled();
      });

      it('rejects a new request when manager endorsement is already confirmed', async () => {
        prisma.workExperience.findUnique.mockResolvedValue(mockExp);
        prisma.workExperienceManagerEndorsement.findFirst.mockImplementation(
          ({ where }: { where: { status?: string } }) => {
            if (where.status === 'CONFIRMED') {
              return Promise.resolve({ id: randomUUID() });
            }
            return Promise.resolve(null);
          },
        );

        await expect(
          service.sendManagerEndorsement(mockStudentId, experienceId, validEndorsementRequest),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(prisma.workExperienceManagerEndorsement.create).not.toHaveBeenCalled();
      });

      it('allows a new request after prior endorsement expired', async () => {
        prisma.workExperience.findUnique.mockResolvedValue(mockExp);
        const endorsementId = randomUUID();
        prisma.workExperienceManagerEndorsement.create.mockResolvedValue({
          id: endorsementId,
          experienceId,
          managerEmail: 'manager@acme.com',
          expiresAt: new Date(Date.now() + 120 * 3600 * 1000),
          status: 'PENDING',
        });

        const res = await service.sendManagerEndorsement(
          mockStudentId,
          experienceId,
          validEndorsementRequest,
        );

        expect(res.success).toBe(true);
        expect(res.idempotent).toBe(false);
        expect(prisma.workExperienceManagerEndorsement.create).toHaveBeenCalled();
      });

      it('allows a new request after prior endorsement was disputed', async () => {
        prisma.workExperience.findUnique.mockResolvedValue(mockExp);
        const endorsementId = randomUUID();
        prisma.workExperienceManagerEndorsement.create.mockResolvedValue({
          id: endorsementId,
          experienceId,
          managerEmail: 'manager@acme.com',
          expiresAt: new Date(Date.now() + 120 * 3600 * 1000),
          status: 'PENDING',
        });

        const res = await service.sendManagerEndorsement(
          mockStudentId,
          experienceId,
          validEndorsementRequest,
        );

        expect(res.success).toBe(true);
        expect(prisma.workExperienceManagerEndorsement.create).toHaveBeenCalled();
      });
    });

    it('includes latest manager endorsement summary in student DTO', async () => {
      const endorsementId = randomUUID();
      prisma.workExperience.findMany.mockResolvedValue([
        {
          ...mockExp,
          status: 'SUBMITTED',
          createdAt: new Date('2026-09-01T00:00:00.000Z'),
          updatedAt: new Date('2026-09-01T00:00:00.000Z'),
          structuredResponsibilities: [],
          documents: [],
          managerEndorsements: [
            {
              id: endorsementId,
              managerEmail: 'manager@acme.com',
              managerName: 'Jane Smith',
              status: 'PENDING',
              sentAt: new Date('2026-09-01T00:00:00.000Z'),
              expiresAt: new Date('2026-09-06T00:00:00.000Z'),
              createdAt: new Date('2026-09-01T00:00:00.000Z'),
            },
          ],
        },
      ]);

      const rows = await service.listForStudent(mockStudentId);
      expect(rows[0]?.managerEndorsement).toEqual(
        expect.objectContaining({
          endorsementId,
          status: 'PENDING',
          managerEmail: 'manager@acme.com',
          managerName: 'Jane Smith',
        }),
      );
    });

    describe('getManagerEndorsementByToken', () => {
      it('returns survey details for valid token', async () => {
        const mockEndorsement = {
          id: randomUUID(),
          experienceId,
          managerEmail: 'manager@acme.com',
          managerName: 'Jane Smith',
          expiresAt: new Date(Date.now() + 86400000),
          respondedAt: null,
          status: 'PENDING',
          experience: mockExp,
        };
        prisma.workExperienceManagerEndorsement.findUnique.mockResolvedValue(mockEndorsement);

        const res = await service.getManagerEndorsementByToken(VALID_MANAGER_TOKEN);
        expect(res.candidateName).toBe('John Doe');
        expect(res.companyName).toBe('Acme Corp');
        expect(res.role).toBe('Senior Software Engineer');
        expect(res.skillsClaimed).toContain('SQL_QUERY_OPTIMIZATION');
        expect(res.isExpired).toBe(false);
        expect(res.isAlreadyResponded).toBe(false);
        expect(evidenceSync.syncWorkExperienceEvidenceRecord).not.toHaveBeenCalled();
      });

      it('returns latest committed work experience fields from the database', async () => {
        const updatedExp = {
          ...mockExp,
          role: 'Staff Engineer',
          companyName: 'Acme International',
        };
        prisma.workExperienceManagerEndorsement.findUnique.mockResolvedValue({
          id: randomUUID(),
          experienceId,
          managerEmail: 'manager@acme.com',
          managerName: 'Jane Smith',
          expiresAt: new Date(Date.now() + 86400000),
          respondedAt: null,
          status: 'PENDING',
          experience: updatedExp,
        });

        const res = await service.getManagerEndorsementByToken(VALID_MANAGER_TOKEN);
        expect(res.role).toBe('Staff Engineer');
        expect(res.companyName).toBe('Acme International');
      });

      it('returns isExpired true for expired endorsement without throwing', async () => {
        prisma.workExperienceManagerEndorsement.findUnique.mockResolvedValue({
          id: randomUUID(),
          experienceId,
          managerEmail: 'manager@acme.com',
          managerName: 'Jane Smith',
          expiresAt: new Date(Date.now() - 3600000),
          respondedAt: null,
          status: 'EXPIRED',
          experience: mockExp,
        });

        const res = await service.getManagerEndorsementByToken(VALID_MANAGER_TOKEN);
        expect(res.isExpired).toBe(true);
        expect(res.isAlreadyResponded).toBe(false);
      });

      it('returns isAlreadyResponded true for responded endorsement', async () => {
        prisma.workExperienceManagerEndorsement.findUnique.mockResolvedValue({
          id: randomUUID(),
          experienceId,
          managerEmail: 'manager@acme.com',
          managerName: 'Jane Smith',
          expiresAt: new Date(Date.now() + 86400000),
          respondedAt: new Date(),
          status: 'CONFIRMED',
          experience: mockExp,
        });

        const res = await service.getManagerEndorsementByToken(VALID_MANAGER_TOKEN);
        expect(res.isAlreadyResponded).toBe(true);
      });

      it('throws NotFoundException for invalid token', async () => {
        prisma.workExperienceManagerEndorsement.findUnique.mockResolvedValue(null);
        await expect(
          service.getManagerEndorsementByToken(VALID_MANAGER_TOKEN),
        ).rejects.toBeInstanceOf(NotFoundException);
      });

      it('rejects malformed token before database lookup', async () => {
        await expect(
          service.getManagerEndorsementByToken('not-a-valid-token'),
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(prisma.workExperienceManagerEndorsement.findUnique).not.toHaveBeenCalled();
      });
    });

    describe('submitManagerEndorsement', () => {
      it('confirms endorsement and sets overallVerified=true when docOk=true', async () => {
        const mockEndorsement = {
          id: randomUUID(),
          experienceId,
          expiresAt: new Date(Date.now() + 86400000),
          respondedAt: null,
          experience: mockExp,
        };
        prisma.workExperienceManagerEndorsement.findUnique.mockResolvedValue(mockEndorsement);
        prisma.workExperienceManagerEndorsement.update.mockResolvedValue({});
        prisma.workExperience.findUnique.mockResolvedValue({ id: experienceId, docOk: true });
        prisma.workExperience.update.mockResolvedValue({
          id: experienceId,
          completedConfirmed: true,
          overallVerified: true,
        });

        const res = await service.submitManagerEndorsement(VALID_MANAGER_TOKEN, {
          confirmed: true,
          skillRatings: [{ skillCode: 'SQL_QUERY_OPTIMIZATION', rating: 5 }],
          comments: 'Great engineer!',
        });

        expect(res.success).toBe(true);
        expect(res.status).toBe('CONFIRMED');
        expect(res.message).toMatch(
          /role, employment dates, and responsibilities as their manager/i,
        );
        expect(res.message).toMatch(/manager endorsement has been recorded/i);
        expect(prisma.workExperienceManagerEndorsement.update).toHaveBeenCalledWith({
          where: { id: mockEndorsement.id },
          data: expect.objectContaining({
            status: 'CONFIRMED',
            confirmed: true,
          }),
        });
        expect(prisma.workExperience.update).toHaveBeenCalledWith({
          where: { id: experienceId },
          data: {
            completedConfirmed: true,
            overallVerified: true,
          },
        });
        expect(auditPublisher.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'WORK_EXPERIENCE_MANAGER_ENDORSEMENT_CONFIRMED',
            metadata: expect.objectContaining({ overallVerified: true }),
          }),
        );
        expect(evidenceSync.syncWorkExperienceEvidenceRecord).toHaveBeenCalledWith(
          mockStudentId,
          experienceId,
          undefined,
        );
      });

      it('disputes endorsement and keeps overallVerified=false', async () => {
        const mockEndorsement = {
          id: randomUUID(),
          experienceId,
          expiresAt: new Date(Date.now() + 86400000),
          respondedAt: null,
          experience: mockExp,
        };
        prisma.workExperienceManagerEndorsement.findUnique.mockResolvedValue(mockEndorsement);
        prisma.workExperienceManagerEndorsement.update.mockResolvedValue({});
        prisma.workExperience.findUnique.mockResolvedValue({ id: experienceId, docOk: true });
        prisma.workExperience.update.mockResolvedValue({
          id: experienceId,
          completedConfirmed: false,
          overallVerified: false,
        });

        const res = await service.submitManagerEndorsement(VALID_MANAGER_TOKEN, {
          confirmed: false,
          comments: 'Candidate was an intern, not full-time',
        });

        expect(res.success).toBe(true);
        expect(res.status).toBe('DISPUTED');
        expect(prisma.workExperience.update).toHaveBeenCalledWith({
          where: { id: experienceId },
          data: {
            completedConfirmed: false,
            overallVerified: false,
          },
        });
        expect(auditPublisher.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'WORK_EXPERIENCE_MANAGER_ENDORSEMENT_DISPUTED',
          }),
        );
        expect(evidenceSync.syncWorkExperienceEvidenceRecord).toHaveBeenCalled();
      });

      it('rejects invalid submit payload before mutating endorsement state', async () => {
        await expect(
          service.submitManagerEndorsement(VALID_MANAGER_TOKEN, {
            confirmed: 'yes',
          } as unknown as { confirmed: boolean }),
        ).rejects.toBeInstanceOf(ZodError);
        expect(prisma.workExperienceManagerEndorsement.findUnique).not.toHaveBeenCalled();
        expect(prisma.workExperienceManagerEndorsement.update).not.toHaveBeenCalled();
        expect(auditPublisher.record).not.toHaveBeenCalled();
        expect(evidenceSync.syncWorkExperienceEvidenceRecord).not.toHaveBeenCalled();
      });

      it('rejects submission for already responded magic link', async () => {
        const mockEndorsement = {
          id: randomUUID(),
          experienceId,
          expiresAt: new Date(Date.now() + 86400000),
          respondedAt: new Date(),
          experience: mockExp,
        };
        prisma.workExperienceManagerEndorsement.findUnique.mockResolvedValue(mockEndorsement);

        await expect(
          service.submitManagerEndorsement(VALID_MANAGER_TOKEN, { confirmed: true }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.workExperienceManagerEndorsement.update).not.toHaveBeenCalled();
      });

      it('rejects submission for expired magic link', async () => {
        const mockEndorsement = {
          id: randomUUID(),
          experienceId,
          expiresAt: new Date(Date.now() - 3600000), // expired 1h ago
          respondedAt: null,
          experience: mockExp,
        };
        prisma.workExperienceManagerEndorsement.findUnique.mockResolvedValue(mockEndorsement);

        await expect(
          service.submitManagerEndorsement(VALID_MANAGER_TOKEN, { confirmed: true }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.workExperienceManagerEndorsement.update).not.toHaveBeenCalled();
        expect(evidenceSync.syncWorkExperienceEvidenceRecord).not.toHaveBeenCalled();
      });

      it('rejects malformed token before database lookup', async () => {
        await expect(
          service.submitManagerEndorsement('short-token', { confirmed: true }),
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(prisma.workExperienceManagerEndorsement.findUnique).not.toHaveBeenCalled();
      });
    });
  });
});

describe('assertStudentControlledProofFileUrl', () => {
  it('accepts storage object keys and data URIs', () => {
    expect(() =>
      assertStudentControlledProofFileUrl('work-experience-proofs/student-1/offer.pdf'),
    ).not.toThrow();
    expect(() =>
      assertStudentControlledProofFileUrl('data:application/pdf;base64,QUJDRA=='),
    ).not.toThrow();
  });

  it('rejects remote HTTP(S) URLs', () => {
    expect(() => assertStudentControlledProofFileUrl('https://evil.example/proof.pdf')).toThrow(
      InvalidStudentProofFileUrlError,
    );
    expect(() => assertStudentControlledProofFileUrl('http://169.254.169.254/')).toThrow(
      InvalidStudentProofFileUrlError,
    );
  });

  it('rejects absolute filesystem paths and traversal', () => {
    expect(() => assertStudentControlledProofFileUrl('/etc/passwd')).toThrow(
      InvalidStudentProofFileUrlError,
    );
    expect(() => assertStudentControlledProofFileUrl('C:\\Windows\\System32\\config\\SAM')).toThrow(
      InvalidStudentProofFileUrlError,
    );
    expect(() => assertStudentControlledProofFileUrl('storage/../secrets/key')).toThrow(
      InvalidStudentProofFileUrlError,
    );
  });
});
