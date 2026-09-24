import { randomUUID } from 'node:crypto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InstitutionsTpoController } from './institutions-tpo.controller.js';
import { InstitutionsService } from './institutions.service.js';

const institutionId = randomUUID();
const actorId = randomUUID();
const user = { sub: actorId, inst: institutionId };

describe('InstitutionsTpoController Staff Management', () => {
  it('listStaff delegates to service with user institution ID', async () => {
    const mockStaff = [
      {
        userId: 'user-1',
        fullName: 'Jane Doe',
        email: 'jane@univ.edu',
        role: 'PLACEMENT_STAFF',
        groupLabel: 'CS Dept',
        inviteStatus: 'ACCEPTED',
        lastSentAt: null,
        acceptedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];
    const listInstitutionStaff = vi.fn().mockResolvedValue(mockStaff);
    const controller = new InstitutionsTpoController({ listInstitutionStaff } as never);

    const result = await controller.listStaff(user as never);
    expect(result).toEqual(mockStaff);
    expect(listInstitutionStaff).toHaveBeenCalledWith(institutionId);
  });

  it('listStaff throws ForbiddenException when user has no institution ID', () => {
    const controller = new InstitutionsTpoController({} as never);
    expect(() => controller.listStaff({ sub: actorId } as never)).toThrow(ForbiddenException);
  });

  it('inviteStaff parses request schema and passes payload to service', async () => {
    const inviteResponse = {
      userId: 'user-2',
      fullName: 'John Smith',
      email: 'john@univ.edu',
      role: 'PLACEMENT_STAFF',
      groupLabel: 'Placement Cell',
      inviteStatus: 'PENDING',
      lastSentAt: null,
      acceptedAt: null,
      createdAt: new Date().toISOString(),
    };
    const inviteStaff = vi.fn().mockResolvedValue(inviteResponse);
    const controller = new InstitutionsTpoController({ inviteStaff } as never);

    const payload = {
      email: 'john@univ.edu',
      firstName: 'John',
      lastName: 'Smith',
      role: 'PLACEMENT_STAFF',
      department: 'Placement Cell',
    };

    const result = await controller.inviteStaff(payload, user as never);
    expect(result).toEqual(inviteResponse);
    expect(inviteStaff).toHaveBeenCalledWith(
      institutionId,
      expect.objectContaining({
        email: 'john@univ.edu',
        firstName: 'John',
        lastName: 'Smith',
        role: 'PLACEMENT_STAFF',
        department: 'Placement Cell',
      }),
      actorId,
    );
  });

  it('inviteStaff throws validation error for invalid body', () => {
    const controller = new InstitutionsTpoController({} as never);
    const invalidPayload = {
      email: 'not-an-email',
      firstName: '',
      lastName: '',
      role: 'SUPER_ADMIN',
    };
    expect(() => controller.inviteStaff(invalidPayload, user as never)).toThrow();
  });

  it('updateStaffRole parses body and delegates to service', async () => {
    const targetUserId = randomUUID();
    const updatedResponse = {
      userId: targetUserId,
      fullName: 'Jane Doe',
      email: 'jane@univ.edu',
      role: 'INSTITUTION_ADMIN',
      groupLabel: 'CS Dept',
      inviteStatus: 'ACCEPTED',
      lastSentAt: null,
      acceptedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const updateStaffRole = vi.fn().mockResolvedValue(updatedResponse);
    const controller = new InstitutionsTpoController({ updateStaffRole } as never);

    const result = await controller.updateStaffRole(
      targetUserId,
      { role: 'INSTITUTION_ADMIN' },
      user as never,
    );

    expect(result).toEqual(updatedResponse);
    expect(updateStaffRole).toHaveBeenCalledWith(
      institutionId,
      targetUserId,
      'INSTITUTION_ADMIN',
      actorId,
    );
  });
});

describe('InstitutionsService Staff Operations', () => {
  it('inviteStaff calls InvitationsService createAndEnqueue and writes audit log', async () => {
    const mockCreatedUser = {
      id: 'usr_new_123',
      email: 'officer@univ.edu',
      fullName: 'Officer Bob',
      createdAt: new Date(),
    };

    const mockInvitationsService = {
      createAndEnqueue: vi.fn().mockResolvedValue({
        user: mockCreatedUser,
        invitation: { id: 'inv_123', status: 'PENDING', lastSentAt: null, acceptedAt: null },
      }),
    };

    const mockAuditLog = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    const mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({ id: institutionId, name: 'State University' }),
      },
      user: {
        findFirstOrThrow: vi.fn().mockResolvedValue({
          id: mockCreatedUser.id,
          email: mockCreatedUser.email,
          fullName: mockCreatedUser.fullName,
          groupLabel: 'Engineering',
          createdAt: mockCreatedUser.createdAt,
        }),
      },
    };

    const service = new InstitutionsService(
      mockPrisma as never,
      mockInvitationsService as never,
      mockAuditLog as never,
      {} as never, // redis
    );

    const payload = {
      email: 'officer@univ.edu',
      firstName: 'Officer',
      lastName: 'Bob',
      role: 'PLACEMENT_STAFF' as const,
      department: 'Engineering',
    };

    const res = await service.inviteStaff(institutionId, payload, actorId);

    expect(mockInvitationsService.createAndEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'officer@univ.edu',
        fullName: 'Officer Bob',
        role: 'PLACEMENT_STAFF',
        groupLabel: 'Engineering',
        institutionId,
        invitedById: actorId,
      }),
    );

    expect(mockAuditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId,
        action: 'staff.invited',
        resourceType: 'user',
        resourceId: mockCreatedUser.id,
        metadata: expect.objectContaining({
          email: 'officer@univ.edu',
          role: 'PLACEMENT_STAFF',
          department: 'Engineering',
        }),
      }),
    );

    expect(res).toEqual({
      userId: mockCreatedUser.id,
      fullName: mockCreatedUser.fullName,
      email: mockCreatedUser.email,
      role: 'PLACEMENT_STAFF',
      groupLabel: 'Engineering',
      inviteStatus: 'PENDING',
      lastSentAt: null,
      acceptedAt: null,
      createdAt: mockCreatedUser.createdAt.toISOString(),
    });
  });

  it('updateStaffRole updates role and writes audit log when role changes', async () => {
    const targetUserId = randomUUID();
    const existingUser = {
      id: targetUserId,
      email: 'staff@univ.edu',
      fullName: 'Officer Alice',
      role: 'PLACEMENT_STAFF',
      groupLabel: 'Placement Cell',
      createdAt: new Date(),
    };
    const updatedUser = {
      ...existingUser,
      role: 'INSTITUTION_ADMIN',
    };

    const mockAuditLog = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    const mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({ id: institutionId, name: 'State University' }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(existingUser),
        update: vi.fn().mockResolvedValue(updatedUser),
      },
      invitation: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const service = new InstitutionsService(
      mockPrisma as never,
      {} as never,
      mockAuditLog as never,
      {} as never,
    );

    const res = await service.updateStaffRole(
      institutionId,
      targetUserId,
      'INSTITUTION_ADMIN',
      actorId,
    );

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: targetUserId },
      data: { role: 'INSTITUTION_ADMIN' },
    });

    expect(mockAuditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId,
        action: 'staff.role_updated',
        resourceType: 'user',
        resourceId: targetUserId,
        metadata: expect.objectContaining({
          previousRole: 'PLACEMENT_STAFF',
          newRole: 'INSTITUTION_ADMIN',
        }),
      }),
    );

    expect(res.role).toBe('INSTITUTION_ADMIN');
  });

  it('updateStaffRole is idempotent and skips user.update/audit when role is unchanged', async () => {
    const targetUserId = randomUUID();
    const existingUser = {
      id: targetUserId,
      email: 'staff@univ.edu',
      fullName: 'Officer Alice',
      role: 'PLACEMENT_STAFF',
      groupLabel: 'Placement Cell',
      createdAt: new Date(),
    };

    const mockAuditLog = {
      record: vi.fn(),
    };

    const mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({ id: institutionId, name: 'State University' }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(existingUser),
        update: vi.fn(),
      },
      invitation: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const service = new InstitutionsService(
      mockPrisma as never,
      {} as never,
      mockAuditLog as never,
      {} as never,
    );

    const res = await service.updateStaffRole(
      institutionId,
      targetUserId,
      'PLACEMENT_STAFF',
      actorId,
    );

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockAuditLog.record).not.toHaveBeenCalled();
    expect(res.role).toBe('PLACEMENT_STAFF');
  });

  it('updateStaffRole rejects cross-institution target user', async () => {
    const targetUserId = randomUUID();
    const mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({ id: institutionId, name: 'State University' }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(null), // target user not in institution
      },
    };

    const service = new InstitutionsService(
      mockPrisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.updateStaffRole(institutionId, targetUserId, 'INSTITUTION_ADMIN', actorId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deactivateStaffAccess sets heldAt and writes audit event', async () => {
    const targetUserId = randomUUID();
    const existingUser = {
      id: targetUserId,
      email: 'staff@univ.edu',
      fullName: 'Officer Bob',
      role: 'PLACEMENT_STAFF',
      groupLabel: 'Placement Cell',
      heldAt: null,
      createdAt: new Date(),
    };

    const mockAuditLog = {
      record: vi.fn(),
    };

    const mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({ id: institutionId, name: 'State University' }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(existingUser),
        update: vi
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ ...existingUser, ...data })),
      },
      invitation: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const service = new InstitutionsService(
      mockPrisma as never,
      {} as never,
      mockAuditLog as never,
      {} as never,
    );

    const res = await service.deactivateStaffAccess(institutionId, targetUserId, actorId);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: targetUserId },
        data: expect.objectContaining({
          heldReason: 'Deactivated by administrator',
        }),
      }),
    );
    expect(res.heldAt).toBeDefined();
    expect(mockAuditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'staff.access_deactivated',
        resourceId: targetUserId,
      }),
    );
  });

  it('deactivateStaffAccess is idempotent when target user is already deactivated', async () => {
    const targetUserId = randomUUID();
    const alreadyDeactivatedUser = {
      id: targetUserId,
      email: 'staff@univ.edu',
      fullName: 'Officer Bob',
      role: 'PLACEMENT_STAFF',
      groupLabel: 'Placement Cell',
      heldAt: new Date(),
      createdAt: new Date(),
    };

    const mockAuditLog = {
      record: vi.fn(),
    };

    const mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({ id: institutionId, name: 'State University' }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(alreadyDeactivatedUser),
        update: vi.fn(),
      },
      invitation: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const service = new InstitutionsService(
      mockPrisma as never,
      {} as never,
      mockAuditLog as never,
      {} as never,
    );

    const res = await service.deactivateStaffAccess(institutionId, targetUserId, actorId);

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockAuditLog.record).not.toHaveBeenCalled();
    expect(res.heldAt).toBe(alreadyDeactivatedUser.heldAt.toISOString());
  });

  it('updateStaffCampusAccess updates staff campus and pending invitation, and records audit event', async () => {
    const targetUserId = randomUUID();
    const invitationId = randomUUID();
    const existingUser = {
      id: targetUserId,
      email: 'staff@univ.edu',
      fullName: 'Jane Admin',
      role: 'PLACEMENT_STAFF',
      groupLabel: null,
      heldAt: null,
      createdAt: new Date(),
    };

    const updatedUser = {
      ...existingUser,
      groupLabel: 'North Campus',
    };

    const mockAuditLog = {
      record: vi.fn(),
    };

    const mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({ id: institutionId, name: 'State University' }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(existingUser),
        update: vi.fn().mockResolvedValue(updatedUser),
      },
      invitation: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: invitationId, status: 'PENDING', groupLabel: null }),
        update: vi.fn().mockResolvedValue({ id: invitationId, groupLabel: 'North Campus' }),
      },
    };

    const service = new InstitutionsService(
      mockPrisma as never,
      {} as never,
      mockAuditLog as never,
      {} as never,
    );

    const res = await service.updateStaffCampusAccess(
      institutionId,
      targetUserId,
      'North Campus',
      actorId,
    );

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: targetUserId },
      data: { groupLabel: 'North Campus' },
    });
    expect(mockPrisma.invitation.update).toHaveBeenCalledWith({
      where: { id: invitationId },
      data: { groupLabel: 'North Campus' },
    });
    expect(res.groupLabel).toBe('North Campus');
    expect(mockAuditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'staff.campus_access_updated',
        resourceId: targetUserId,
        metadata: expect.objectContaining({
          institutionId,
          previousCampusId: null,
          newCampusId: 'North Campus',
        }),
      }),
    );
  });

  it('updateStaffCampusAccess clears campus restriction when campus is null or empty', async () => {
    const targetUserId = randomUUID();
    const existingUser = {
      id: targetUserId,
      email: 'staff@univ.edu',
      fullName: 'Jane Admin',
      role: 'PLACEMENT_STAFF',
      groupLabel: 'Main Campus',
      heldAt: null,
      createdAt: new Date(),
    };

    const updatedUser = {
      ...existingUser,
      groupLabel: null,
    };

    const mockAuditLog = {
      record: vi.fn(),
    };

    const mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({ id: institutionId, name: 'State University' }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(existingUser),
        update: vi.fn().mockResolvedValue(updatedUser),
      },
      invitation: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const service = new InstitutionsService(
      mockPrisma as never,
      {} as never,
      mockAuditLog as never,
      {} as never,
    );

    const res = await service.updateStaffCampusAccess(institutionId, targetUserId, null, actorId);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: targetUserId },
      data: { groupLabel: null },
    });
    expect(res.groupLabel).toBeNull();
  });

  it('updateStaffCampusAccess is idempotent when campus label is unchanged', async () => {
    const targetUserId = randomUUID();
    const existingUser = {
      id: targetUserId,
      email: 'staff@univ.edu',
      fullName: 'Jane Admin',
      role: 'PLACEMENT_STAFF',
      groupLabel: 'South Campus',
      heldAt: null,
      createdAt: new Date(),
    };

    const mockAuditLog = {
      record: vi.fn(),
    };

    const mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({ id: institutionId, name: 'State University' }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(existingUser),
        update: vi.fn(),
      },
      invitation: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const service = new InstitutionsService(
      mockPrisma as never,
      {} as never,
      mockAuditLog as never,
      {} as never,
    );

    const res = await service.updateStaffCampusAccess(
      institutionId,
      targetUserId,
      'South Campus',
      actorId,
    );

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockAuditLog.record).not.toHaveBeenCalled();
    expect(res.groupLabel).toBe('South Campus');
  });

  it('updateStaffCampusAccess rejects target staff belonging to another institution', async () => {
    const targetUserId = randomUUID();
    const mockAuditLog = {
      record: vi.fn(),
    };
    const mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({ id: institutionId, name: 'State University' }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const service = new InstitutionsService(
      mockPrisma as never,
      {} as never,
      mockAuditLog as never,
      {} as never,
    );

    await expect(
      service.updateStaffCampusAccess(institutionId, targetUserId, 'Main Campus', actorId),
    ).rejects.toThrow(NotFoundException);
  });

  it('listAssignedStudents filters students matching advisor groupLabel', async () => {
    const advisorUser = {
      id: actorId,
      institutionId,
      role: 'PLACEMENT_STAFF',
      groupLabel: 'CS Dept',
    };
    const matchingStudent = {
      id: randomUUID(),
      email: 'student1@univ.edu',
      fullName: 'Alice Smith',
      role: 'STUDENT',
      groupLabel: 'CS Dept',
      batchId: null,
      batch: null,
      heldAt: null,
      onboardingDetails: null,
    };

    const mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({ id: institutionId, name: 'State University' }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(advisorUser),
        findMany: vi.fn().mockResolvedValue([matchingStudent]),
      },
      invitation: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const service = new InstitutionsService(
      mockPrisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const res = await service.listAssignedStudents(institutionId, actorId);

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          institutionId,
          role: 'STUDENT',
          groupLabel: 'CS Dept',
        }),
      }),
    );
    expect(res).toHaveLength(1);
    expect(res[0]?.email).toBe('student1@univ.edu');
  });

  it('listAssignedStudents returns all institution students when advisor groupLabel is null', async () => {
    const advisorUser = {
      id: actorId,
      institutionId,
      role: 'INSTITUTION_ADMIN',
      groupLabel: null,
    };
    const student1 = {
      id: randomUUID(),
      email: 'student1@univ.edu',
      fullName: 'Alice Smith',
      role: 'STUDENT',
      groupLabel: 'CS Dept',
      batchId: null,
      batch: null,
      heldAt: null,
      onboardingDetails: null,
    };

    const mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({ id: institutionId, name: 'State University' }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(advisorUser),
        findMany: vi.fn().mockResolvedValue([student1]),
      },
      invitation: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const service = new InstitutionsService(
      mockPrisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const res = await service.listAssignedStudents(institutionId, actorId);

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          institutionId,
          role: 'STUDENT',
        },
      }),
    );
    expect(res).toHaveLength(1);
  });

  it('listAssignedStudents returns [] when no students match advisor groupLabel', async () => {
    const advisorUser = {
      id: actorId,
      institutionId,
      role: 'PLACEMENT_STAFF',
      groupLabel: 'Physics Dept',
    };

    const mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({ id: institutionId, name: 'State University' }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(advisorUser),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const service = new InstitutionsService(
      mockPrisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const res = await service.listAssignedStudents(institutionId, actorId);

    expect(res).toEqual([]);
  });

  it('listAssignedStudents rejects advisor belonging to another institution', async () => {
    const mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({ id: institutionId, name: 'State University' }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const service = new InstitutionsService(
      mockPrisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.listAssignedStudents(institutionId, actorId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
