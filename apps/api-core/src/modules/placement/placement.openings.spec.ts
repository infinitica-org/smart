import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  type ExecutionContext,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ROLES_KEY } from '../../common/guards/roles.decorator.js';
import { PlacementController } from './placement.controller.js';
import { PlacementService } from './placement.service.js';

const institutionId = randomUUID();
const otherInstitutionId = randomUUID();
const actorId = randomUUID();
const openingId = randomUUID();

const tpoAdmin = { sub: actorId, role: 'INSTITUTION_ADMIN', inst: institutionId };

const validBody = {
  companyName: 'Infinitica Labs',
  roleTitle: 'Backend Engineer',
  domain: 'SOFTWARE_IT',
  requiredSkills: [
    {
      skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
      minProficiency: 'INTERMEDIATE',
    },
    { skillCode: 'SQL_QUERY_OPTIMIZATION', minProficiency: 'BEGINNER' },
  ],
  minYearsExperience: 1,
  maxYearsExperience: 4,
  location: 'Coimbatore',
  employmentType: 'FULL_TIME',
  headcount: 3,
};

function storedOpening(overrides: Record<string, unknown> = {}) {
  return {
    id: openingId,
    institutionId,
    companyName: validBody.companyName,
    roleTitle: validBody.roleTitle,
    domainCode: 'SOFTWARE_IT',
    minYearsExperience: 1,
    maxYearsExperience: 4,
    location: validBody.location,
    employmentType: 'FULL_TIME',
    headcount: 3,
    companyLogoUrl: null,
    attachedDocuments: null,
    categoryCode: null,
    aboutCompany: null,
    companyOffers: null,
    additionalCompanyDetails: null,
    roleDetails: null,
    salaryDetails: null,
    roundDetails: null,
    hiringDetails: null,
    driveSpoc: null,
    driveDate: null,
    lastDateToApply: null,
    status: 'DRAFT',
    createdAt: new Date('2026-09-02T05:30:00.000Z'),
    requiredSkills: [
      {
        minProficiency: 'INTERMEDIATE',
        skill: { code: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION' },
      },
      { minProficiency: 'BEGINNER', skill: { code: 'SQL_QUERY_OPTIMIZATION' } },
    ],
    ...overrides,
  };
}

/** Seeded taxonomy rows the service resolves `skillCode` against. */
function setup(options: { seededCodes?: string[]; rows?: unknown[]; row?: unknown } = {}) {
  const seededCodes = options.seededCodes ?? [
    'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    'SQL_QUERY_OPTIMIZATION',
  ];
  const prisma = {
    skill: {
      findMany: vi.fn(({ where }: { where: { code: { in: string[] } } }) =>
        Promise.resolve(
          where.code.in
            .filter((code) => seededCodes.includes(code))
            .map((code) => ({ id: `skill-${code}`, code })),
        ),
      ),
    },
    jobOpening: {
      create: vi.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(
          storedOpening({
            institutionId: data.institutionId,
            minYearsExperience: data.minYearsExperience,
            maxYearsExperience: data.maxYearsExperience,
          }),
        ),
      ),
      findMany: vi.fn().mockResolvedValue(options.rows ?? [storedOpening()]),
      findFirst: vi
        .fn()
        .mockResolvedValue(options.row === undefined ? storedOpening() : options.row),
    },
    $transaction: vi.fn((run: (tx: unknown) => unknown) => run(prisma)),
  };
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const employers = {
    requireEmployer: vi.fn().mockRejectedValue(new Error('employer not mocked')),
  };
  const jdParseQueue = { add: vi.fn().mockResolvedValue(undefined) };
  const service = new PlacementService(
    prisma as never,
    outbox as never,
    employers as never,
    jdParseQueue as never,
  );
  return {
    prisma,
    service,
    controller: new PlacementController(service, employers as never),
    employers,
  };
}

describe('CO-T01 opening authorization', () => {
  it.each(['createOpening', 'listOpenings', 'getOpening'] as const)(
    'restricts %s to the two V1 TPO roles',
    (handler) => {
      expect(Reflect.getMetadata(ROLES_KEY, PlacementController.prototype[handler])).toEqual([
        'INSTITUTION_ADMIN',
        'PLACEMENT_STAFF',
      ]);
    },
  );

  it.each(['B2B_PARTNER', 'STUDENT', 'SUPER_ADMIN'])('rejects %s on the opening routes', (role) => {
    const guard = new RolesGuard({
      getAllAndOverride: vi
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['INSTITUTION_ADMIN', 'PLACEMENT_STAFF']),
    } as never);
    expect(() => guard.canActivate(contextWithUser({ role }))).toThrow(ForbiddenException);
  });

  it('rejects a request without an authenticated user', () => {
    const guard = new RolesGuard({
      getAllAndOverride: vi
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['INSTITUTION_ADMIN', 'PLACEMENT_STAFF']),
    } as never);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(ForbiddenException);
  });

  it('refuses a TPO token that carries no institution claim', async () => {
    const { controller, prisma } = setup();
    await expect(
      controller.createOpening({ ...tpoAdmin, inst: null } as never, validBody),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.jobOpening.create).not.toHaveBeenCalled();
  });
});

describe('CO-T01 create opening', () => {
  it('creates a DRAFT opening and returns the contract DTO', async () => {
    const { controller, prisma } = setup();

    const dto = await controller.createOpening(tpoAdmin as never, validBody);

    expect(dto).toMatchObject({
      openingId,
      institutionId,
      status: 'DRAFT',
      minYearsExperience: 1,
      maxYearsExperience: 4,
      headcount: 3,
      employmentType: 'FULL_TIME',
      domain: 'SOFTWARE_IT',
    });
    expect(prisma.jobOpening.create).toHaveBeenCalledTimes(1);
    // Status and createdAt come from the database defaults, not the API.
    const { data } = prisma.jobOpening.create.mock.calls[0][0];
    expect(data).not.toHaveProperty('status');
    expect(data).not.toHaveProperty('createdAt');
  });

  it('takes institutionId and createdById from the JWT, never from the body', async () => {
    const { controller, prisma } = setup();

    await controller.createOpening(tpoAdmin as never, {
      ...validBody,
      institutionId: otherInstitutionId,
      createdById: randomUUID(),
    });

    const { data } = prisma.jobOpening.create.mock.calls[0][0];
    expect(data.institutionId).toBe(institutionId);
    expect(data.createdById).toBe(actorId);
  });

  it('persists both experience bounds and every requested proficiency', async () => {
    const { controller, prisma } = setup();

    await controller.createOpening(tpoAdmin as never, validBody);

    const { data } = prisma.jobOpening.create.mock.calls[0][0];
    expect(data.minYearsExperience).toBe(1);
    expect(data.maxYearsExperience).toBe(4);
    expect(data.requiredSkills.create).toEqual([
      {
        skillId: 'skill-ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
        minProficiency: 'INTERMEDIATE',
      },
      { skillId: 'skill-SQL_QUERY_OPTIMIZATION', minProficiency: 'BEGINNER' },
    ]);
  });

  it('persists extended job posting fields on create', async () => {
    const { controller, prisma } = setup();

    await controller.createOpening(tpoAdmin as never, {
      ...validBody,
      categoryId: 'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
      aboutCompany: 'About the org',
      companyOffers: 'Perks list',
      additionalCompanyDetails: 'More info',
      roleDetails: 'Role JD',
      salaryDetails: '6 LPA',
      roundDetails: '3 rounds',
      hiringDetails: 'Process notes',
      driveSpoc: 'hr@acme.com',
      driveDate: '2026-11-01',
      lastDateToApply: '2026-10-20',
    });

    const { data } = prisma.jobOpening.create.mock.calls[0][0];
    expect(data.categoryCode).toBe('SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN');
    expect(data.aboutCompany).toBe('About the org');
    expect(data.driveSpoc).toBe('hr@acme.com');
    expect(data.driveDate).toEqual(new Date('2026-11-01T00:00:00.000Z'));
    expect(data.lastDateToApply).toEqual(new Date('2026-10-20T00:00:00.000Z'));
  });

  it('persists company logo, attachments, and defaults headcount when omitted', async () => {
    const { controller, prisma } = setup();
    const { headcount: _omit, ...bodyWithoutHeadcount } = validBody;

    await controller.createOpening(tpoAdmin as never, {
      ...bodyWithoutHeadcount,
      companyLogoStorageKey: 'job-opening-logos/inst/logo.png',
      attachedDocuments: [
        {
          documentId: '33333333-3333-4333-8333-333333333333',
          fileName: 'jd.pdf',
          fileUrl: 'job-opening-docs/inst/jd.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 1024,
        },
      ],
    });

    const { data } = prisma.jobOpening.create.mock.calls[0][0];
    expect(data.headcount).toBe(1);
    expect(data.companyLogoUrl).toBe('job-opening-logos/inst/logo.png');
    expect(data.attachedDocuments).toEqual([expect.objectContaining({ fileName: 'jd.pdf' })]);
  });

  it('resolves every skillCode against Skill.code without upserting taxonomy rows', async () => {
    const { controller, prisma } = setup();

    await controller.createOpening(tpoAdmin as never, validBody);

    expect(prisma.skill.findMany).toHaveBeenCalledWith({
      where: {
        code: { in: ['ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION', 'SQL_QUERY_OPTIMIZATION'] },
      },
      select: { id: true, code: true },
    });
    expect(prisma.skill).not.toHaveProperty('upsert');
  });

  it('rejects a taxonomy code that is valid in contracts but unseeded, creating nothing', async () => {
    const { controller, prisma } = setup({
      seededCodes: ['ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION'],
    });

    await expect(controller.createOpening(tpoAdmin as never, validBody)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.jobOpening.create).not.toHaveBeenCalled();
  });

  it.each([
    [
      'unknown skill code',
      { requiredSkills: [{ skillCode: 'javascript', minProficiency: 'BEGINNER' }] },
    ],
    [
      'proficiency outside SkillProficiencySchema',
      {
        requiredSkills: [
          {
            skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
            minProficiency: 'EXPERT',
          },
        ],
      },
    ],
    ['inverted experience range', { minYearsExperience: 6, maxYearsExperience: 2 }],
    ['unsupported employment type', { employmentType: 'GIG' }],
    ['headcount below one', { headcount: 0 }],
  ])('rejects %s before touching the database', async (_case, patch) => {
    const { controller, prisma } = setup();

    await expect(
      controller.createOpening(tpoAdmin as never, { ...validBody, ...patch }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(prisma.jobOpening.create).not.toHaveBeenCalled();
  });
});

describe('CO-T01 list openings', () => {
  it('scopes the query to the caller institution', async () => {
    const { controller, prisma } = setup();

    const result = await controller.listOpenings(tpoAdmin as never, {});

    expect(prisma.jobOpening.findMany.mock.calls[0][0].where).toEqual({ institutionId });
    expect(result.openings).toHaveLength(1);
    expect(result.openings[0]?.institutionId).toBe(institutionId);
  });

  it('never returns another institution rows', async () => {
    const { controller } = setup({ rows: [] });

    await expect(
      controller.listOpenings({ ...tpoAdmin, inst: otherInstitutionId } as never, {}),
    ).resolves.toEqual({ openings: [] });
  });

  it('applies the contract status filter', async () => {
    const { controller, prisma } = setup();

    await controller.listOpenings(tpoAdmin as never, { status: 'OPEN' });

    expect(prisma.jobOpening.findMany.mock.calls[0][0].where).toEqual({
      institutionId,
      status: 'OPEN',
    });
  });

  it('returns an empty list rather than an error when nothing is posted yet', async () => {
    const { controller } = setup({ rows: [] });
    await expect(controller.listOpenings(tpoAdmin as never, {})).resolves.toEqual({ openings: [] });
  });

  it('coerces legacy rows with null placement fields instead of failing the list', async () => {
    const { controller } = setup({
      rows: [
        storedOpening({
          location: null,
          domainCode: null,
          employmentType: null,
          minYearsExperience: null,
          maxYearsExperience: null,
        }),
      ],
    });

    const result = await controller.listOpenings(tpoAdmin as never, {});

    expect(result.openings).toHaveLength(1);
    expect(result.openings[0]?.location).toBe('Unspecified');
    expect(result.openings[0]?.domain).toBe('SOFTWARE_IT');
    expect(result.openings[0]?.employmentType).toBe('FULL_TIME');
  });
});

describe('CO-T01 get one opening', () => {
  it('returns required skills as taxonomy code plus proficiency', async () => {
    const { controller, prisma } = setup();

    const dto = await controller.getOpening(tpoAdmin as never, openingId);

    expect(prisma.jobOpening.findFirst.mock.calls[0][0].where).toEqual({
      id: openingId,
      institutionId,
    });
    expect(dto.requiredSkills).toEqual([
      {
        skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
        minProficiency: 'INTERMEDIATE',
      },
      { skillCode: 'SQL_QUERY_OPTIMIZATION', minProficiency: 'BEGINNER' },
    ]);
  });

  it('hides an opening owned by another institution behind the not-found response', async () => {
    const { controller, prisma } = setup({ row: null });

    await expect(
      controller.getOpening({ ...tpoAdmin, inst: otherInstitutionId } as never, openingId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.jobOpening.findFirst.mock.calls[0][0].where.institutionId).toBe(
      otherInstitutionId,
    );
  });

  it('returns not found for an unknown opening id', async () => {
    const { controller } = setup({ row: null });
    await expect(controller.getOpening(tpoAdmin as never, randomUUID())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

function contextWithUser(user: { role: string } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as ExecutionContext;
}
