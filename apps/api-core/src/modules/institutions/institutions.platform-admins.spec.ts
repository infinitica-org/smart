import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { InstitutionsService } from './institutions.service.js';

const actorId = randomUUID();

function setup() {
  const auditPublisher = {
    record: vi.fn().mockResolvedValue(undefined),
  };
  const newUserId = randomUUID();
  const prisma = {
    user: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirstOrThrow: vi.fn().mockResolvedValue({
        id: newUserId,
        email: 'new.admin@smart.local',
        fullName: 'New Admin',
        emailVerified: false,
      }),
    },
    invitation: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
  const invitations = {
    createAndEnqueue: vi.fn().mockResolvedValue({
      invitation: { invitationId: randomUUID(), status: 'PENDING' },
      rawToken: 'raw',
    }),
  };
  return {
    prisma,
    invitations,
    auditPublisher,
    newUserId,
    service: new InstitutionsService(
      prisma as never,
      invitations as never,
      auditPublisher as never,
    ),
  };
}

describe('InstitutionsService platform admins', () => {
  it('invites another platform admin with institutionId null and audit-logs the grant', async () => {
    const { service, invitations, auditPublisher } = setup();

    const result = await service.invitePlatformAdmin(
      { fullName: 'New Admin', email: 'new.admin@smart.local', reason: 'Handover to new hire' },
      actorId,
    );

    expect(invitations.createAndEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new.admin@smart.local',
        fullName: 'New Admin',
        role: 'SUPER_ADMIN',
        institutionId: null,
        invitedById: actorId,
      }),
    );
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId,
        action: 'platform_admin.invited',
        resourceType: 'user',
        reasonCode: 'Handover to new hire',
      }),
    );
    expect(result.email).toBe('new.admin@smart.local');
    expect(result.invitation).not.toBeNull();
  });

  it('lists only SUPER_ADMIN users', async () => {
    const { service, prisma } = setup();
    const admin = {
      id: randomUUID(),
      email: 'admin@smart.local',
      fullName: 'SMART Super Admin',
      emailVerified: true,
    };
    prisma.user.findMany.mockResolvedValueOnce([admin]);

    const result = await service.listPlatformAdmins();

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: 'SUPER_ADMIN' } }),
    );
    expect(result).toEqual([
      {
        userId: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        emailVerified: true,
        invitation: null,
      },
    ]);
  });
});
