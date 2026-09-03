import { randomUUID } from 'node:crypto';
import { ForbiddenException, NotFoundException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { ShortlistDtoSchema } from '@smart/contracts';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ROLES_KEY } from '../../common/guards/roles.decorator.js';
import { MatchingService } from './matching.service.js';
import { PlacementMatchController } from './placement-match.controller.js';

const institutionId = randomUUID();
const otherInstitutionId = randomUUID();
const actorId = randomUUID();
const openingId = randomUUID();
const studentId = randomUUID();

const tpoAdmin = { sub: actorId, role: 'INSTITUTION_ADMIN', inst: institutionId };

const openingRow = {
  id: openingId,
  institutionId,
  companyName: 'Infinitica Labs',
  roleTitle: 'Backend Engineer',
  domainCode: 'SOFTWARE_IT',
  minYearsExperience: 1,
  maxYearsExperience: 4,
  location: 'Coimbatore',
  requiredSkills: [
    {
      minProficiency: 'INTERMEDIATE',
      skill: { code: 'PROGRAMMING_FUNDAMENTALS_LOGIC', domain: 'SOFTWARE_IT' },
    },
    {
      minProficiency: 'BEGINNER',
      skill: { code: 'DATABASE_FUNDAMENTALS', domain: 'SOFTWARE_IT' },
    },
  ],
};

function verifiedStudent(overrides: Record<string, unknown> = {}) {
  return {
    id: studentId,
    fullName: 'Pilot Student',
    primaryTrack: { code: 'TECH_FULLSTACK' },
    certificates: [],
    skillClaims: [
      {
        proficiency: 'INTERMEDIATE',
        skill: { code: 'PROGRAMMING_FUNDAMENTALS_LOGIC', domain: 'SOFTWARE_IT' },
      },
      {
        proficiency: 'BEGINNER',
        skill: { code: 'DATABASE_FUNDAMENTALS', domain: 'SOFTWARE_IT' },
      },
    ],
    ...overrides,
  };
}

function setup(options: { opening?: unknown; jd?: unknown; students?: unknown[] } = {}) {
  const prisma = {
    jobOpening: {
      findFirst: vi
        .fn()
        .mockResolvedValue(options.opening === undefined ? openingRow : options.opening),
    },
    jobDescription: {
      findFirst: vi.fn().mockResolvedValue(options.jd === undefined ? null : options.jd),
    },
    user: {
      findMany: vi.fn().mockResolvedValue(options.students ?? [verifiedStudent()]),
    },
  };
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const service = new MatchingService(prisma as never, outbox as never);
  return { prisma, service, outbox, controller: new PlacementMatchController(service) };
}

describe('SE-T05 match authorization', () => {
  it('restricts match to the two V1 TPO roles', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PlacementMatchController.prototype.match)).toEqual([
      'INSTITUTION_ADMIN',
      'PLACEMENT_STAFF',
    ]);
  });

  it.each(['B2B_PARTNER', 'STUDENT', 'SUPER_ADMIN'])(
    'rejects %s on POST /placement/match',
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
    const { controller, prisma } = setup();
    await expect(
      controller.match({ ...tpoAdmin, inst: null } as never, { jdId: openingId }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.jobOpening.findFirst).not.toHaveBeenCalled();
  });
});

describe('SE-T05 POST /placement/match', () => {
  it('returns a contract ShortlistDto ranked from verified claims', async () => {
    const { controller, prisma } = setup();

    const dto = await controller.match(tpoAdmin as never, { jdId: openingId });

    expect(ShortlistDtoSchema.parse(dto).candidates).toHaveLength(1);
    expect(dto.jdId).toBe(openingId);
    expect(dto.companyName).toBe('Infinitica Labs');
    expect(dto.totalCandidatesConsidered).toBe(1);
    expect(dto.candidates[0]).toMatchObject({
      studentId,
      studentName: 'Pilot Student',
      trackCode: 'TECH_FULLSTACK',
      method: 'RULES',
      similarityScore: 0,
      matchScore: 1,
      certificateId: null,
      highestLevelCleared: 1,
      headlineTier: 'BRONZE',
    });
    expect(dto.candidates[0]?.explanation.why).toBeTruthy();
    expect(dto.candidates[0]?.explanation.rules).toEqual({
      skill: 1,
      proficiency: 1,
      domain: 1,
      experience: 1,
      location: 1,
    });
    expect(prisma.jobOpening.findFirst.mock.calls[0][0].where).toEqual({
      id: openingId,
      institutionId,
    });
    expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({
      institutionId,
      role: 'STUDENT',
      skillClaims: { some: { status: 'VERIFIED' } },
    });
  });

  it('hides an opening owned by another institution behind not-found', async () => {
    const { controller, prisma } = setup({ opening: null, jd: null });

    await expect(
      controller.match({ ...tpoAdmin, inst: otherInstitutionId } as never, { jdId: openingId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.jobOpening.findFirst.mock.calls[0][0].where.institutionId).toBe(
      otherInstitutionId,
    );
  });

  it('does not return declared-only students because the pool requires VERIFIED', async () => {
    const { controller, prisma } = setup({ students: [] });

    const dto = await controller.match(tpoAdmin as never, { jdId: openingId });

    expect(dto.candidates).toEqual([]);
    expect(dto.totalCandidatesConsidered).toBe(0);
    expect(prisma.user.findMany.mock.calls[0][0].where.skillClaims).toEqual({
      some: { status: 'VERIFIED' },
    });
  });

  it('keeps a verified-but-partial student on the list', async () => {
    const { controller } = setup({
      students: [
        verifiedStudent({
          skillClaims: [
            {
              proficiency: 'INTERMEDIATE',
              skill: { code: 'PROGRAMMING_FUNDAMENTALS_LOGIC', domain: 'SOFTWARE_IT' },
            },
          ],
        }),
      ],
    });

    const dto = await controller.match(tpoAdmin as never, { jdId: openingId });

    expect(dto.candidates).toHaveLength(1);
    expect(dto.candidates[0]?.matchScore).toBeLessThan(1);
    expect(dto.candidates[0]?.explanation.gapCompetencies).toContain('DATABASE_FUNDAMENTALS');
  });

  it('rejects an invalid jdId before touching the database', async () => {
    const { controller, prisma } = setup();

    await expect(
      controller.match(tpoAdmin as never, { jdId: 'not-a-uuid' }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(prisma.jobOpening.findFirst).not.toHaveBeenCalled();
  });
});

function contextWithUser(user: { role: string } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as ExecutionContext;
}
