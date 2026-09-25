import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
  type ExecutionContext,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SMART_TOPICS } from '@smart/contracts';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ROLES_KEY } from '../../common/guards/roles.decorator.js';
import { PlacementController } from './placement.controller.js';
import { PlacementService } from './placement.service.js';
import { resolveTenantId } from '../../common/decorators/tenant-id.decorator.js';

const institutionId = randomUUID();
const otherInstitutionId = randomUUID();
const actorId = randomUUID();
const openingId = randomUUID();
const applicationId = randomUUID();
const studentId = randomUUID();

const tpoAdmin = { sub: actorId, role: 'INSTITUTION_ADMIN', inst: institutionId };
const tpoStaff = { sub: actorId, role: 'PLACEMENT_STAFF', inst: institutionId };

const COMPLETE_EXPLANATION = 'Named Redis and explained stampede and TTL trade-offs.';

function storedApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: applicationId,
    openingId,
    studentId,
    stage: 'SHORTLISTED',
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

function setup(
  options: {
    application?: unknown;
    attempt?: { passed: boolean | null; explanation: string | null } | null;
    student?: { deactivatedAt: Date | null; heldAt: Date | null } | null;
  } = {},
) {
  const applicationRow =
    options.application === undefined ? storedApplication() : options.application;
  const attempt =
    options.attempt === undefined
      ? { passed: true, explanation: COMPLETE_EXPLANATION }
      : options.attempt;

  const prisma = {
    user: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          options.student === undefined ? { deactivatedAt: null, heldAt: null } : options.student,
        ),
    },
    jobOpening: {
      findFirst: vi.fn().mockResolvedValue({ id: openingId }),
      findUnique: vi.fn().mockResolvedValue({ requiredSkills: [] }),
    },
    application: {
      findUnique: vi.fn().mockResolvedValue(applicationRow),
      findMany: vi.fn().mockResolvedValue(applicationRow ? [applicationRow] : []),
      update: vi.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          ...(applicationRow as object),
          stage: data.stage,
          updatedAt: new Date('2026-09-02T07:00:00.000Z'),
        }),
      ),
    },
    skillVerificationAttempt: {
      findFirst: vi.fn().mockResolvedValue(attempt),
    },
    applicationStageEvent: {
      create: vi.fn().mockResolvedValue({ id: randomUUID() }),
    },
    $transaction: vi.fn((run: (tx: unknown) => unknown) => run(prisma)),
  };

  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const jdParseQueue = { add: vi.fn().mockResolvedValue(undefined) };
  const service = new PlacementService(prisma as never, outbox as never, jdParseQueue as never);
  const controller = new PlacementController(service);
  return { prisma, outbox, service, controller };
}

function contextWithUser(user: { role: string } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as ExecutionContext;
}

describe('AC-T06 authorization', () => {
  it.each(['getApplicationConfidence', 'sendToCompany'] as const)(
    'restricts %s to the two V1 TPO roles',
    (handler) => {
      expect(Reflect.getMetadata(ROLES_KEY, PlacementController.prototype[handler])).toEqual([
        'INSTITUTION_ADMIN',
        'PLACEMENT_STAFF',
      ]);
    },
  );

  it.each(['B2B_PARTNER', 'COMPANY', 'STUDENT', 'SUPER_ADMIN'] as const)(
    'rejects %s on the send-to-company route',
    (role) => {
      const guard = new RolesGuard({
        getAllAndOverride: vi
          .fn()
          .mockReturnValueOnce(false)
          .mockReturnValueOnce(['INSTITUTION_ADMIN', 'PLACEMENT_STAFF']),
      } as never);
      expect(() => guard.canActivate(contextWithUser({ role }))).toThrow(ForbiddenException);
    },
  );

  it('refuses a TPO token that carries no institution claim', async () => {
    const { controller, prisma, outbox } = setup();

    await expect(
      (async () =>
        controller.sendToCompany(
          applicationId,
          resolveTenantId({ ...tpoAdmin, inst: null } as never),
        ))(),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.application.findUnique).not.toHaveBeenCalled();
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });
});

describe('AC-T06 confidence result display', () => {
  it('scopes confidence lookup to opening required skills when configured', async () => {
    const { controller, prisma } = setup();
    prisma.jobOpening.findUnique.mockResolvedValue({
      requiredSkills: [{ skill: { code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT' } }],
    });

    await controller.getApplicationConfidence(applicationId, resolveTenantId(tpoStaff as never));

    expect(prisma.skillVerificationAttempt.findFirst).toHaveBeenCalledWith({
      where: {
        claim: {
          studentId,
          skill: { code: { in: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'] } },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { passed: true, explanation: true, assessmentResultJson: true },
    });
  });

  it('returns the persisted passed + explanation without inventing a score', async () => {
    const { controller, prisma } = setup();

    const result = await controller.getApplicationConfidence(
      applicationId,
      resolveTenantId(tpoStaff as never),
    );

    expect(prisma.skillVerificationAttempt.findFirst).toHaveBeenCalledWith({
      where: { claim: { studentId } },
      orderBy: { createdAt: 'desc' },
      select: { passed: true, explanation: true, assessmentResultJson: true },
    });
    expect(prisma.jobOpening.findUnique).toHaveBeenCalledWith({
      where: { id: openingId },
      select: { requiredSkills: { select: { skill: { select: { code: true } } } } },
    });
    expect(result).toMatchObject({
      applicationId,
      studentId,
      available: true,
      complete: true,
      passed: true,
      explanation: COMPLETE_EXPLANATION,
      promptRef: null,
      sendBlockedReason: null,
    });
    expect(result).not.toHaveProperty('score');
  });

  it('surfaces a missing result so the TPO can see why send is blocked', async () => {
    const { controller } = setup({ attempt: null });

    const result = await controller.getApplicationConfidence(
      applicationId,
      resolveTenantId(tpoAdmin as never),
    );

    expect(result.available).toBe(false);
    expect(result.complete).toBe(false);
    expect(result.passed).toBeNull();
    expect(result.explanation).toBeNull();
    expect(result.sendBlockedReason).toMatch(/No SE-T02 confidence result/);
  });

  it('treats a pass/fail without an explanation as incomplete', async () => {
    const { controller } = setup({ attempt: { passed: true, explanation: 'too short' } });

    const result = await controller.getApplicationConfidence(
      applicationId,
      resolveTenantId(tpoAdmin as never),
    );

    expect(result.available).toBe(true);
    expect(result.complete).toBe(false);
    expect(result.sendBlockedReason).toMatch(/incomplete/);
  });
});

describe('AC-T06 send-to-company', () => {
  it('blocks send when the confidence result is missing', async () => {
    const { controller, prisma, outbox } = setup({ attempt: null });

    await expect(
      controller.sendToCompany(applicationId, resolveTenantId(tpoAdmin as never)),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(prisma.applicationStageEvent.create).not.toHaveBeenCalled();
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it('blocks send when the confidence result is incomplete', async () => {
    const { controller, outbox } = setup({ attempt: { passed: null, explanation: null } });

    await expect(
      controller.sendToCompany(applicationId, resolveTenantId(tpoAdmin as never)),
    ).rejects.toMatchObject({
      constructor: UnprocessableEntityException,
    });
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it.each([
    ['deactivated', { deactivatedAt: new Date('2026-09-20T00:00:00.000Z'), heldAt: null }],
    ['held', { deactivatedAt: null, heldAt: new Date('2026-09-20T00:00:00.000Z') }],
  ])('refuses to send a %s student to the company (S6-VV-148)', async (_label, student) => {
    const { controller, prisma, outbox } = setup({ student });

    await expect(controller.sendToCompany(tpoAdmin as never, applicationId)).rejects.toMatchObject({
      constructor: ConflictException,
    });
    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it('moves SHORTLISTED → AI_VERIFIED and reuses smart.application.stage_changed', async () => {
    const { controller, prisma, outbox } = setup();

    const result = await controller.sendToCompany(
      applicationId,
      resolveTenantId(tpoAdmin as never),
    );

    expect(result.stage).toBe('AI_VERIFIED');
    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: applicationId },
      data: { stage: 'AI_VERIFIED' },
      include: expect.anything(),
    });
    expect(prisma.applicationStageEvent.create).toHaveBeenCalledWith({
      data: {
        applicationId,
        fromStage: 'SHORTLISTED',
        toStage: 'AI_VERIFIED',
      },
    });
    expect(outbox.enqueueEnvelope).toHaveBeenCalledTimes(1);
    expect(outbox.enqueueEnvelope).toHaveBeenCalledWith({
      topic: SMART_TOPICS.applicationStageChanged,
      partitionKey: applicationId,
      eventType: SMART_TOPICS.applicationStageChanged,
      source: 'placement',
      data: expect.objectContaining({
        applicationId,
        openingId,
        studentId,
        fromStage: 'SHORTLISTED',
        toStage: 'AI_VERIFIED',
      }),
    });
  });

  it('is idempotent: a second send does not create another row or event', async () => {
    const { controller, prisma, outbox } = setup({
      application: storedApplication({ stage: 'AI_VERIFIED' }),
    });

    const result = await controller.sendToCompany(
      applicationId,
      resolveTenantId(tpoAdmin as never),
    );

    expect(result.applicationId).toBe(applicationId);
    expect(result.stage).toBe('AI_VERIFIED');
    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(prisma.applicationStageEvent.create).not.toHaveBeenCalled();
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it('rejects send when the application belongs to another institution', async () => {
    const { controller, prisma, outbox } = setup({
      application: storedApplication({ opening: { institutionId: otherInstitutionId } }),
    });

    await expect(
      controller.sendToCompany(applicationId, resolveTenantId(tpoAdmin as never)),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it('hides another institution’s confidence read as not found', async () => {
    const { controller, prisma } = setup({
      application: storedApplication({ opening: { institutionId: otherInstitutionId } }),
    });

    await expect(
      controller.getApplicationConfidence(applicationId, resolveTenantId(tpoAdmin as never)),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.skillVerificationAttempt.findFirst).not.toHaveBeenCalled();
  });

  it('refuses send from a terminal or pre-shortlist stage', async () => {
    const { controller, outbox } = setup({
      application: storedApplication({ stage: 'OFFER' }),
    });

    await expect(
      controller.sendToCompany(applicationId, resolveTenantId(tpoAdmin as never)),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it('leaves the candidate listed on the CO-T02 ATS after send', async () => {
    const { controller, prisma } = setup({
      application: storedApplication({ stage: 'AI_VERIFIED' }),
    });

    const listed = await controller.listApplications(openingId, resolveTenantId(tpoAdmin as never));

    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { openingId } }),
    );
    expect(listed.applications).toHaveLength(1);
    expect(listed.applications[0]).toMatchObject({
      applicationId,
      stage: 'AI_VERIFIED',
      studentName: 'Aarav Sharma',
    });
  });
});
