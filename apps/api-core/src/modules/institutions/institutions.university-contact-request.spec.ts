import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { RequestUniversityContactRequestSchema } from '@smart/contracts';
import { InstitutionsStudentController } from './institutions-student.controller.js';
import { InstitutionsService } from './institutions.service.js';

describe('University Contact Request (STU-01)', () => {
  const studentId = randomUUID();
  const requestId = randomUUID();

  describe('InstitutionsStudentController.requestUniversityContact', () => {
    it('delegates to service with parsed university name and current user ID', async () => {
      const mockResult = {
        id: requestId,
        universityName: 'Anna University',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      const requestUniversityContact = vi.fn().mockResolvedValue(mockResult);
      const controller = new InstitutionsStudentController({ requestUniversityContact } as never);

      const reqUser = { sub: studentId, role: 'STUDENT', email: 'student@example.com' };
      const result = await controller.requestUniversityContact(reqUser as never, {
        universityName: 'Anna University',
      });

      expect(result).toEqual(mockResult);
      expect(requestUniversityContact).toHaveBeenCalledWith(studentId, 'Anna University');
    });

    it('throws when the request body fails schema validation (empty name)', () => {
      expect(() => RequestUniversityContactRequestSchema.parse({ universityName: '' })).toThrow();
      expect(() => RequestUniversityContactRequestSchema.parse({ universityName: 'x' })).toThrow();
    });
  });

  describe('InstitutionsService.requestUniversityContact', () => {
    it('creates a request and records an audit event on first submission', async () => {
      const createdRow = {
        id: requestId,
        universityName: 'Anna University',
        status: 'PENDING',
        createdAt: new Date(),
      };

      const prisma = {
        universityContactRequest: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(createdRow),
        },
      };

      const auditPublisher = {
        record: vi.fn().mockResolvedValue(undefined),
      };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        auditPublisher as never,
        {} as never,
      );

      const result = await service.requestUniversityContact(studentId, '  Anna University  ');

      expect(prisma.universityContactRequest.findUnique).toHaveBeenCalledWith({
        where: {
          studentUserId_normalizedUniversityName: {
            studentUserId: studentId,
            normalizedUniversityName: 'anna university',
          },
        },
      });

      expect(prisma.universityContactRequest.create).toHaveBeenCalledWith({
        data: {
          studentUserId: studentId,
          universityName: 'Anna University',
          normalizedUniversityName: 'anna university',
        },
      });

      expect(auditPublisher.record).toHaveBeenCalledWith({
        actorId: studentId,
        action: 'student.university_contact_requested',
        resourceType: 'university_contact_request',
        resourceId: requestId,
        reasonCode: null,
        metadata: { universityName: 'Anna University' },
      });

      expect(result).toEqual({
        id: requestId,
        universityName: 'Anna University',
        status: 'PENDING',
        createdAt: createdRow.createdAt.toISOString(),
      });
    });

    it('returns the existing request without creating a duplicate or re-recording audit (idempotency)', async () => {
      const existingRow = {
        id: requestId,
        universityName: 'Anna University',
        status: 'PENDING',
        createdAt: new Date(),
      };

      const prisma = {
        universityContactRequest: {
          findUnique: vi.fn().mockResolvedValue(existingRow),
          create: vi.fn(),
        },
      };

      const auditPublisher = { record: vi.fn() };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        auditPublisher as never,
        {} as never,
      );

      const result = await service.requestUniversityContact(studentId, 'Anna University');

      expect(prisma.universityContactRequest.create).not.toHaveBeenCalled();
      expect(auditPublisher.record).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: requestId,
        universityName: 'Anna University',
        status: 'PENDING',
        createdAt: existingRow.createdAt.toISOString(),
      });
    });

    it('normalizes case and surrounding whitespace to the same dedup key', async () => {
      const prisma = {
        universityContactRequest: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: requestId,
            universityName: 'MIT',
            status: 'PENDING',
            createdAt: new Date(),
          }),
        },
      };
      const auditPublisher = { record: vi.fn().mockResolvedValue(undefined) };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        auditPublisher as never,
        {} as never,
      );

      await service.requestUniversityContact(studentId, ' mit ');

      expect(prisma.universityContactRequest.findUnique).toHaveBeenCalledWith({
        where: {
          studentUserId_normalizedUniversityName: {
            studentUserId: studentId,
            normalizedUniversityName: 'mit',
          },
        },
      });
    });

    it('resolves a concurrent duplicate (P2002 race) by returning the row created by the winner', async () => {
      const racedRow = {
        id: requestId,
        universityName: 'Anna University',
        status: 'PENDING',
        createdAt: new Date(),
      };

      const prisma = {
        universityContactRequest: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi
            .fn()
            .mockRejectedValue(
              Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
            ),
          findUniqueOrThrow: vi.fn().mockResolvedValue(racedRow),
        },
      };

      const auditPublisher = { record: vi.fn() };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        auditPublisher as never,
        {} as never,
      );

      const result = await service.requestUniversityContact(studentId, 'Anna University');

      expect(prisma.universityContactRequest.findUniqueOrThrow).toHaveBeenCalledWith({
        where: {
          studentUserId_normalizedUniversityName: {
            studentUserId: studentId,
            normalizedUniversityName: 'anna university',
          },
        },
      });
      expect(auditPublisher.record).not.toHaveBeenCalled();
      expect(result.id).toBe(requestId);
    });
  });
});
