import { describe, expect, it, vi } from 'vitest';
import { resolveRecordActors } from './record-actors.js';

describe('resolveRecordActors (S6-VV-105)', () => {
  it('skips the lookup for rows that predate tracking', async () => {
    const prisma = { user: { findMany: vi.fn() } };

    await expect(
      resolveRecordActors(prisma as never, { createdById: null, updatedById: null }),
    ).resolves.toEqual({ createdBy: null, updatedBy: null });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('resolves both ids in one query and tolerates a deleted user', async () => {
    const prisma = {
      user: { findMany: vi.fn().mockResolvedValue([{ id: 'u1', email: 'one@smart.test' }]) },
    };

    const actors = await resolveRecordActors(prisma as never, {
      createdById: 'u1',
      updatedById: 'u-gone',
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1', 'u-gone'] } },
      select: { id: true, email: true },
    });
    expect(actors).toEqual({
      createdBy: { userId: 'u1', email: 'one@smart.test' },
      updatedBy: null,
    });
  });
});
