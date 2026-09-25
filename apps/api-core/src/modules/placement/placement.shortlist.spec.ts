import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
  type ExecutionContext,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
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
const studentId = randomUUID();
const applicationId = randomUUID();
const createdAt = new Date('2026-09-02T09:00:00.000Z');

const tpoAdmin = { sub: actorId, role: 'INSTITUTION_ADMIN', inst: institutionId };

/** The payload the AC-T04 suggestions workspace sends for one candidate. */
const validBody = { openingId, studentId, matchScore: 0.92 };

interface Seed {
  id: string;
  institutionId: string;
  role?: string;
  minSscPercentage?: number | null;
  minHscPercentage?: number | null;
  minCollegePercentage?: number | null;
  backlogsAllowed?: boolean;
  cgpa?: number | null;
  sscPercentage?: number | null;
  hscPercentage?: number | null;
  hasActiveBacklog?: boolean | null;
}

/**
 * The prisma doubles honour the `where` clause rather than returning a fixed
 * row, so a test that changes the caller's institution genuinely exercises the
 * tenant scoping instead of a hard-coded null.
 */
function setup(
  options: {
    opening?: Seed | null;
    student?: Seed | null;
    createError?: unknown;
  } = {},
) {
  const opening =
    options.opening === undefined
      ? {
          id: openingId,
          institutionId,
          minSscPercentage: null,
          minHscPercentage: null,
          minCollegePercentage: null,
          backlogsAllowed: true,
        }
      : options.opening;
  const student =
    options.student === undefined
      ? {
          id: studentId,
          institutionId,
          role: 'STUDENT',
          cgpa: 8,
          sscPercentage: 85,
          hscPercentage: 85,
          hasActiveBacklog: false,
        }
      : options.student;

  const prisma = {
    jobOpening: {
      findFirst: vi.fn(({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(
          opening && opening.id === where.id && opening.institutionId === where.institutionId
            ? opening
            : null,
        ),
      ),
    },
    user: {
      findFirst: vi.fn(({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(
          student &&
            student.id === where.id &&
            student.institutionId === where.institutionId &&
            student.role === where.role
            ? {
                id: student.id,
                cgpa: student.cgpa ?? null,
                sscPercentage: student.sscPercentage ?? null,
                hscPercentage: student.hscPercentage ?? null,
                hasActiveBacklog: student.hasActiveBacklog ?? null,
              }
            : null,
        ),
      ),
    },
    application: {
      create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        if (options.createError) return Promise.reject(options.createError);
        return Promise.resolve({
          id: applicationId,
          openingId: data.openingId,
          studentId: data.studentId,
          stage: data.stage,
          matchScore: data.matchScore,
          createdAt,
          updatedAt: createdAt,
        });
      }),
    },
    applicationStageEvent: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn((run: (tx: unknown) => unknown) => run(prisma)),
  };
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const employers = { requireEmployer: vi.fn() };
  const jdParseQueue = { add: vi.fn().mockResolvedValue(undefined) };
  const service = new PlacementService(
    prisma as never,
    outbox as never,
    employers as never,
    jdParseQueue as never,
  );
  return {
    prisma,
    outbox,
    service,
    controller: new PlacementController(service, employers as never),
  };
}

function uniqueViolation(): Error & { code: string } {
  return Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
}

describe('AC-T05 shortlist authorization', () => {
  it('restricts createApplication to the two V1 TPO roles', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PlacementController.prototype.createApplication)).toEqual(
      ['INSTITUTION_ADMIN', 'PLACEMENT_STAFF'],
    );
  });

  it.each(['B2B_PARTNER', 'COMPANY', 'STUDENT', 'SUPER_ADMIN'])(
    'rejects %s on the shortlist route',
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
        controller.createApplication(
          validBody,
          resolveTenantId({ ...tpoAdmin, inst: null } as never),
        ))(),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.application.create).not.toHaveBeenCalled();
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });
});

describe('AC-T05 create application', () => {
  it('shortlists the candidate and returns the contract DTO', async () => {
    const { controller, prisma } = setup();

    const dto = await controller.createApplication(validBody, resolveTenantId(tpoAdmin as never));

    expect(dto).toEqual({
      applicationId,
      openingId,
      studentId,
      stage: 'SHORTLISTED',
      matchScore: 0.92,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
    expect(prisma.application.create).toHaveBeenCalledTimes(1);
  });

  it('creates the row in SHORTLISTED, never APPLIED', async () => {
    const { controller, prisma } = setup();

    await controller.createApplication(validBody, resolveTenantId(tpoAdmin as never));

    expect(prisma.application.create.mock.calls[0][0].data.stage).toBe('SHORTLISTED');
  });

  it('persists the AC-T04 match score the TPO actually saw', async () => {
    const { controller, prisma } = setup();

    await controller.createApplication(
      { ...validBody, matchScore: 0.75 },
      resolveTenantId(tpoAdmin as never),
    );

    expect(prisma.application.create.mock.calls[0][0].data.matchScore).toBe(0.75);
  });

  it('stores null when matchScore is omitted', async () => {
    const { controller, prisma } = setup();

    const dto = await controller.createApplication(
      { openingId, studentId },
      resolveTenantId(tpoAdmin as never),
    );

    expect(prisma.application.create.mock.calls[0][0].data.matchScore).toBeNull();
    expect(dto.matchScore).toBeNull();
  });

  it('writes the opening stage event alongside the application', async () => {
    const { controller, prisma } = setup();

    await controller.createApplication(validBody, resolveTenantId(tpoAdmin as never));

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.applicationStageEvent.create).toHaveBeenCalledWith({
      data: { applicationId, fromStage: null, toStage: 'SHORTLISTED' },
    });
  });

  it('scopes both lookups to the JWT institution, never one from the body', async () => {
    const { controller, prisma } = setup();

    await controller.createApplication(
      {
        ...validBody,
        institutionId: otherInstitutionId,
      },
      resolveTenantId(tpoAdmin as never),
    );

    expect(prisma.jobOpening.findFirst.mock.calls[0][0].where).toEqual({
      id: openingId,
      institutionId,
    });
    expect(prisma.user.findFirst.mock.calls[0][0].where).toEqual({
      id: studentId,
      institutionId,
      role: 'STUDENT',
    });
    expect(prisma.application.create.mock.calls[0][0].data).not.toHaveProperty('institutionId');
  });

  it.each([
    ['a non-uuid openingId', { openingId: 'not-a-uuid' }],
    ['a missing studentId', { studentId: undefined }],
    ['a matchScore above one', { matchScore: 1.4 }],
    ['a negative matchScore', { matchScore: -0.1 }],
    ['a non-numeric matchScore', { matchScore: 'GOLD' }],
  ])('rejects %s before touching the database', async (_case, patch) => {
    const { controller, prisma } = setup();

    await expect(
      controller.createApplication({ ...validBody, ...patch }, resolveTenantId(tpoAdmin as never)),
    ).rejects.toBeInstanceOf(ZodError);
    expect(prisma.jobOpening.findFirst).not.toHaveBeenCalled();
    expect(prisma.application.create).not.toHaveBeenCalled();
  });

  it('returns 409 when the candidate is already shortlisted for this opening', async () => {
    const { controller, outbox } = setup({ createError: uniqueViolation() });

    await expect(
      controller.createApplication(validBody, resolveTenantId(tpoAdmin as never)),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it('does not disguise an unrelated database failure as a duplicate', async () => {
    const { controller } = setup({ createError: new Error('connection reset') });

    await expect(
      controller.createApplication(validBody, resolveTenantId(tpoAdmin as never)),
    ).rejects.toThrow('connection reset');
  });
});

describe('AC-T05 drive eligibility', () => {
  it('rejects shortlist when the student does not meet opening academic criteria', async () => {
    const { controller, prisma } = setup({
      opening: {
        id: openingId,
        institutionId,
        minSscPercentage: 80,
        minHscPercentage: null,
        minCollegePercentage: null,
        backlogsAllowed: true,
      },
      student: {
        id: studentId,
        institutionId,
        role: 'STUDENT',
        sscPercentage: 70,
        hscPercentage: 90,
        cgpa: 8,
        hasActiveBacklog: false,
      },
    });

    await expect(
      controller.createApplication(validBody, resolveTenantId(tpoAdmin as never)),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.application.create).not.toHaveBeenCalled();
  });
});

describe('AC-T05 tenant isolation', () => {
  it('rejects an opening owned by another institution', async () => {
    const { controller, prisma } = setup();

    await expect(
      controller.createApplication(
        validBody,
        resolveTenantId({ ...tpoAdmin, inst: otherInstitutionId } as never),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.application.create).not.toHaveBeenCalled();
  });

  it('rejects a student who belongs to another institution', async () => {
    const { controller, prisma } = setup({
      student: { id: studentId, institutionId: otherInstitutionId, role: 'STUDENT' },
    });

    await expect(
      controller.createApplication(validBody, resolveTenantId(tpoAdmin as never)),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.application.create).not.toHaveBeenCalled();
  });

  it('rejects a target user who is not a STUDENT', async () => {
    const { controller, prisma } = setup({
      student: { id: studentId, institutionId, role: 'PLACEMENT_STAFF' },
    });

    await expect(
      controller.createApplication(validBody, resolveTenantId(tpoAdmin as never)),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.application.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown student id', async () => {
    const { controller, prisma } = setup({ student: null });

    await expect(
      controller.createApplication(
        { ...validBody, studentId: randomUUID() },
        resolveTenantId(tpoAdmin as never),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.application.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown opening id without looking up the student', async () => {
    const { controller, prisma } = setup({ opening: null });

    await expect(
      controller.createApplication(
        { ...validBody, openingId: randomUUID() },
        resolveTenantId(tpoAdmin as never),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});

describe('AC-T05 SE-T07 handoff', () => {
  it('enqueues smart.application.stage_changed for the new shortlist row', async () => {
    const { controller, outbox } = setup();

    await controller.createApplication(validBody, resolveTenantId(tpoAdmin as never));

    expect(outbox.enqueueEnvelope).toHaveBeenCalledTimes(1);
    expect(outbox.enqueueEnvelope).toHaveBeenCalledWith({
      topic: SMART_TOPICS.applicationStageChanged,
      partitionKey: applicationId,
      eventType: SMART_TOPICS.applicationStageChanged,
      source: 'placement',
      data: {
        applicationId,
        openingId,
        studentId,
        fromStage: null,
        toStage: 'SHORTLISTED',
        changedAt: createdAt.toISOString(),
      },
    });
  });

  it('emits nothing when the shortlist row was never created', async () => {
    const { controller, outbox } = setup({ opening: null });

    await expect(
      controller.createApplication(validBody, resolveTenantId(tpoAdmin as never)),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });
});

function contextWithUser(user: { role: string } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as ExecutionContext;
}
