import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { UserAdminService } from './user-admin.service.js';

describe('UserAdminService.assignRole', () => {
  it('updates the role for an existing user', async () => {
    const userId = randomUUID();
    const prisma = {
      user: {
        findUnique: vi.fn(async () => ({ id: userId, role: 'STUDENT' })),
        update: vi.fn(async ({ data }: { data: { role: string } }) => ({
          id: userId,
          role: data.role,
        })),
      },
    };
    const service = new UserAdminService(prisma as never, {} as never, {} as never);

    const result = await service.assignRole(userId, 'PLACEMENT_STAFF');

    expect(result).toEqual({ userId, role: 'PLACEMENT_STAFF' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { role: 'PLACEMENT_STAFF' },
    });
  });

  it('rejects an unknown user with 404', async () => {
    const prisma = { user: { findUnique: vi.fn(async () => null) } };
    const service = new UserAdminService(prisma as never, {} as never, {} as never);

    await expect(service.assignRole(randomUUID(), 'STUDENT')).rejects.toMatchObject({
      response: { statusCode: 404 },
    });
  });
});

describe('UserAdminService.holdUser', () => {
  it('holds the user, audits it, and revokes all sessions immediately', async () => {
    const userId = randomUUID();
    const actorId = randomUUID();
    const heldAt = new Date();
    const prisma = {
      user: {
        findUnique: vi.fn(async () => ({ id: userId, role: 'STUDENT' })),
        update: vi.fn(async () => ({ id: userId, heldAt })),
      },
    };
    const auth = { revokeAllForUser: vi.fn() };
    const auditPublisher = { record: vi.fn() };
    const service = new UserAdminService(prisma as never, auth as never, auditPublisher as never);

    const result = await service.holdUser(userId, 'policy violation', actorId);

    expect(result).toEqual({ userId, heldAt: heldAt.toISOString() });
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId, action: 'user.held', resourceId: userId }),
    );
    expect(auth.revokeAllForUser).toHaveBeenCalledWith(userId);
  });

  it('rejects an unknown user with 404', async () => {
    const prisma = { user: { findUnique: vi.fn(async () => null) } };
    const service = new UserAdminService(
      prisma as never,
      { revokeAllForUser: vi.fn() } as never,
      { record: vi.fn() } as never,
    );

    await expect(service.holdUser(randomUUID(), 'reason', randomUUID())).rejects.toMatchObject({
      response: { statusCode: 404 },
    });
  });
});

describe('UserAdminService.releaseUser', () => {
  it('releases the hold, audits it, and does not revoke sessions', async () => {
    const userId = randomUUID();
    const actorId = randomUUID();
    const prisma = {
      user: {
        findUnique: vi.fn(async () => ({ id: userId, role: 'STUDENT' })),
        update: vi.fn(async () => ({ id: userId, heldAt: null })),
      },
    };
    const auth = { revokeAllForUser: vi.fn() };
    const auditPublisher = { record: vi.fn() };
    const service = new UserAdminService(prisma as never, auth as never, auditPublisher as never);

    const result = await service.releaseUser(userId, 'resolved', actorId);

    expect(result).toEqual({ userId, heldAt: null });
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId, action: 'user.hold_released', resourceId: userId }),
    );
    expect(auth.revokeAllForUser).not.toHaveBeenCalled();
  });
});
