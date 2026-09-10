import { randomUUID } from 'node:crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WorkExperienceService,
  extractDomain,
  validateEmployerDomain,
} from './work-experience.service.js';

describe('WorkExperienceService', () => {
  let prisma: any;
  let auditPublisher: any;
  let aiGateway: any;
  let service: WorkExperienceService;

  const mockStudentId = randomUUID();

  beforeEach(() => {
    const emailQueue: any = {
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
      organization: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      company: {
        findFirst: vi.fn(),
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

    service = new WorkExperienceService(prisma, auditPublisher, aiGateway, emailQueue);
  });

  describe('create', () => {
    it('creates an ongoing work experience record with offer letter and publishes audit event', async () => {
      const payload = {
        companyName: 'Acme Corp',
        companyWebsite: 'https://acme.com',
        role: 'Senior Developer',
        employmentType: 'FULL_TIME',
        startDate: '2022-01-01T00:00:00.000Z',
        isCurrent: true,
        skillsClaimed: ['GIT_VERSION_CONTROL', 'DATABASE_FUNDAMENTALS'],
        documents: [
          {
            documentType: 'OFFER_LETTER',
            fileUrl: 'storage/proofs/offer.pdf',
            fileName: 'offer.pdf',
            fileSizeBytes: 1024,
            mimeType: 'application/pdf',
          },
        ],
      };

      const mockCreated = {
        id: randomUUID(),
        studentId: mockStudentId,
        companyId: null,
        companyName: payload.companyName,
        companyWebsite: payload.companyWebsite,
        companyLinkedinUrl: null,
        role: payload.role,
        employmentType: payload.employmentType,
        department: null,
        domain: null,
        workLocation: null,
        startDate: new Date(payload.startDate),
        endDate: null,
        isCurrent: true,
        responsibilities: null,
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
        documents: payload.documents,
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
      expect(result.skillsClaimed).toEqual(['GIT_VERSION_CONTROL', 'DATABASE_FUNDAMENTALS']);
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
      const payload = {
        companyName: 'Beta Corp',
        role: 'Developer',
        startDate: '2021-01-01T00:00:00.000Z',
        endDate: '2022-01-01T00:00:00.000Z',
        isCurrent: false,
        documents: [
          {
            documentType: 'OFFER_LETTER',
            fileUrl: 'storage/offer.pdf',
            fileName: 'offer.pdf',
            fileSizeBytes: 1024,
            mimeType: 'application/pdf',
          },
          {
            documentType: 'RELIEVING_LETTER',
            fileUrl: 'storage/relieving.pdf',
            fileName: 'relieving.pdf',
            fileSizeBytes: 1024,
            mimeType: 'application/pdf',
          },
        ],
      };

      prisma.organization.findFirst.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue({ id: 'org-2', name: 'Beta Corp' });
      prisma.company.findFirst.mockResolvedValue(null);
      prisma.workExperience.create.mockResolvedValueOnce({
        id: randomUUID(),
        studentId: mockStudentId,
        companyName: 'Beta Corp',
        role: 'Developer',
        startDate: new Date('2021-01-01'),
        endDate: new Date('2022-01-01'),
        isCurrent: false,
        status: 'SUBMITTED',
        skills: [],
        documents: payload.documents,
      });

      const result = await service.create(mockStudentId, payload);
      expect(result.companyName).toBe('Beta Corp');
    });

    it('rejects creating ongoing role without offer letter', async () => {
      const payload = {
        companyName: 'Acme Corp',
        role: 'Developer',
        startDate: '2022-01-01T00:00:00.000Z',
        isCurrent: true,
        documents: [],
      };

      await expect(service.create(mockStudentId, payload)).rejects.toThrow(BadRequestException);
    });

    it('rejects creating ended role without offer letter', async () => {
      const payload = {
        companyName: 'Acme Corp',
        role: 'Developer',
        startDate: '2022-01-01T00:00:00.000Z',
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
      };

      await expect(service.create(mockStudentId, payload)).rejects.toThrow(BadRequestException);
    });

    it('rejects creating ended role without completion/relieving letter', async () => {
      const payload = {
        companyName: 'Acme Corp',
        role: 'Developer',
        startDate: '2022-01-01T00:00:00.000Z',
        endDate: '2023-01-01T00:00:00.000Z',
        isCurrent: false,
        documents: [
          {
            documentType: 'OFFER_LETTER',
            fileUrl: 'url',
            fileName: 'file.pdf',
            fileSizeBytes: 100,
            mimeType: 'application/pdf',
          },
        ],
      };

      await expect(service.create(mockStudentId, payload)).rejects.toThrow(BadRequestException);
    });

    it('rejects free-text skillsClaimed values outside the taxonomy', async () => {
      await expect(
        service.create(mockStudentId, {
          companyName: 'Acme Corp',
          role: 'Developer',
          startDate: '2022-01-01T00:00:00.000Z',
          isCurrent: true,
          skillsClaimed: ['TypeScript'],
          documents: [
            {
              documentType: 'OFFER_LETTER',
              fileUrl: 'url',
              fileName: 'file.pdf',
              fileSizeBytes: 100,
              mimeType: 'application/pdf',
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects invalid payload without start date or end date when not current', async () => {
      const payload = {
        companyName: 'Acme Corp',
        role: 'Developer',
        isCurrent: false,
        startDate: '2022-01-01T00:00:00.000Z',
        // missing endDate when isCurrent is false
      };

      await expect(service.create(mockStudentId, payload)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('rejects skillsClaimed edits on a verified entry', async () => {
      const expId = randomUUID();
      prisma.workExperience.findUnique.mockResolvedValueOnce({
        id: expId,
        studentId: mockStudentId,
        companyName: 'Acme Corp',
        companyWebsite: null,
        companyLinkedinUrl: null,
        role: 'Developer',
        employmentType: 'FULL_TIME',
        department: null,
        domain: null,
        workLocation: null,
        startDate: new Date('2022-01-01'),
        endDate: null,
        isCurrent: true,
        responsibilities: null,
        skills: ['GIT_VERSION_CONTROL'],
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
      });

      await expect(
        service.update(mockStudentId, expId, { skillsClaimed: ['DATABASE_FUNDAMENTALS'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
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
          skills: ['GIT_VERSION_CONTROL'],
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
        taxonomyVersion: '0.9',
        skillCodes: ['GIT_VERSION_CONTROL'],
      });
    });
  });

  describe('attachDocument', () => {
    it('attaches proof document to an experience entry', async () => {
      const expId = randomUUID();
      const docId = randomUUID();

      prisma.workExperience.findUnique.mockResolvedValueOnce({
        id: expId,
        studentId: mockStudentId,
      });

      prisma.workExperienceDocument.create.mockResolvedValueOnce({
        id: docId,
        experienceId: expId,
        documentType: 'EXPERIENCE_LETTER',
        fileUrl: 'storage/proofs/letter.pdf',
        fileName: 'letter.pdf',
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
        createdAt: new Date(),
      });

      const result = await service.attachDocument(mockStudentId, expId, {
        documentType: 'EXPERIENCE_LETTER',
        fileUrl: 'storage/proofs/letter.pdf',
        fileName: 'letter.pdf',
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
      });

      expect(result.id).toBe(docId);
      expect(result.documentType).toBe('EXPERIENCE_LETTER');
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'WORK_EXPERIENCE_DOCUMENT_ATTACHED',
          resourceType: 'WorkExperienceDocument',
          resourceId: docId,
        }),
      );
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

  describe('validateProofDocument', () => {
    const expId = randomUUID();
    const docId = randomUUID();

    const sampleProofText =
      'EXPERIENCE CERTIFICATE: Candidate John Doe worked at Acme Corporation as Senior Software Engineer from 2022-01-01 to 2023-01-01.';
    const sampleDataUri = `data:application/pdf;base64,${Buffer.from(sampleProofText).toString('base64')}`;

    const mockExpRecord = {
      id: expId,
      studentId: mockStudentId,
      companyName: 'Acme Corporation',
      role: 'Senior Software Engineer',
      startDate: new Date('2022-01-01'),
      endDate: new Date('2023-01-01'),
      status: 'SUBMITTED',
      documents: [
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

    it('accepts an OFFER_LETTER proof document for WE-T01', async () => {
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

      expect(result.validationResult.validationStatus).toBe('VALIDATED');
      expect(result.validationResult.isOfferLetter).toBe(true);
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
          companyName: 'Acme Corp',
          role: 'Software Engineer',
          verifierName: 'Jane Smith',
          verifierEmail: 'jane@acme.com',
          startDate: new Date('2022-01-01'),
          endDate: null,
          isCurrent: true,
          student: { fullName: 'John Candidate' },
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
          verifierEmail: 'manager@acme.com',
          companyWebsite: 'https://www.acme.com',
          companyName: 'Acme Corp',
          role: 'Engineer',
          startDate: new Date('2023-01-01'),
          isCurrent: true,
          student: { fullName: 'Alice Student' },
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
          verifierEmail: 'manager@gmail.com',
          companyWebsite: 'https://acme.com',
          companyName: 'Acme Corp',
          role: 'Engineer',
          startDate: new Date('2023-01-01'),
          isCurrent: true,
          student: { fullName: 'Alice Student' },
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
          verifierEmail: 'manager@differentdomain.com',
          companyWebsite: 'https://acme.com',
          companyName: 'Acme Corp',
          role: 'Engineer',
          startDate: new Date('2023-01-01'),
          isCurrent: true,
          student: { fullName: 'Alice Student' },
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
          verifierEmail: 'manager@acme.com',
          companyWebsite: 'https://acme.com',
          companyName: 'Acme Corp',
          role: 'Engineer',
          startDate: new Date('2023-01-01'),
          isCurrent: true,
          status: 'EXPIRED',
          student: { fullName: 'Alice Student' },
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
          }),
        });
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
            createdAt: new Date(),
            student: { fullName: 'John Doe', email: 'john@student.edu' },
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

        const items = await service.getOpsDashboard();
        expect(items).toHaveLength(1);
        expect(items[0].candidateName).toBe('John Doe');
        expect(items[0].companyName).toBe('Acme Corp');
        expect(items[0].currentStep).toBe('EMPLOYER_DISPATCHED');
        expect(items[0].emailState).toBe('SENT');
      });
    });
  });

  describe('voidWorkExperience (SA-T08)', () => {
    const experienceId = randomUUID();

    it('voids a work-experience entry and writes an immutable audit row', async () => {
      const actorId = randomUUID();
      prisma.workExperience.findUnique.mockResolvedValue({ id: experienceId, status: 'VERIFIED' });
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
    });

    it('404s when voiding a work-experience entry that does not exist', async () => {
      prisma.workExperience.findUnique.mockResolvedValue(null);
      await expect(
        service.voidWorkExperience(randomUUID(), randomUUID(), { reason: 'Does not matter here.' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
