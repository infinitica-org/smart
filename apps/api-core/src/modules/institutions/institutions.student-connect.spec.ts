import { randomUUID } from 'node:crypto';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InstitutionsPublicController } from './institutions-public.controller.js';
import { InstitutionsStudentController } from './institutions-student.controller.js';
import { InstitutionsService } from './institutions.service.js';

describe('Partner University Connection (STU-01)', () => {
  const studentId = randomUUID();
  const partnerId = randomUUID();
  const unapprovedId = randomUUID();

  describe('InstitutionsPublicController', () => {
    it('listPartnerUniversities passes search query to service', async () => {
      const mockUniversities = [
        { institutionId: partnerId, name: 'PSG College of Technology', domain: 'psgtech.ac.in' },
      ];
      const listPartnerUniversities = vi.fn().mockResolvedValue(mockUniversities);
      const controller = new InstitutionsPublicController({ listPartnerUniversities } as never);

      const result = await controller.listPartnerUniversities('psg');
      expect(result).toEqual(mockUniversities);
      expect(listPartnerUniversities).toHaveBeenCalledWith({ q: 'psg' });
    });
  });

  describe('InstitutionsStudentController', () => {
    it('connectUniversity delegates to service using current user ID', async () => {
      const mockAuthenticatedUser = {
        id: studentId,
        email: 'student@psgtech.ac.in',
        fullName: 'Student User',
        role: 'STUDENT',
        institutionId: partnerId,
      };
      const connectStudentUniversity = vi.fn().mockResolvedValue(mockAuthenticatedUser);
      const controller = new InstitutionsStudentController({ connectStudentUniversity } as never);

      const reqUser = { sub: studentId, role: 'STUDENT', email: 'student@psgtech.ac.in' };
      const result = await controller.connectUniversity(reqUser as never, {
        institutionId: partnerId,
      });

      expect(result).toEqual(mockAuthenticatedUser);
      expect(connectStudentUniversity).toHaveBeenCalledWith(studentId, partnerId);
    });
  });

  describe('InstitutionsService.listPartnerUniversities', () => {
    it('queries approved, active, non-held institutions and maps to DTOs', async () => {
      const mockRows = [{ id: partnerId, name: 'PSG Tech', domain: 'psgtech.ac.in' }];
      const prisma = {
        institution: {
          findMany: vi.fn().mockResolvedValue(mockRows),
        },
      };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
      );

      const result = await service.listPartnerUniversities({ q: 'psg' });

      expect(prisma.institution.findMany).toHaveBeenCalledWith({
        where: {
          verificationStatus: 'APPROVED',
          deactivatedAt: null,
          heldAt: null,
          OR: [
            { name: { contains: 'psg', mode: 'insensitive' } },
            { domain: { contains: 'psg', mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          domain: true,
        },
        orderBy: { name: 'asc' },
      });

      expect(result).toEqual([
        { institutionId: partnerId, name: 'PSG Tech', domain: 'psgtech.ac.in' },
      ]);
    });
  });

  describe('InstitutionsService.connectStudentUniversity', () => {
    it('successfully connects a student to an eligible partner university and records audit', async () => {
      const existingUser = {
        id: studentId,
        email: 'student@example.com',
        fullName: 'Test Student',
        role: 'STUDENT',
        provider: 'PASSWORD',
        emailVerified: true,
        institutionId: null,
        createdAt: new Date(),
        institution: null,
        primaryTrack: null,
        secondaryTrack: null,
      };

      const partnerInst = {
        id: partnerId,
        name: 'PSG College of Technology',
        domain: 'psgtech.ac.in',
        verificationStatus: 'APPROVED',
        deactivatedAt: null,
        heldAt: null,
      };

      const updatedUser = {
        ...existingUser,
        institutionId: partnerId,
        institution: { name: partnerInst.name, heldAt: null, deactivatedAt: null },
      };

      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(existingUser),
          update: vi.fn().mockResolvedValue(updatedUser),
        },
        institution: {
          findFirst: vi.fn().mockResolvedValue(partnerInst),
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

      const result = await service.connectStudentUniversity(studentId, partnerId);

      expect(prisma.institution.findFirst).toHaveBeenCalledWith({
        where: {
          id: partnerId,
          verificationStatus: 'APPROVED',
          deactivatedAt: null,
          heldAt: null,
        },
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: studentId },
        data: { institutionId: partnerId },
        include: {
          institution: true,
          primaryTrack: true,
          secondaryTrack: true,
        },
      });

      expect(auditPublisher.record).toHaveBeenCalledWith({
        actorId: studentId,
        action: 'student.university_connected',
        resourceType: 'user',
        resourceId: studentId,
        reasonCode: null,
      });

      expect(result.institutionId).toBe(partnerId);
    });

    it('returns existing profile without DB update or duplicate audit when student is already connected (idempotency)', async () => {
      const alreadyConnectedUser = {
        id: studentId,
        email: 'student@psgtech.ac.in',
        fullName: 'Test Student',
        role: 'STUDENT',
        provider: 'PASSWORD',
        emailVerified: true,
        institutionId: partnerId,
        createdAt: new Date(),
        institution: { name: 'PSG Tech', heldAt: null, deactivatedAt: null },
        primaryTrack: null,
        secondaryTrack: null,
      };

      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(alreadyConnectedUser),
          update: vi.fn(),
        },
        institution: {
          findFirst: vi.fn(),
        },
      };

      const auditPublisher = {
        record: vi.fn(),
      };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        auditPublisher as never,
        {} as never,
      );

      const result = await service.connectStudentUniversity(studentId, partnerId);

      expect(prisma.institution.findFirst).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(auditPublisher.record).not.toHaveBeenCalled();
      expect(result.institutionId).toBe(partnerId);
    });

    it('throws UnprocessableEntityException (422) if selected university is unapproved or inactive', async () => {
      const existingUser = {
        id: studentId,
        email: 'student@example.com',
        fullName: 'Test Student',
        role: 'STUDENT',
        provider: 'PASSWORD',
        emailVerified: true,
        institutionId: null,
        createdAt: new Date(),
        institution: null,
        primaryTrack: null,
        secondaryTrack: null,
      };

      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(existingUser),
        },
        institution: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
      );

      await expect(service.connectStudentUniversity(studentId, unapprovedId)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws NotFoundException (404) when student user does not exist', async () => {
      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
      );

      await expect(service.connectStudentUniversity(studentId, partnerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('InstitutionsStudentController.getPartnershipStatus', () => {
    it('delegates to service using current student user ID from session', async () => {
      const mockStatus = {
        institutionId: partnerId,
        institutionName: 'PSG College of Technology',
        isPartnered: true,
      };
      const getStudentInstitutionPartnershipStatus = vi.fn().mockResolvedValue(mockStatus);
      const controller = new InstitutionsStudentController({
        getStudentInstitutionPartnershipStatus,
      } as never);

      const reqUser = { sub: studentId, role: 'STUDENT', email: 'student@psgtech.ac.in' };
      const result = await controller.getPartnershipStatus(reqUser as never);

      expect(result).toEqual(mockStatus);
      expect(getStudentInstitutionPartnershipStatus).toHaveBeenCalledWith(studentId);
    });
  });

  describe('InstitutionsService.getStudentInstitutionPartnershipStatus', () => {
    it('returns isPartnered: true for approved, active, non-held institution', async () => {
      const userWithApprovedInst = {
        id: studentId,
        institutionId: partnerId,
        institution: {
          id: partnerId,
          name: 'PSG College of Technology',
          verificationStatus: 'APPROVED',
          deactivatedAt: null,
          heldAt: null,
        },
      };

      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(userWithApprovedInst),
        },
      };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
      );

      const result = await service.getStudentInstitutionPartnershipStatus(studentId);
      expect(result).toEqual({
        institutionId: partnerId,
        institutionName: 'PSG College of Technology',
        isPartnered: true,
      });
    });

    it('returns isPartnered: false for pending institution', async () => {
      const userWithPendingInst = {
        id: studentId,
        institutionId: partnerId,
        institution: {
          id: partnerId,
          name: 'Pending College',
          verificationStatus: 'PENDING',
          deactivatedAt: null,
          heldAt: null,
        },
      };

      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(userWithPendingInst),
        },
      };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
      );

      const result = await service.getStudentInstitutionPartnershipStatus(studentId);
      expect(result).toEqual({
        institutionId: partnerId,
        institutionName: 'Pending College',
        isPartnered: false,
      });
    });

    it('returns isPartnered: false for rejected institution', async () => {
      const userWithRejectedInst = {
        id: studentId,
        institutionId: partnerId,
        institution: {
          id: partnerId,
          name: 'Rejected College',
          verificationStatus: 'REJECTED',
          deactivatedAt: null,
          heldAt: null,
        },
      };

      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(userWithRejectedInst),
        },
      };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
      );

      const result = await service.getStudentInstitutionPartnershipStatus(studentId);
      expect(result).toEqual({
        institutionId: partnerId,
        institutionName: 'Rejected College',
        isPartnered: false,
      });
    });

    it('returns isPartnered: false for deactivated institution', async () => {
      const userWithDeactivatedInst = {
        id: studentId,
        institutionId: partnerId,
        institution: {
          id: partnerId,
          name: 'Deactivated University',
          verificationStatus: 'APPROVED',
          deactivatedAt: new Date(),
          heldAt: null,
        },
      };

      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(userWithDeactivatedInst),
        },
      };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
      );

      const result = await service.getStudentInstitutionPartnershipStatus(studentId);
      expect(result).toEqual({
        institutionId: partnerId,
        institutionName: 'Deactivated University',
        isPartnered: false,
      });
    });

    it('returns isPartnered: false for held institution', async () => {
      const userWithHeldInst = {
        id: studentId,
        institutionId: partnerId,
        institution: {
          id: partnerId,
          name: 'Held University',
          verificationStatus: 'APPROVED',
          deactivatedAt: null,
          heldAt: new Date(),
        },
      };

      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(userWithHeldInst),
        },
      };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
      );

      const result = await service.getStudentInstitutionPartnershipStatus(studentId);
      expect(result).toEqual({
        institutionId: partnerId,
        institutionName: 'Held University',
        isPartnered: false,
      });
    });

    it('returns isPartnered: false with null details when user has no connected institution', async () => {
      const userWithoutInst = {
        id: studentId,
        institutionId: null,
        institution: null,
      };

      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(userWithoutInst),
        },
      };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
      );

      const result = await service.getStudentInstitutionPartnershipStatus(studentId);
      expect(result).toEqual({
        institutionId: null,
        institutionName: null,
        isPartnered: false,
      });
    });

    it('throws NotFoundException (404) when user is not found', async () => {
      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      const service = new InstitutionsService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
      );

      await expect(service.getStudentInstitutionPartnershipStatus(studentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
