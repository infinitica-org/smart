import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { CandidateEducationService, isEducationEligible } from './candidate-education.service.js';

describe('CandidateEducationService', () => {
  let service: CandidateEducationService;
  let prismaMock: any;

  const studentId = '11111111-1111-4111-8111-111111111111';
  const otherStudentId = '22222222-2222-4222-8222-222222222222';
  const eduId = '33333333-3333-4333-8333-333333333333';
  const instId = '44444444-4444-4444-8444-444444444444';
  const otherInstId = '55555555-5555-4555-8555-555555555555';

  const homeTpoUser: RequestUser = {
    sub: 'admin-1',
    role: 'INSTITUTION_ADMIN',
    inst: instId,
  };

  const crossTpoUser: RequestUser = {
    sub: 'admin-2',
    role: 'INSTITUTION_ADMIN',
    inst: otherInstId,
  };

  const superAdminUser: RequestUser = {
    sub: 'super-1',
    role: 'SUPER_ADMIN',
    inst: null,
  };

  const studentUser: RequestUser = {
    sub: studentId,
    role: 'STUDENT',
    inst: instId,
  };

  beforeEach(() => {
    prismaMock = {
      candidateEducation: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      candidateEducationDocument: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };
    service = new CandidateEducationService(prismaMock as unknown as PrismaService);
  });

  describe('listForStudent', () => {
    it('returns existing candidate education rows with status and rejectionReason', async () => {
      const now = new Date();
      prismaMock.candidateEducation.findMany.mockResolvedValue([
        {
          id: eduId,
          studentId,
          institutionName: 'Harvard University',
          degree: 'B.S.',
          fieldOfStudy: 'Computer Science',
          startDate: '2020-09-01',
          endDate: '2024-05-01',
          current: false,
          grade: '4.0',
          status: 'unverified',
          rejectionReason: null,
          documents: [],
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const result = await service.listForStudent(studentId);
      expect(result).toHaveLength(1);
      expect(result[0].institutionName).toBe('Harvard University');
      expect(result[0].status).toBe('unverified');
      expect(prismaMock.candidateEducation.findMany).toHaveBeenCalledWith({
        where: { studentId },
        include: { documents: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('auto-syncs from user.onboardingDetails if DB has 0 rows', async () => {
      const now = new Date();
      prismaMock.candidateEducation.findMany.mockResolvedValue([]);
      prismaMock.user.findUnique.mockResolvedValue({
        id: studentId,
        onboardingDetails: {
          education: [
            {
              institutionName: 'Oxford',
              degree: 'M.Sc.',
              fieldOfStudy: 'Math',
            },
          ],
        },
      });
      prismaMock.candidateEducation.create.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'Oxford',
        degree: 'M.Sc.',
        fieldOfStudy: 'Math',
        startDate: null,
        endDate: null,
        current: false,
        grade: null,
        status: 'unverified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.listForStudent(studentId);
      expect(result).toHaveLength(1);
      expect(result[0].institutionName).toBe('Oxford');
      expect(result[0].status).toBe('unverified');
      expect(prismaMock.candidateEducation.create).toHaveBeenCalled();
    });
  });

  describe('getForStudent & ownership', () => {
    it('returns candidate education row when student owns it', async () => {
      const now = new Date();
      prismaMock.candidateEducation.findUnique.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'MIT',
        degree: 'B.S.',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: true,
        grade: null,
        status: 'unverified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.getForStudent(studentId, eduId);
      expect(result.institutionName).toBe('MIT');
      expect(result.status).toBe('unverified');
    });

    it('throws NotFoundException if education entry does not exist', async () => {
      prismaMock.candidateEducation.findUnique.mockResolvedValue(null);
      await expect(service.getForStudent(studentId, eduId)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if belonging to another student', async () => {
      const now = new Date();
      prismaMock.candidateEducation.findUnique.mockResolvedValue({
        id: eduId,
        studentId: otherStudentId,
        institutionName: 'MIT',
        degree: 'B.S.',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: true,
        grade: null,
        status: 'unverified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      await expect(service.getForStudent(studentId, eduId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create & update student self-verification prevention', () => {
    it('creates an education entry with default unverified status', async () => {
      const now = new Date();
      prismaMock.candidateEducation.create.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'UC Berkeley',
        degree: 'Ph.D.',
        fieldOfStudy: 'EECS',
        startDate: '2021-08-01',
        endDate: null,
        current: true,
        grade: null,
        status: 'unverified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.create(studentId, {
        institutionName: 'UC Berkeley',
        degree: 'Ph.D.',
        fieldOfStudy: 'EECS',
        startDate: '2021-08-01',
        current: true,
        status: 'verified', // Student tries to self-verify via body
      });

      expect(result.status).toBe('unverified');
      expect(prismaMock.candidateEducation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'unverified',
          rejectionReason: null,
        }),
      });
    });

    it('rejects invalid payload', async () => {
      await expect(service.create(studentId, { institutionName: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('persists degreeDetails for college course metadata', async () => {
      const now = new Date();
      const degreeDetails = {
        rollNumber: '22ALR110',
        currentSemester: 7,
        semestersPerYear: 2,
        lateralEntry: false,
        overallScorePercent: 80.2,
        semesters: [
          { semester: 1, performancePercent: 77.8, backlogsTotal: 0, backlogsOngoing: 0 },
        ],
      };
      prismaMock.candidateEducation.create.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'College · Anna University',
        degree: 'Full-time — B.Tech',
        fieldOfStudy: 'AIML',
        startDate: '2021-01-01',
        endDate: '2026-01-01',
        current: true,
        grade: '8.7 CGPA',
        degreeDetails,
        status: 'unverified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.create(studentId, {
        institutionName: 'College · Anna University',
        degree: 'Full-time — B.Tech',
        fieldOfStudy: 'AIML',
        degreeDetails,
      });

      expect(result.degreeDetails?.rollNumber).toBe('22ALR110');
      expect(prismaMock.candidateEducation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ degreeDetails }),
      });
    });

    it('resets status to unverified when student updates an existing record', async () => {
      const now = new Date();
      prismaMock.candidateEducation.findUnique.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'Stanford',
        degree: 'B.S.',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: false,
        grade: null,
        status: 'verified', // Was previously verified
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      prismaMock.candidateEducation.update.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'Stanford University',
        degree: 'B.S.',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: false,
        grade: null,
        status: 'unverified', // Reset to unverified after edit
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.update(studentId, eduId, {
        institutionName: 'Stanford University',
      });

      expect(result.status).toBe('unverified');
      expect(prismaMock.candidateEducation.update).toHaveBeenCalledWith({
        where: { id: eduId },
        data: expect.objectContaining({
          status: 'unverified',
          rejectionReason: null,
        }),
      });
    });
  });

  describe('delete', () => {
    it('deletes entry when owned by student', async () => {
      const now = new Date();
      prismaMock.candidateEducation.findUnique.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'College of Tech',
        degree: 'B.Tech',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: true,
        grade: null,
        status: 'unverified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });
      prismaMock.candidateEducation.delete.mockResolvedValue({});

      await service.delete(studentId, eduId);
      expect(prismaMock.candidateEducation.delete).toHaveBeenCalledWith({ where: { id: eduId } });
    });
  });

  describe('confirmByHomeCollege', () => {
    it('allows authorized home college TPO to confirm student education claim', async () => {
      const now = new Date();
      prismaMock.candidateEducation.findUnique.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'College of Tech',
        degree: 'B.Tech',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: true,
        grade: null,
        status: 'unverified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: studentId,
        institutionId: instId,
      });

      prismaMock.candidateEducation.update.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'College of Tech',
        degree: 'B.Tech',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: true,
        grade: null,
        status: 'verified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.confirmByHomeCollege(eduId, homeTpoUser);
      expect(result.status).toBe('verified');
      expect(result.rejectionReason).toBeNull();
    });

    it('rejects confirmation by cross-institution TPO', async () => {
      const now = new Date();
      prismaMock.candidateEducation.findUnique.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'College of Tech',
        degree: 'B.Tech',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: true,
        grade: null,
        status: 'unverified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: studentId,
        institutionId: instId,
      });

      await expect(service.confirmByHomeCollege(eduId, crossTpoUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows SUPER_ADMIN to confirm any student education claim', async () => {
      const now = new Date();
      prismaMock.candidateEducation.findUnique.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'College of Tech',
        degree: 'B.Tech',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: true,
        grade: null,
        status: 'unverified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      prismaMock.candidateEducation.update.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'College of Tech',
        degree: 'B.Tech',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: true,
        grade: null,
        status: 'verified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.confirmByHomeCollege(eduId, superAdminUser);
      expect(result.status).toBe('verified');
    });
  });

  describe('rejectByHomeCollege', () => {
    it('allows authorized home college TPO to reject with a mandatory reason', async () => {
      const now = new Date();
      prismaMock.candidateEducation.findUnique.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'College of Tech',
        degree: 'B.Tech',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: true,
        grade: null,
        status: 'unverified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: studentId,
        institutionId: instId,
      });

      prismaMock.candidateEducation.update.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'College of Tech',
        degree: 'B.Tech',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: true,
        grade: null,
        status: 'rejected',
        rejectionReason: 'Invalid degree credentials provided.',
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.rejectByHomeCollege(
        eduId,
        { reason: 'Invalid degree credentials provided.' },
        homeTpoUser,
      );

      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Invalid degree credentials provided.');
    });

    it('fails when rejection reason is missing or empty', async () => {
      await expect(
        service.rejectByHomeCollege(eduId, { reason: '   ' }, homeTpoUser),
      ).rejects.toThrow(BadRequestException);

      await expect(service.rejectByHomeCollege(eduId, {}, homeTpoUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects rejection attempt by cross-institution TPO', async () => {
      const now = new Date();
      prismaMock.candidateEducation.findUnique.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'College of Tech',
        degree: 'B.Tech',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: true,
        grade: null,
        status: 'unverified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: studentId,
        institutionId: instId,
      });

      await expect(
        service.rejectByHomeCollege(eduId, { reason: 'Incorrect data' }, crossTpoUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('isEducationEligible', () => {
    it('returns true ONLY when status is verified', () => {
      expect(isEducationEligible({ status: 'verified' })).toBe(true);
      expect(service.isEducationEligible({ status: 'verified' })).toBe(true);
    });

    it('returns false when status is unverified', () => {
      expect(isEducationEligible({ status: 'unverified' })).toBe(false);
      expect(service.isEducationEligible({ status: 'unverified' })).toBe(false);
    });

    it('returns false when status is rejected', () => {
      expect(isEducationEligible({ status: 'rejected' })).toBe(false);
      expect(service.isEducationEligible({ status: 'rejected' })).toBe(false);
    });

    it('returns false for any other status', () => {
      expect(isEducationEligible({ status: 'in_progress' })).toBe(false);
      expect(isEducationEligible({ status: 'voided' })).toBe(false);
    });
  });

  describe('Student-facing API isolation', () => {
    it('prevents student role from confirming education claims', async () => {
      const now = new Date();
      prismaMock.candidateEducation.findUnique.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'College of Tech',
        degree: 'B.Tech',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: true,
        grade: null,
        status: 'unverified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      await expect(service.confirmByHomeCollege(eduId, studentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('prevents student role from rejecting education claims', async () => {
      const now = new Date();
      prismaMock.candidateEducation.findUnique.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'College of Tech',
        degree: 'B.Tech',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: true,
        grade: null,
        status: 'unverified',
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      await expect(
        service.rejectByHomeCollege(eduId, { reason: 'Student self-rejection' }, studentUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('education proof documents', () => {
    it('attaches proof metadata to an owned education record', async () => {
      const now = new Date();
      prismaMock.candidateEducation.findUnique.mockResolvedValue({
        id: eduId,
        studentId,
        institutionName: 'College of Tech',
        degree: 'B.Tech',
        fieldOfStudy: 'CS',
        startDate: null,
        endDate: null,
        current: true,
        grade: null,
        status: 'unverified',
        rejectionReason: null,
        documents: [],
        createdAt: now,
        updatedAt: now,
      });
      prismaMock.candidateEducationDocument.create.mockResolvedValue({
        id: '66666666-6666-4666-8666-666666666666',
        educationId: eduId,
        documentType: 'DEGREE_CERTIFICATE',
        fileUrl: 'storage/education-proofs/degree.pdf',
        fileName: 'degree.pdf',
        fileSizeBytes: 1200,
        mimeType: 'application/pdf',
        createdAt: now,
      });

      const result = await service.attachDocument(studentId, eduId, {
        documentType: 'DEGREE_CERTIFICATE',
        fileUrl: 'storage/education-proofs/degree.pdf',
        fileName: 'degree.pdf',
        fileSizeBytes: 1200,
        mimeType: 'application/pdf',
      });

      expect(result.fileName).toBe('degree.pdf');
      expect(prismaMock.candidateEducationDocument.create).toHaveBeenCalled();
    });
  });
});
