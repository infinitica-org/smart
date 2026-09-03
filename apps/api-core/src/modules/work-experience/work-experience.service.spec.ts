import { randomUUID } from 'node:crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkExperienceService } from './work-experience.service.js';

describe('WorkExperienceService', () => {
  let prisma: any;
  let auditPublisher: any;
  let aiGateway: any;
  let service: WorkExperienceService;

  const mockStudentId = randomUUID();

  beforeEach(() => {
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
      company: {
        findFirst: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: mockStudentId,
          fullName: 'John Doe',
        }),
      },
    };

    auditPublisher = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    aiGateway = {
      complete: vi.fn(),
    };

    service = new WorkExperienceService(prisma, auditPublisher, aiGateway);
  });

  describe('create', () => {
    it('creates a work experience record and publishes audit event', async () => {
      const payload = {
        companyName: 'Acme Corp',
        companyWebsite: 'https://acme.com',
        role: 'Senior Developer',
        employmentType: 'FULL_TIME',
        startDate: '2022-01-01T00:00:00.000Z',
        isCurrent: true,
        skills: ['TypeScript', 'Node.js'],
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
        skills: payload.skills,
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
      };

      prisma.company.findFirst.mockResolvedValueOnce(null);
      prisma.workExperience.create.mockResolvedValueOnce(mockCreated);

      const result = await service.create(mockStudentId, payload);

      expect(result.companyName).toBe('Acme Corp');
      expect(result.status).toBe('SUBMITTED');
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockStudentId,
          action: 'WORK_EXPERIENCE_SUBMITTED',
          resourceType: 'WorkExperience',
          resourceId: mockCreated.id,
        }),
      );
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

    it('rejects an OFFER_LETTER proof document and marks experience as REJECTED', async () => {
      prisma.workExperience.findUnique.mockResolvedValueOnce(mockExpRecord);
      prisma.workExperienceDocument.update.mockResolvedValueOnce({});
      prisma.workExperience.update.mockResolvedValueOnce({
        ...mockExpRecord,
        status: 'REJECTED',
        rejectionReason: 'Uploaded document is an offer letter or appointment agreement',
      });

      aiGateway.complete.mockResolvedValueOnce({
        output: {
          documentType: 'OFFER_LETTER',
          isActualEmploymentProof: false,
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
      expect(result.experienceStatus).toBe('REJECTED');
      expect(result.validationResult.isOfferLetter).toBe(true);
      expect(result.validationResult.rejectionReason).toContain('offer letter');
      expect(prisma.workExperience.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: expId },
          data: expect.objectContaining({ status: 'REJECTED' }),
        }),
      );
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

    it('rejects validation when document role does not match submitted role', async () => {
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
          companyName: 'Acme Corporation',
          role: 'Graphic Designer',
          startDate: '2022-01-01',
          endDate: '2023-01-01',
          confidence: 0.95,
        },
      });

      const result = await service.validateProofDocument(mockStudentId, expId, docId);

      expect(result.validationResult.validationStatus).toBe('REJECTED');
      expect(result.validationResult.matchResult.roleMatch).toBe(false);
      expect(result.validationResult.rejectionReason).toContain('Graphic Designer');
    });

    it('rejects validation when employment dates are missing or invalid', async () => {
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
          companyName: 'Acme Corporation',
          role: 'Senior Software Engineer',
          startDate: null,
          endDate: null,
          confidence: 0.9,
        },
      });

      const result = await service.validateProofDocument(mockStudentId, expId, docId);

      expect(result.validationResult.validationStatus).toBe('REJECTED');
      expect(result.validationResult.matchResult.dateMatch).toBe(false);
      expect(result.validationResult.rejectionReason).toContain('employment dates');
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
});
