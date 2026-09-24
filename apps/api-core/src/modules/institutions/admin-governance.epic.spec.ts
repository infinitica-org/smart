import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { InstitutionsService } from './institutions.service.js';

const institutionId = randomUUID();
const adminUserId = randomUUID();

function setupAdminEpicTest() {
  const auditPublisher = {
    record: vi.fn().mockResolvedValue(undefined),
  };

  const prisma: any = {
    institution: {
      count: vi.fn().mockResolvedValue(12),
      findUnique: vi.fn().mockResolvedValue({
        id: institutionId,
        name: 'Stanford University',
        status: 'VERIFIED',
        heldAt: null,
        deactivatedAt: null,
        createdAt: new Date(),
        planId: 'plan-1',
        plan: { code: 'PRO', candidateCapacity: 1000 },
      }),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: institutionId,
          name: 'Stanford University',
          status: 'VERIFIED',
          heldAt: data.heldAt !== undefined ? data.heldAt : null,
          deactivatedAt: null,
          createdAt: new Date(),
          planId: data.planId ?? 'plan-1',
          plan: { code: 'PRO', candidateCapacity: 1000 },
        }),
      ),
    },
    company: {
      count: vi.fn().mockResolvedValue(45),
    },
    user: {
      count: vi.fn().mockResolvedValue(3500),
      findMany: vi.fn().mockResolvedValue([
        {
          id: adminUserId,
          email: 'admin@smart.test',
          fullName: 'Super Admin',
          role: 'SUPER_ADMIN',
          emailVerified: true,
        },
      ]),
      findUnique: vi.fn().mockResolvedValue({
        id: adminUserId,
        email: 'admin@smart.test',
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
        emailVerified: true,
      }),
      findFirstOrThrow: vi.fn().mockResolvedValue({
        id: adminUserId,
        email: 'newadmin@smart.test',
        fullName: 'Platform Admin',
        role: 'SUPER_ADMIN',
        emailVerified: false,
      }),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    attempt: {
      count: vi.fn().mockResolvedValue(5),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    jobOpening: {
      count: vi.fn().mockResolvedValue(120),
    },
    companyVerification: {
      count: vi.fn().mockResolvedValue(3),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([
        {
          id: randomUUID(),
          actorId: adminUserId,
          action: 'institution.held',
          resourceType: 'institution',
          resourceId: institutionId,
          reasonCode: 'administrative_hold',
          createdAt: new Date(),
          actor: { email: 'admin@smart.test', role: 'SUPER_ADMIN' },
        },
      ]),
      count: vi.fn().mockResolvedValue(1),
    },
    invitation: {
      groupBy: vi.fn().mockResolvedValue([]),
    },
    batch: {
      groupBy: vi.fn().mockResolvedValue([]),
    },
    featureFlag: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'flag-1',
          key: 'bulk_batch_import',
          name: 'Bulk Batch Import',
          overrides: [],
          entitlements: [],
        },
      ]),
      findUnique: vi.fn().mockResolvedValue({
        id: 'flag-1',
        key: 'bulk_batch_import',
        name: 'Bulk Batch Import',
      }),
    },
    featureFlagOverride: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'override-1',
        institutionId,
        featureFlagId: 'flag-1',
        enabled: true,
      }),
      update: vi.fn().mockResolvedValue({
        id: 'override-1',
        institutionId,
        featureFlagId: 'flag-1',
        enabled: true,
      }),
      upsert: vi.fn().mockResolvedValue({
        flagKey: 'bulk_batch_import',
        tenantType: 'INSTITUTION',
        tenantId: institutionId,
        enabled: true,
      }),
    },
    subscriptionPlan: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'plan-1',
        code: 'PRO',
        name: 'Professional',
        candidateCapacity: 2500,
        entitlements: [],
      }),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'plan-1',
          code: 'PRO',
          name: 'Professional',
          candidateCapacity: 2500,
          entitlements: [],
          _count: { institutions: 12 },
        },
      ]),
      update: vi.fn().mockResolvedValue({
        id: 'plan-1',
        code: 'PRO',
        name: 'Professional',
        candidateCapacity: 2500,
      }),
    },
    institutionInvitation: {
      groupBy: vi.fn().mockResolvedValue([]),
    },
    studentBatch: {
      groupBy: vi.fn().mockResolvedValue([]),
    },
  };

  const service = new InstitutionsService(
    prisma as never,
    {
      createAndEnqueue: vi
        .fn()
        .mockResolvedValue({ invitation: { id: randomUUID(), code: 'INV-1' } }),
    } as never,
    auditPublisher as never,
    { get: vi.fn(), setex: vi.fn(), del: vi.fn() } as never,
    {} as never,
  );

  return { service, prisma, auditPublisher };
}

describe('Epic ADMIN-01: Superadmin Platform Governance & Audit Logging (Th6-I501..Th6-I506)', () => {
  it('Th6-I501: calculates superadmin platform dashboard metrics', async () => {
    const { service, prisma } = setupAdminEpicTest();
    const dashboard = await service.getDashboard();

    expect(prisma.institution.count).toHaveBeenCalled();
    expect(prisma.company.count).toHaveBeenCalled();
    expect(prisma.user.count).toHaveBeenCalled();
    expect(dashboard.institutions.total).toBe(12);
    expect(dashboard.companies.total).toBe(45);
    expect(dashboard.students.total).toBe(3500);
  });

  it('Th6-I502: searches and filters multi-tenant audit logs by section tab', async () => {
    const { service, prisma } = setupAdminEpicTest();
    const logs = await service.listAuditLogs({
      section: 'TPO',
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalled();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('institution.held');
  });

  it('Th6-I503: handles institution hold and release actions with reason audit logging', async () => {
    const { service, prisma, auditPublisher } = setupAdminEpicTest();

    const held = await service.holdInstitution(
      institutionId,
      { reason: 'Policy review required' },
      adminUserId,
    );
    expect(prisma.institution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: institutionId },
        data: expect.objectContaining({ heldAt: expect.any(Date) }),
      }),
    );
    expect(held).toBeDefined();
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'institution.held' }),
    );

    const released = await service.releaseHold(
      institutionId,
      { reason: 'Review completed' },
      adminUserId,
    );
    expect(prisma.institution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: institutionId },
        data: expect.objectContaining({ heldAt: null }),
      }),
    );
    expect(released).toBeDefined();
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'institution.hold_released' }),
    );
  });

  it('Th6-I504: configures tenant feature flag overrides', async () => {
    const { service, prisma, auditPublisher } = setupAdminEpicTest();
    const override = await service.setInstitutionFlagOverride(
      institutionId,
      {
        key: 'bulk_batch_import',
        enabled: true,
      },
      adminUserId,
    );

    expect(prisma.featureFlagOverride.create).toHaveBeenCalled();
    expect(override).toBeDefined();
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'institution.flag_override' }),
    );
  });

  it('Th6-I505: updates subscription plan candidate capacity limit', async () => {
    const { service, prisma, auditPublisher } = setupAdminEpicTest();
    const updated = await service.updatePlanCapacity(
      'plan-1',
      { candidateCapacity: 2500 },
      adminUserId,
    );

    expect(prisma.subscriptionPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plan-1' },
        data: { candidateCapacity: 2500 },
      }),
    );
    expect(updated).toBeDefined();
    expect(updated.candidateCapacity).toBe(2500);
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'plan.capacity_updated' }),
    );
  });

  it('Th6-I506: provisions superadmin platform admin staff and logs audit grant', async () => {
    const { service, prisma, auditPublisher } = setupAdminEpicTest();
    const admin = await service.invitePlatformAdmin(
      {
        email: 'newadmin@smart.test',
        fullName: 'Platform Admin',
      },
      adminUserId,
    );

    expect(admin).toBeDefined();
    expect(admin.email).toBe('newadmin@smart.test');
    expect(prisma.user.findFirstOrThrow).toHaveBeenCalled();
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'platform_admin.invited' }),
    );
  });
});
