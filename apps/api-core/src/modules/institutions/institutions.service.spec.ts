import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InstitutionsService } from './institutions.service.js';

const noopRedis = { get: vi.fn(), setex: vi.fn(), del: vi.fn() };

describe('InstitutionsService Batch Operations', () => {
  const institutionId = randomUUID();
  const invitedById = randomUUID();
  const batchId = randomUUID();

  const fakeBatch = {
    id: batchId,
    institutionId,
    name: 'Class of 2026',
    code: 'CS-2026',
    createdById: invitedById,
    createdAt: new Date(),
  };

  it('TPO can create a batch successfully', async () => {
    const prisma = {
      batch: {
        create: vi.fn().mockResolvedValue(fakeBatch),
      },
    };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );
    const dto = await service.createBatch(
      institutionId,
      { name: 'Class of 2026', code: 'CS-2026' },
      invitedById,
    );
    expect(dto.name).toBe('Class of 2026');
    expect(dto.code).toBe('CS-2026');
    expect(dto.batchId).toBe(batchId);
  });

  it('TPO creating a batch throws ConflictException on duplicate name', async () => {
    const prisma = {
      batch: {
        create: vi.fn().mockRejectedValue(new Error('Unique constraint failed')),
      },
    };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );
    await expect(
      service.createBatch(institutionId, { name: 'Class of 2026' }, invitedById),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('TPO can retrieve their institution batches', async () => {
    const prisma = {
      batch: {
        findMany: vi.fn().mockResolvedValue([fakeBatch]),
      },
      user: {
        count: vi.fn().mockResolvedValue(5),
      },
      invitation: {
        count: vi.fn().mockResolvedValue(2),
      },
    };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );
    const list = await service.listBatches(institutionId);
    expect(list).toHaveLength(1);
    expect(list[0]?.memberCount).toBe(5);
    expect(list[0]?.pendingInviteCount).toBe(2);
  });

  it('TPO can retrieve a single batch belonging to their institution', async () => {
    const prisma = {
      batch: {
        findFirst: vi.fn().mockResolvedValue(fakeBatch),
      },
      user: {
        count: vi.fn().mockResolvedValue(5),
      },
      invitation: {
        count: vi.fn().mockResolvedValue(2),
      },
    };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );
    const batch = await service.getBatch(batchId, institutionId);
    expect(batch.batchId).toBe(batchId);
    expect(batch.name).toBe('Class of 2026');
  });

  it('Retrieve batch throws NotFoundException for cross-institution batch access', async () => {
    const prisma = {
      batch: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );
    await expect(service.getBatch(batchId, 'different-institution-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('TPO can update their institution batch name and code', async () => {
    const prisma = {
      batch: {
        findFirst: vi.fn().mockResolvedValue(fakeBatch),
        update: vi.fn().mockResolvedValue({
          ...fakeBatch,
          name: 'Updated Batch',
          code: 'CS-NEW',
        }),
      },
      user: {
        count: vi.fn().mockResolvedValue(10),
      },
      invitation: {
        count: vi.fn().mockResolvedValue(3),
      },
    };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );
    const updated = await service.updateBatch(batchId, institutionId, {
      name: 'Updated Batch',
      code: 'CS-NEW',
    });
    expect(updated.name).toBe('Updated Batch');
    expect(updated.code).toBe('CS-NEW');
  });

  it('Existing student in the same institution can be assigned to a batch', async () => {
    const studentUser = {
      id: randomUUID(),
      email: 'student@example.edu',
      fullName: 'John Doe',
      role: 'STUDENT',
      institutionId,
      batchId: null,
      groupLabel: null,
      emailVerified: true,
    };
    const prisma = {
      batch: {
        findFirst: vi.fn().mockResolvedValue(fakeBatch),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(studentUser),
        update: vi.fn().mockResolvedValue({
          ...studentUser,
          batchId,
          groupLabel: 'Section A',
        }),
      },
      invitation: {
        findFirst: vi.fn().mockResolvedValue({
          id: randomUUID(),
          email: 'student@example.edu',
          fullName: 'John Doe',
          role: 'STUDENT',
          status: 'PENDING',
          batchId: null,
          groupLabel: null,
          expiresAt: new Date(Date.now() + 864000),
          createdAt: new Date(),
          acceptedAt: null,
          lastSentAt: null,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );
    const result = await service.addBatchMember(
      batchId,
      institutionId,
      { email: 'student@example.edu', fullName: 'John Doe', groupLabel: 'Section A' },
      invitedById,
    );

    expect(result.userId).toBe(studentUser.id);
    expect(result.groupLabel).toBe('Section A');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: studentUser.id },
      data: { batchId, groupLabel: 'Section A' },
    });
    expect(prisma.invitation.update).toHaveBeenCalled();
  });

  it('Assigning student belonging to another institution throws ForbiddenException', async () => {
    const studentUser = {
      id: randomUUID(),
      email: 'another@example.edu',
      fullName: 'Foreign Student',
      role: 'STUDENT',
      institutionId: 'a-different-institution-id',
      batchId: null,
      groupLabel: null,
      emailVerified: true,
    };
    const prisma = {
      batch: {
        findFirst: vi.fn().mockResolvedValue(fakeBatch),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(studentUser),
      },
    };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );
    await expect(
      service.addBatchMember(
        batchId,
        institutionId,
        { email: 'another@example.edu', fullName: 'Foreign Student' },
        invitedById,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('Assigning non-student account throws ConflictException', async () => {
    const adminUser = {
      id: randomUUID(),
      email: 'admin@example.edu',
      fullName: 'Admin User',
      role: 'INSTITUTION_ADMIN',
      institutionId,
      batchId: null,
      groupLabel: null,
      emailVerified: true,
    };
    const prisma = {
      batch: {
        findFirst: vi.fn().mockResolvedValue(fakeBatch),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(adminUser),
      },
    };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );
    await expect(
      service.addBatchMember(
        batchId,
        institutionId,
        { email: 'admin@example.edu', fullName: 'Admin User' },
        invitedById,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('Non-existing student preserves existing invite onboarding flow', async () => {
    const mockInvite = {
      invitationId: randomUUID(),
      email: 'new@example.edu',
      fullName: 'New Student',
      role: 'STUDENT',
      status: 'PENDING',
      batchId,
      groupLabel: null,
      expiresAt: new Date().toISOString(),
      acceptedAt: null,
      lastSentAt: null,
      createdAt: new Date().toISOString(),
    };
    const createdUser = {
      id: randomUUID(),
      email: 'new@example.edu',
      fullName: 'New Student',
      role: 'STUDENT',
      institutionId,
      batchId,
      groupLabel: null,
      emailVerified: false,
    };

    const prisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue({
          id: institutionId,
          name: 'Test Institution',
          domain: 'test.edu',
          verificationStatus: 'APPROVED',
          planId: 'plan-1',
          plan: { code: 'PRO', candidateCapacity: null },
        }),
      },
      featureFlag: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      batch: {
        findFirst: vi.fn().mockResolvedValue(fakeBatch),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirstOrThrow: vi.fn().mockResolvedValue(createdUser),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    const invitations = {
      createAndEnqueue: vi.fn().mockResolvedValue({ invitation: mockInvite }),
    };

    const service = new InstitutionsService(
      prisma as never,
      invitations as never,
      {} as never,
      noopRedis as never,
    );
    const result = await service.addBatchMember(
      batchId,
      institutionId,
      { email: 'new@example.edu', fullName: 'New Student' },
      invitedById,
    );

    expect(result.email).toBe('new@example.edu');
    expect(invitations.createAndEnqueue).toHaveBeenCalledWith({
      email: 'new@example.edu',
      fullName: 'New Student',
      role: 'STUDENT',
      institutionId,
      batchId,
      groupLabel: null,
      invitedById,
      sendEmail: false,
    });
  });

  it('Existing student retains groupLabel if not supplied in request', async () => {
    const studentUser = {
      id: randomUUID(),
      email: 'student@example.edu',
      fullName: 'John Doe',
      role: 'STUDENT',
      institutionId,
      batchId: null,
      groupLabel: 'Existing Group',
      emailVerified: true,
    };
    const prisma = {
      batch: {
        findFirst: vi.fn().mockResolvedValue(fakeBatch),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(studentUser),
        update: vi.fn().mockResolvedValue({
          ...studentUser,
          batchId,
        }),
      },
      invitation: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );
    await service.addBatchMember(
      batchId,
      institutionId,
      { email: 'student@example.edu', fullName: 'John Doe' },
      invitedById,
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: studentUser.id },
      data: { batchId, groupLabel: 'Existing Group' },
    });
  });

  it('TPO can list batch members', async () => {
    const studentUser = {
      id: randomUUID(),
      email: 'student@example.edu',
      fullName: 'John Doe',
      role: 'STUDENT',
      institutionId,
      batchId,
      groupLabel: 'Section A',
      emailVerified: true,
      createdAt: new Date(),
    };
    const prisma = {
      batch: {
        findFirst: vi.fn().mockResolvedValue(fakeBatch),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([studentUser]),
      },
      invitation: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );
    const members = await service.listBatchMembers(batchId, institutionId);
    expect(members).toHaveLength(1);
    expect(members[0]?.fullName).toBe('John Doe');
  });
});

describe('InstitutionsService.searchStudents (S6-VV-66 capability-aware search)', () => {
  const studentId = randomUUID();
  const instId = randomUUID();

  const fakeStudent = {
    id: studentId,
    email: 'jane@example.com',
    fullName: 'Jane Doe',
    institutionId: instId,
    institution: { name: 'PSG Tech' },
    heldAt: null,
  };

  it('still searches by name/email alone (q only, no filters)', async () => {
    const prisma = {
      user: { findMany: vi.fn().mockResolvedValue([fakeStudent]) },
      invitation: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );
    const hits = await service.searchStudents({ q: 'jane' });
    expect(hits).toHaveLength(1);
    const where = (prisma.user.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { fullName: { contains: 'jane', mode: 'insensitive' } },
      { email: { contains: 'jane', mode: 'insensitive' } },
    ]);
    expect(where.skillClaims).toBeUndefined();
    expect(where.institutionId).toEqual({ not: null });
  });

  it('ANDs institution, skill, proficiency, and verification-status filters', async () => {
    const prisma = {
      user: { findMany: vi.fn().mockResolvedValue([fakeStudent]) },
      invitation: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );
    const hits = await service.searchStudents({
      institutionId: instId,
      skillCode: 'js-fundamentals',
      proficiency: 'ADVANCED',
      verificationStatus: 'VERIFIED',
    });
    expect(hits).toHaveLength(1);
    const where = (prisma.user.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(where.institutionId).toBe(instId);
    expect(where.OR).toBeUndefined();
    expect(where.skillClaims).toEqual({
      some: {
        skill: { code: 'js-fundamentals' },
        proficiency: 'ADVANCED',
        status: 'VERIFIED',
      },
    });
  });

  it('combines a name search with capability filters', async () => {
    const prisma = {
      user: { findMany: vi.fn().mockResolvedValue([fakeStudent]) },
      invitation: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );
    await service.searchStudents({ q: 'jane', proficiency: 'BEGINNER' });
    const where = (prisma.user.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { fullName: { contains: 'jane', mode: 'insensitive' } },
      { email: { contains: 'jane', mode: 'insensitive' } },
    ]);
    expect(where.skillClaims).toEqual({ some: { proficiency: 'BEGINNER' } });
  });
});
