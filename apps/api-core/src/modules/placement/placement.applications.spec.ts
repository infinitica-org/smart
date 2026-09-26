import { randomUUID } from 'node:crypto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { SMART_TOPICS } from '@smart/contracts';
import { ROLES_KEY } from '../../common/guards/roles.decorator.js';
import { PlacementController } from './placement.controller.js';
import { ApplicationService } from '../applications/application.service.js';
import { PlacementService } from './placement.service.js';
import { resolveTenantId } from '../../common/decorators/tenant-id.decorator.js';

const institutionId = randomUUID();
const otherInstitutionId = randomUUID();
const actorId = randomUUID();
const openingId = randomUUID();
const applicationId = randomUUID();
const studentId = randomUUID();

const tpoAdmin = { sub: actorId, role: 'INSTITUTION_ADMIN', inst: institutionId };

function storedOpening() {
  return {
    id: openingId,
    institutionId,
    companyName: 'Infinitica Labs',
    roleTitle: 'Backend Engineer',
  };
}

function storedApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: applicationId,
    openingId,
    studentId,
    stage: 'APPLIED',
    matchScore: 0.88,
    createdAt: new Date('2026-09-02T06:00:00.000Z'),
    updatedAt: new Date('2026-09-02T06:00:00.000Z'),
    opening: { institutionId },
    student: {
      fullName: 'Aarav Sharma',
      email: 'aarav@example.com',
      primaryTrack: { code: 'FULLSTACK' },
    },
    ...overrides,
  };
}

function setup(options: { opening?: unknown; application?: unknown } = {}) {
  const applicationRow =
    options.application === undefined ? storedApplication() : options.application;
  const openingRow = options.opening === undefined ? storedOpening() : options.opening;

  const prisma = {
    jobOpening: {
      findFirst: vi.fn().mockResolvedValue(openingRow),
    },
    application: {
      findMany: vi.fn().mockResolvedValue(applicationRow ? [applicationRow] : []),
      findUnique: vi.fn().mockResolvedValue(applicationRow),
      update: vi.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          ...(applicationRow as object),
          stage: data.stage,
          updatedAt: new Date('2026-09-02T07:00:00.000Z'),
        }),
      ),
    },
    applicationStageEvent: {
      create: vi.fn().mockResolvedValue({ id: randomUUID() }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn((run: (tx: unknown) => unknown) => run(prisma)),
  };

  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const jdParseQueue = { add: vi.fn().mockResolvedValue(undefined) };
  const applications = new ApplicationService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    outbox as never,
  );
  const service = new PlacementService(
    prisma as never,
    outbox as never,
    jdParseQueue as never,
    undefined,
    undefined,
    applications,
  );
  const controller = new PlacementController(service);

  return { prisma, outbox, service, controller };
}

describe('CO-T02 application authorization', () => {
  it.each(['listApplications', 'patchApplicationStage'] as const)(
    'restricts %s to the two V1 TPO roles',
    (handler) => {
      expect(Reflect.getMetadata(ROLES_KEY, PlacementController.prototype[handler])).toEqual([
        'INSTITUTION_ADMIN',
        'PLACEMENT_STAFF',
      ]);
    },
  );
});

describe('CO-T02 list applications', () => {
  it('returns applications for a valid opening owned by caller institution', async () => {
    const { controller, prisma } = setup();

    const response = await controller.listApplications(
      openingId,
      resolveTenantId(tpoAdmin as never),
      tpoAdmin as never,
    );

    expect(prisma.jobOpening.findFirst).toHaveBeenCalledWith({
      where: { id: openingId, institutionId },
      select: { id: true },
    });
    expect(prisma.application.findMany).toHaveBeenCalledWith({
      where: { openingId },
      include: {
        student: {
          select: {
            fullName: true,
            email: true,
            primaryTrack: { select: { code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(response.applications).toHaveLength(1);
    expect(response.applications[0]).toMatchObject({
      applicationId,
      openingId,
      studentId,
      studentName: 'Aarav Sharma',
      studentEmail: 'aarav@example.com',
      primaryTrackCode: 'FULLSTACK',
      stage: 'APPLIED',
      matchScore: 0.88,
    });
  });

  it('rejects listing applications for an opening belonging to another institution', async () => {
    const { controller } = setup({ opening: null });

    await expect(
      controller.listApplications(
        openingId,
        resolveTenantId({ ...tpoAdmin, inst: otherInstitutionId } as never),
        { ...tpoAdmin, inst: otherInstitutionId } as never,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CO-T02 patch application stage', () => {
  it('updates stage, creates ApplicationStageEvent, and enqueues smart.application.stage_changed', async () => {
    const { controller, prisma, outbox } = setup();

    const result = await controller.patchApplicationStage(
      tpoAdmin as never,
      applicationId,
      {
        stage: 'SHORTLISTED',
      },
      resolveTenantId(tpoAdmin as never),
      tpoAdmin as never,
    );

    expect(result.stage).toBe('SHORTLISTED');
    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: applicationId },
      data: { stage: 'SHORTLISTED' },
      include: expect.anything(),
    });
    expect(prisma.applicationStageEvent.create).toHaveBeenCalledWith({
      data: {
        applicationId,
        orgId: institutionId,
        fromStage: 'APPLIED',
        toStage: 'SHORTLISTED',
        fromStatus: 'APPLIED',
        toStatus: 'REVIEWING',
        actorId,
        actorType: 'INSTITUTION',
        note: null,
        source: 'tpo_board',
      },
    });
    expect(outbox.enqueueEnvelope).toHaveBeenCalledTimes(1);
    expect(outbox.enqueueEnvelope).toHaveBeenCalledWith({
      topic: SMART_TOPICS.applicationStageChanged,
      partitionKey: applicationId,
      eventType: SMART_TOPICS.applicationStageChanged,
      source: 'applications',
      data: expect.objectContaining({
        applicationId,
        openingId,
        studentId,
        fromStage: 'APPLIED',
        toStage: 'SHORTLISTED',
      }),
    });
  });

  it('performs no-op when requested stage equals current stage', async () => {
    const { controller, prisma, outbox } = setup();

    const result = await controller.patchApplicationStage(
      tpoAdmin as never,
      applicationId,
      {
        stage: 'APPLIED',
      },
      resolveTenantId(tpoAdmin as never),
      tpoAdmin as never,
    );

    expect(result.stage).toBe('APPLIED');
    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(prisma.applicationStageEvent.create).not.toHaveBeenCalled();
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it('rejects patching an application belonging to another institution', async () => {
    const { controller } = setup({
      application: storedApplication({ opening: { institutionId: otherInstitutionId } }),
    });

    await expect(
      controller.patchApplicationStage(
        tpoAdmin as never,
        applicationId,
        {
          stage: 'SHORTLISTED',
        },
        resolveTenantId(tpoAdmin as never),
        tpoAdmin as never,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an invalid AtsStage payload before database access', async () => {
    const { controller, prisma } = setup();

    await expect(
      controller.patchApplicationStage(
        tpoAdmin as never,
        applicationId,
        {
          stage: 'INVALID_STAGE',
        },
        resolveTenantId(tpoAdmin as never),
        tpoAdmin as never,
      ),
    ).rejects.toBeInstanceOf(ZodError);
    expect(prisma.application.update).not.toHaveBeenCalled();
  });

  it('refuses token without institution ID', async () => {
    const { controller } = setup();

    await expect(
      (async () =>
        controller.patchApplicationStage(
          tpoAdmin as never,
          applicationId,
          {
            stage: 'SHORTLISTED',
          },
          resolveTenantId({ ...tpoAdmin, inst: null } as never),
          { ...tpoAdmin, inst: null } as never,
        ))(),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
