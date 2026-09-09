import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CandidateLanguagesService } from './candidate-languages.service.js';

describe('CandidateLanguagesService', () => {
  let service: CandidateLanguagesService;
  let prismaMock: any;

  const studentId = '11111111-1111-4111-8111-111111111111';
  const otherStudentId = '22222222-2222-4222-8222-222222222222';
  const langId = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    prismaMock = {
      candidateLanguage: {
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
    service = new CandidateLanguagesService(prismaMock as unknown as PrismaService);
  });

  describe('listForStudent', () => {
    it('returns existing candidate language rows', async () => {
      const now = new Date();
      prismaMock.candidateLanguage.findMany.mockResolvedValue([
        {
          id: langId,
          studentId,
          language: 'English',
          proficiency: 'Native or Bilingual',
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const result = await service.listForStudent(studentId);
      expect(result).toHaveLength(1);
      expect(result[0].language).toBe('English');
      expect(prismaMock.candidateLanguage.findMany).toHaveBeenCalledWith({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('auto-syncs from user.onboardingDetails skills array if DB has 0 rows', async () => {
      const now = new Date();
      prismaMock.candidateLanguage.findMany.mockResolvedValue([]);
      prismaMock.user.findUnique.mockResolvedValue({
        id: studentId,
        onboardingDetails: {
          skills: [
            {
              type: 'language',
              name: 'Spanish',
              proficiency: 'Professional Working',
            },
          ],
        },
      });
      prismaMock.candidateLanguage.create.mockResolvedValue({
        id: langId,
        studentId,
        language: 'Spanish',
        proficiency: 'Professional Working',
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.listForStudent(studentId);
      expect(result).toHaveLength(1);
      expect(result[0].language).toBe('Spanish');
      expect(prismaMock.candidateLanguage.create).toHaveBeenCalled();
    });
  });

  describe('getForStudent & ownership', () => {
    it('returns language entry when student owns it', async () => {
      const now = new Date();
      prismaMock.candidateLanguage.findUnique.mockResolvedValue({
        id: langId,
        studentId,
        language: 'French',
        proficiency: 'Intermediate',
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.getForStudent(studentId, langId);
      expect(result.language).toBe('French');
    });

    it('throws NotFoundException if language entry does not exist', async () => {
      prismaMock.candidateLanguage.findUnique.mockResolvedValue(null);
      await expect(service.getForStudent(studentId, langId)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if belonging to another student', async () => {
      const now = new Date();
      prismaMock.candidateLanguage.findUnique.mockResolvedValue({
        id: langId,
        studentId: otherStudentId,
        language: 'French',
        proficiency: 'Intermediate',
        createdAt: now,
        updatedAt: now,
      });

      await expect(service.getForStudent(studentId, langId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('creates a language entry when payload is valid', async () => {
      const now = new Date();
      prismaMock.candidateLanguage.create.mockResolvedValue({
        id: langId,
        studentId,
        language: 'German',
        proficiency: 'Elementary',
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.create(studentId, {
        language: 'German',
        proficiency: 'Elementary',
      });

      expect(result.language).toBe('German');
      expect(prismaMock.candidateLanguage.create).toHaveBeenCalled();
    });

    it('rejects invalid payload', async () => {
      await expect(service.create(studentId, { language: '', proficiency: '' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('deletes entry when owned by student', async () => {
      const now = new Date();
      prismaMock.candidateLanguage.findUnique.mockResolvedValue({
        id: langId,
        studentId,
        language: 'German',
        proficiency: 'Elementary',
        createdAt: now,
        updatedAt: now,
      });
      prismaMock.candidateLanguage.delete.mockResolvedValue({});

      await service.delete(studentId, langId);
      expect(prismaMock.candidateLanguage.delete).toHaveBeenCalledWith({ where: { id: langId } });
    });
  });
});
