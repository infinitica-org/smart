import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CandidateEducationService } from './candidate-education.service.js';

describe('CandidateEducationService', () => {
  let service: CandidateEducationService;
  let prismaMock: any;

  const studentId = '11111111-1111-4111-8111-111111111111';
  const otherStudentId = '22222222-2222-4222-8222-222222222222';
  const eduId = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    prismaMock = {
      candidateEducation: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };
    service = new CandidateEducationService(prismaMock as unknown as PrismaService);
  });

  describe('listForStudent', () => {
    it('returns existing candidate education rows', async () => {
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
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const result = await service.listForStudent(studentId);
      expect(result).toHaveLength(1);
      expect(result[0].institutionName).toBe('Harvard University');
      expect(prismaMock.candidateEducation.findMany).toHaveBeenCalledWith({
        where: { studentId },
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
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.listForStudent(studentId);
      expect(result).toHaveLength(1);
      expect(result[0].institutionName).toBe('Oxford');
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
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.getForStudent(studentId, eduId);
      expect(result.institutionName).toBe('MIT');
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
        createdAt: now,
        updatedAt: now,
      });

      await expect(service.getForStudent(studentId, eduId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('creates an education entry when payload is valid', async () => {
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
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.create(studentId, {
        institutionName: 'UC Berkeley',
        degree: 'Ph.D.',
        fieldOfStudy: 'EECS',
        startDate: '2021-08-01',
        current: true,
      });

      expect(result.institutionName).toBe('UC Berkeley');
      expect(prismaMock.candidateEducation.create).toHaveBeenCalled();
    });

    it('rejects invalid payload', async () => {
      await expect(service.create(studentId, { institutionName: '' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('deletes entry when owned by student', async () => {
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
        createdAt: now,
        updatedAt: now,
      });
      prismaMock.candidateEducation.delete.mockResolvedValue({});

      await service.delete(studentId, eduId);
      expect(prismaMock.candidateEducation.delete).toHaveBeenCalledWith({ where: { id: eduId } });
    });
  });
});
