import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { InstitutionsService } from './institutions.service.js';

const institutionId = randomUUID();
const batchId = randomUUID();
const actorId = randomUUID();
const mapping = { fullName: 'Student Name', email: 'Email Address', groupLabel: 'Department' };

type ExistingUser = {
  id: string;
  email: string;
  role: 'STUDENT';
  institutionId: string;
  heldAt: Date | null;
};

function setup(existingUsers: ExistingUser[] = [], pendingInvitationCount = 1) {
  const prisma = {
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    batch: { findFirst: vi.fn().mockResolvedValue({ id: batchId, institutionId }) },
    user: {
      findMany: vi.fn().mockResolvedValue(existingUsers),
      findUnique: vi
        .fn()
        .mockImplementation(({ where }: { where: { email: string } }) =>
          Promise.resolve(existingUsers.find((user) => user.email === where.email) ?? null),
        ),
      update: vi
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) =>
          Promise.resolve(existingUsers.find((user) => user.id === where.id)),
        ),
      findFirstOrThrow: vi.fn().mockResolvedValue({
        id: randomUUID(),
        email: 'john.student@example.test',
        role: 'STUDENT',
        institutionId,
        batchId,
      }),
    },
    invitation: {
      count: vi.fn().mockResolvedValue(pendingInvitationCount),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
  const invitations = {
    createAndEnqueue: vi.fn().mockResolvedValue({ invitation: {} }),
    enqueueForBatch: vi.fn().mockResolvedValue(4),
  };
  return {
    prisma,
    invitations,
    service: new InstitutionsService(prisma as never, invitations as never),
  };
}

const csv = (email = 'john.student@example.test') =>
  Buffer.from(`Student Name,Email Address,Department\nJohn Student,${email},Engineering`);

describe('InstitutionsService import execution and observability', () => {
  it('reassigns existing students without clearing heldAt', async () => {
    const heldAt = new Date();
    const student: ExistingUser = {
      id: randomUUID(),
      email: 'existing.student@example.test',
      role: 'STUDENT',
      institutionId,
      heldAt,
    };
    const { service, prisma, invitations } = setup([student]);
    const result = await service.importBatchMembers(
      batchId,
      institutionId,
      csv(student.email),
      'candidates.csv',
      'text/csv',
      actorId,
      mapping,
    );
    expect(result).toMatchObject({ imported: 1, existingStudents: 1, newAccounts: 0 });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: student.id },
      data: { batchId, groupLabel: 'Engineering' },
    });
    expect(prisma.user.update.mock.calls[0]?.[0].data).not.toHaveProperty('heldAt');
    expect(invitations.createAndEnqueue).not.toHaveBeenCalled();
  });

  it('reports the batch-wide pending count that sendBatchInvites will enqueue', async () => {
    const { service, prisma, invitations } = setup([], 7);
    const result = await service.importBatchMembers(
      batchId,
      institutionId,
      csv(),
      'candidates.csv',
      'text/csv',
      actorId,
      mapping,
    );
    expect(result.pendingInvitations).toBe(7);
    expect(result.newAccounts).toBe(1);
    expect(prisma.invitation.count).toHaveBeenCalledWith({
      where: { batchId, status: 'PENDING' },
    });
    expect(invitations.createAndEnqueue).toHaveBeenCalledTimes(1);
    await expect(service.sendBatchInvites(batchId, institutionId)).resolves.toEqual({
      enqueued: 4,
    });
    expect(invitations.enqueueForBatch).toHaveBeenCalledWith(batchId, institutionId);
  });

  it('writes a PII-safe audit record after a partial import', async () => {
    const { service, prisma } = setup();
    await service.importBatchMembers(
      batchId,
      institutionId,
      csv(),
      'candidates.csv',
      'text/csv',
      actorId,
      mapping,
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'batch.members_imported',
        resourceType: 'batch',
        resourceId: batchId,
        metadata: expect.not.objectContaining({ email: expect.anything() }),
      }),
    });
  });
});
