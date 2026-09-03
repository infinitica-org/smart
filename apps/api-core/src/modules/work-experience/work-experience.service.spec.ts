import { randomUUID } from 'node:crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkExperienceService } from './work-experience.service.js';

describe('WorkExperienceService', () => {
  let prisma: any;
  let auditPublisher: any;
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
        delete: vi.fn(),
      },
      company: {
        findFirst: vi.fn(),
      },
    };

    auditPublisher = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    service = new WorkExperienceService(prisma, auditPublisher);
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
});
