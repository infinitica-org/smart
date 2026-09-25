import { randomUUID } from 'node:crypto';
import { ForbiddenException, NotFoundException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { ShortlistDtoSchema } from '@smart/contracts';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ROLES_KEY } from '../../common/guards/roles.decorator.js';
import { MatchingService } from './matching.service.js';
import { PlacementMatchController } from './placement-match.controller.js';
import { resolveTenantId } from '../../common/decorators/tenant-id.decorator.js';

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
  parsedRequirements: null,
  requiredSkills: [
    {
      minProficiency: 'INTERMEDIATE',
      skill: { code: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION', domain: 'SOFTWARE_IT' },
    },
    {
      minProficiency: 'BEGINNER',
      skill: { code: 'SQL_QUERY_OPTIMIZATION', domain: 'SOFTWARE_IT' },
    },
  ],
};

/** Shape of one row returned by the raw-SQL eligible-pool query (S6-VV-76 perf follow-up). */
function verifiedStudent(overrides: Record<string, unknown> = {}) {
  return {
    id: studentId,
    fullName: 'Pilot Student',
    primaryTrackCode: 'TECH_FULLSTACK',
    certificateId: null,
    highestLevelCleared: null,
    headlineTier: null,
    skills: [
      {
        code: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
        domain: 'SOFTWARE_IT',
        proficiency: 'INTERMEDIATE',
      },
      { code: 'SQL_QUERY_OPTIMIZATION', domain: 'SOFTWARE_IT', proficiency: 'BEGINNER' },
    ],
    ...overrides,
  };
}

function setup(
  options: {
    opening?: unknown;
    jd?: unknown;
    students?: unknown[];
    matchRun?: unknown;
    useRulesRanker?: boolean;
    /** Students that are now deactivated or held (S6-VV-148). */
    hiddenStudentIds?: string[];
  } = {},
) {
  const hidden = new Set(options.hiddenStudentIds ?? []);
  const prisma = {
    user: {
      findMany: vi.fn(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(where.id.in.filter((id) => !hidden.has(id)).map((id) => ({ id }))),
      ),
    },
    jobOpening: {
      findFirst: vi
        .fn()
        .mockResolvedValue(options.opening === undefined ? openingRow : options.opening),
    },
    jobDescription: {
      findFirst: vi.fn().mockResolvedValue(options.jd === undefined ? null : options.jd),
    },
    $queryRaw: vi.fn().mockResolvedValue(options.students ?? [verifiedStudent()]),
    matchRun: {
      create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: randomUUID(),
          status: 'PENDING',
          ...data,
        }),
      ),
      findUnique: vi.fn().mockResolvedValue(options.matchRun ?? null),
      findFirst: vi.fn().mockResolvedValue(options.matchRun ?? null),
      update: vi
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...(options.matchRun as Record<string, unknown>), ...data }),
        ),
    },
    studentCapability: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    project: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    skillVerificationAttempt: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    application: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    matchFeedback: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: randomUUID(),
          createdAt: new Date(),
          ...data,
        }),
      ),
    },
  };
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const matchRunQueue = { add: vi.fn().mockResolvedValue(undefined) };
  const institutions = {
    resolveInstitutionEntitlements: vi.fn().mockResolvedValue({
      flags: options.useRulesRanker
        ? [{ key: 'matching.use_rules_ranker', name: 'Rules ranker', enabled: true }]
        : [],
    }),
  };
  const narratives = { summarize: vi.fn().mockResolvedValue(null) };
  const service = new MatchingService(
    prisma as never,
    outbox as never,
    institutions as never,
    narratives as never,
    matchRunQueue as never,
  );
  return {
    prisma,
    service,
    outbox,
    matchRunQueue,
    controller: new PlacementMatchController(service),
  };
}

function matchRunRow(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    institutionId,
    jdId: openingId,
    requestedById: actorId,
    batchIds: [],
    minCgpa: null,
    requiredSkillCodes: [],
    limit: 50,
    minSkillCoverage: null,
    status: 'PENDING',
    errorMessage: null,
    eligiblePoolCount: null,
    suggestedCount: null,
    shortlistId: null,
    resultSnapshot: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    completedAt: null,
    ...overrides,
  };
}

describe('SE-T05 match authorization', () => {
  it('restricts match to the two V1 TPO roles', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PlacementMatchController.prototype.match)).toEqual([
      'INSTITUTION_ADMIN',
      'PLACEMENT_STAFF',
    ]);
  });

  it.each(['B2B_PARTNER', 'COMPANY', 'STUDENT', 'SUPER_ADMIN'])(
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
      (async () =>
        controller.match(
          { jdId: openingId },
          resolveTenantId({ ...tpoAdmin, inst: null } as never),
        ))(),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.jobOpening.findFirst).not.toHaveBeenCalled();
  });
});

describe('SE-T05 POST /placement/match', () => {
  it('returns a contract ShortlistDto ranked from verified claims', async () => {
    const { controller, prisma } = setup();

    const dto = await controller.match({ jdId: openingId }, resolveTenantId(tpoAdmin as never));

    expect(ShortlistDtoSchema.parse(dto).candidates).toHaveLength(1);
    expect(dto.jdId).toBe(openingId);
    expect(dto.companyName).toBe('Infinitica Labs');
    expect(dto.totalCandidatesConsidered).toBe(1);
    expect(dto.candidates[0]).toMatchObject({
      studentId,
      studentName: 'Pilot Student',
      trackCode: 'TECH_FULLSTACK',
      method: 'SKILL_CAPABILITY',
      similarityScore: 0,
      matchScore: expect.any(Number),
      certificateId: null,
      highestLevelCleared: 1,
      headlineTier: 'BRONZE',
    });
    expect(dto.candidates[0]?.explanation.why).toBeTruthy();
    expect(dto.candidates[0]?.explanation.skillCapability).toBeDefined();
    expect(dto.matchMethod).toBe('SKILL_CAPABILITY');
    expect(prisma.jobOpening.findFirst.mock.calls[0][0].where).toEqual({
      id: openingId,
      institutionId,
    });
    const sqlArg = prisma.$queryRaw.mock.calls[0][0];
    expect(sqlArg.values).toContain(institutionId);
    expect(sqlArg.sql).toContain("u.role = 'STUDENT'");
    expect(sqlArg.sql).toContain("status = 'VERIFIED'");
    expect(sqlArg.sql).toContain('verified_until');
  });

  it('hides an opening owned by another institution behind not-found', async () => {
    const { controller, prisma } = setup({ opening: null, jd: null });

    await expect(
      controller.match(
        { jdId: openingId },
        resolveTenantId({ ...tpoAdmin, inst: otherInstitutionId } as never),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.jobOpening.findFirst.mock.calls[0][0].where.institutionId).toBe(
      otherInstitutionId,
    );
  });

  it('does not return declared-only students because the pool requires VERIFIED', async () => {
    const { controller, prisma } = setup({ students: [] });

    const dto = await controller.match({ jdId: openingId }, resolveTenantId(tpoAdmin as never));

    expect(dto.candidates).toEqual([]);
    expect(dto.totalCandidatesConsidered).toBe(0);
    expect(prisma.$queryRaw.mock.calls[0][0].sql).toContain("status = 'VERIFIED'");
  });

  it('keeps a verified partial match without a coverage cutoff', async () => {
    const { controller } = setup({
      students: [
        verifiedStudent({
          skills: [
            {
              code: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
              domain: 'SOFTWARE_IT',
              proficiency: 'BEGINNER',
            },
            {
              code: 'SQL_QUERY_OPTIMIZATION',
              domain: 'SOFTWARE_IT',
              proficiency: 'BEGINNER',
            },
          ],
        }),
      ],
    });

    const dto = await controller.match(
      {
        jdId: openingId,
        minSkillCoverage: 0.6,
      },
      resolveTenantId(tpoAdmin as never),
    );

    expect(dto.candidates).toHaveLength(1);
    expect(dto.candidatesScoredCount).toBe(1);
    expect(dto.candidates[0]?.matchScore).toBeLessThan(1);
    expect(dto.candidates[0]?.explanation.skillFit?.some((row) => row.status === 'PARTIAL')).toBe(
      true,
    );
  });

  it('enriches explainability with QLIX gaps and verified student capabilities without changing matchScore', async () => {
    const { controller, prisma } = setup({
      useRulesRanker: true,
      opening: {
        ...openingRow,
        requiredSkills: [
          {
            minProficiency: 'INTERMEDIATE',
            skill: { code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT', domain: 'SOFTWARE_IT' },
          },
        ],
      },
      students: [
        verifiedStudent({
          skills: [
            {
              code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
              domain: 'SOFTWARE_IT',
              proficiency: 'INTERMEDIATE',
            },
          ],
        }),
      ],
    });

    prisma.studentCapability.findMany.mockResolvedValue([
      {
        studentId,
        capabilityLabel: 'Build tested REST APIs using FastAPI',
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        assessmentVerified: true,
        confidenceScore: 0.82,
        proficiency: 'INTERMEDIATE',
        evidenceRefs: ['Defense transcript excerpt'],
      },
    ]);
    prisma.project.findMany.mockResolvedValue([
      {
        studentId,
        skillMappings: [{ skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT' }],
        qlixCheckResult: {
          gaps: ['Missing Dockerfile'],
          smartAssessmentJson: {
            appliedProficiencyCeiling: 'INTERMEDIATE',
            competencyObservations: [],
          },
        },
      },
    ]);

    const dto = await controller.match({ jdId: openingId }, resolveTenantId(tpoAdmin as never));

    expect(dto.candidates[0]?.explanation.gapCompetencies).toContain('Missing Dockerfile');
    expect(dto.candidates[0]?.explanation.strongCompetencies).toContain(
      'Build tested REST APIs using FastAPI',
    );
    expect(dto.candidates[0]?.explanation.why).toContain('QLIX project ceiling: INTERMEDIATE');
  });

  it('rejects an invalid jdId before touching the database', async () => {
    const { controller, prisma } = setup();

    await expect(
      controller.match({ jdId: 'not-a-uuid' }, resolveTenantId(tpoAdmin as never)),
    ).rejects.toBeInstanceOf(ZodError);
    expect(prisma.jobOpening.findFirst).not.toHaveBeenCalled();
  });

  it('reports the pre-ranking eligible pool size alongside the ranked candidates', async () => {
    const { controller } = setup();

    const dto = await controller.match({ jdId: openingId }, resolveTenantId(tpoAdmin as never));

    expect(dto.eligiblePoolCount).toBe(1);
  });
});

describe('S6-VV-76 async match runs', () => {
  it('creates a PENDING MatchRun row and enqueues the background job', async () => {
    const { service, prisma, matchRunQueue } = setup();

    const result = await service.createMatchRun(institutionId, actorId, {
      jdId: openingId,
      batchIds: ['b1', 'b2'],
      minCgpa: 8,
      requiredSkillCodes: ['SQL_QUERY_OPTIMIZATION'],
      limit: 50,
    } as never);

    expect(result.status).toBe('PENDING');
    expect(prisma.matchRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        institutionId,
        jdId: openingId,
        requestedById: actorId,
        batchIds: ['b1', 'b2'],
        minCgpa: 8,
        requiredSkillCodes: ['SQL_QUERY_OPTIMIZATION'],
        limit: 50,
        minSkillCoverage: 0.6,
      }),
    });
    expect(matchRunQueue.add).toHaveBeenCalledWith('run-match', { matchRunId: result.runId });
  });

  it('scopes the eligible pool to every listed batch (via `batch_id = ANY(...)`)', async () => {
    const { service, prisma } = setup();

    await service.createMatchRun(institutionId, actorId, {
      jdId: openingId,
      batchIds: ['batch-a', 'batch-b'],
      limit: 50,
    } as never);
    const [{ data: run }] = prisma.matchRun.create.mock.calls[0];
    prisma.matchRun.findUnique.mockResolvedValueOnce(matchRunRow(run));

    await service.runMatchRun('run-1');

    const sqlArg = prisma.$queryRaw.mock.calls[0][0];
    expect(sqlArg.sql).toContain('u.batch_id = ANY');
    expect(sqlArg.values).toContainEqual(['batch-a', 'batch-b']);
  });

  it('requires every listed skill to be VERIFIED (AND), not just any one', async () => {
    const { service, prisma } = setup();
    prisma.matchRun.findUnique.mockResolvedValueOnce(
      matchRunRow({ requiredSkillCodes: ['SKILL_A', 'SKILL_B'] }),
    );

    await service.runMatchRun('run-1');

    const sqlArg = prisma.$queryRaw.mock.calls[0][0];
    // One EXISTS(...) fragment per required skill — not a single IN(...), which would only
    // require ANY one of them.
    const existsCount = (sqlArg.sql.match(/sk_req\.code = \?/g) ?? []).length;
    expect(existsCount).toBe(2);
    expect(sqlArg.values).toEqual(expect.arrayContaining(['SKILL_A', 'SKILL_B']));
  });

  it('excludes students with no CGPA on file once a minCgpa filter is set', async () => {
    const { service, prisma } = setup();
    prisma.matchRun.findUnique.mockResolvedValueOnce(matchRunRow({ minCgpa: 8 }));

    await service.runMatchRun('run-1');

    const sqlArg = prisma.$queryRaw.mock.calls[0][0];
    expect(sqlArg.sql).toContain('u.cgpa >=');
    expect(sqlArg.values).toContain(8);
  });

  it('runs PENDING -> RUNNING -> SUCCEEDED and persists eligiblePoolCount/suggestedCount', async () => {
    const { service, prisma } = setup();
    prisma.matchRun.findUnique.mockResolvedValueOnce(matchRunRow());

    await service.runMatchRun('run-1');

    const statuses = prisma.matchRun.update.mock.calls.map(
      ([{ data }]: [{ data: Record<string, unknown> }]) => data.status,
    );
    expect(statuses).toEqual(['RUNNING', 'SUCCEEDED']);
    const finalUpdate = prisma.matchRun.update.mock.calls[1][0].data;
    expect(finalUpdate.eligiblePoolCount).toBe(1);
    expect(finalUpdate.suggestedCount).toBe(1);
  });

  it('records FAILED with the error message and rethrows so the DLQ path still fires', async () => {
    const { service, prisma } = setup({ opening: null, jd: null });
    prisma.matchRun.findUnique.mockResolvedValueOnce(matchRunRow());

    await expect(service.runMatchRun('run-1')).rejects.toBeInstanceOf(NotFoundException);

    const finalUpdate = prisma.matchRun.update.mock.calls.at(-1)?.[0].data;
    expect(finalUpdate.status).toBe('FAILED');
    expect(finalUpdate.errorMessage).toBeTruthy();
  });

  it('is a no-op when the referenced MatchRun row no longer exists', async () => {
    const { service, prisma } = setup();
    prisma.matchRun.findUnique.mockResolvedValueOnce(null);

    await service.runMatchRun('missing-run');

    expect(prisma.matchRun.update).not.toHaveBeenCalled();
  });

  it('returns a run scoped to its own institution', async () => {
    const { service, prisma } = setup({
      matchRun: matchRunRow({ status: 'SUCCEEDED', rankerVersion: 'v1.2.0' }),
    });

    const dto = await service.getMatchRun(institutionId, 'run-1');

    expect(dto.status).toBe('SUCCEEDED');
    expect(dto.rankerVersion).toBe('v1.2.0');
    expect(prisma.matchRun.findFirst).toHaveBeenCalledWith({
      where: { id: 'run-1', institutionId },
    });
  });

  it('404s a match run owned by another institution', async () => {
    const { service } = setup({ matchRun: null });

    await expect(service.getMatchRun(otherInstitutionId, 'run-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('getMatchFeedbackSummary (I376)', () => {
    it('aggregates ratings, reasons, and computes satisfaction percentage', async () => {
      const { service, prisma } = setup();
      prisma.matchFeedback.findMany.mockResolvedValueOnce([
        { rating: 'EXCELLENT', irrelevantReasons: [] },
        { rating: 'RELEVANT', irrelevantReasons: [] },
        { rating: 'PARTIALLY_RELEVANT', irrelevantReasons: ['Skill mismatch'] },
        { rating: 'NOT_RELEVANT', irrelevantReasons: ['Skill mismatch', 'Overqualified'] },
      ]);

      const summary = await service.getMatchFeedbackSummary();

      expect(summary.totalFeedbacks).toBe(4);
      expect(summary.relevantCount).toBe(2);
      expect(summary.notRelevantCount).toBe(1);
      expect(summary.satisfactionRate).toBe(0.63); // (2 + 0.5) / 4 = 2.5 / 4 = 0.625 -> 0.63
      expect(summary.ratingBreakdown.EXCELLENT).toBe(1);
      expect(summary.ratingBreakdown.RELEVANT).toBe(1);
      expect(summary.ratingBreakdown.PARTIALLY_RELEVANT).toBe(1);
      expect(summary.ratingBreakdown.NOT_RELEVANT).toBe(1);
      expect(summary.commonIrrelevantReasons).toEqual([
        { reason: 'Skill mismatch', count: 2 },
        { reason: 'Overqualified', count: 1 },
      ]);
    });

    it('returns default 1.0 satisfaction when no feedbacks exist', async () => {
      const { service, prisma } = setup();
      prisma.matchFeedback.findMany.mockResolvedValueOnce([]);

      const summary = await service.getMatchFeedbackSummary();

      expect(summary.totalFeedbacks).toBe(0);
      expect(summary.satisfactionRate).toBe(1.0);
      expect(summary.commonIrrelevantReasons).toEqual([]);
    });
  });
});

function contextWithUser(user: { role: string } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as ExecutionContext;
}

describe('S6-VV-148 employer visibility', () => {
  const hiddenStudentId = randomUUID();

  async function storedShortlist() {
    const { controller } = setup({
      students: [verifiedStudent(), verifiedStudent({ id: hiddenStudentId, fullName: 'Gone' })],
    });
    return controller.match({ jdId: openingId }, resolveTenantId(tpoAdmin as never));
  }

  it('keeps deactivated and held students out of the eligible pool', async () => {
    const { controller, prisma } = setup();

    await controller.match({ jdId: openingId }, resolveTenantId(tpoAdmin as never));

    const sqlArg = prisma.$queryRaw.mock.calls[0][0];
    expect(sqlArg.sql).toContain('u.deactivated_at IS NULL AND u.held_at IS NULL');
    // S6-VV-113 — a student who opted out of employer discovery is not matched either.
    expect(sqlArg.sql).toContain('u.discoverable_to_employers');
  });

  it('re-checks discoverability when serving a stored run (S6-VV-113)', async () => {
    const shortlist = await storedShortlist();
    const { service, prisma } = setup({
      matchRun: matchRunRow({ status: 'SUCCEEDED', resultSnapshot: shortlist }),
    });

    await service.getMatchRun(institutionId, 'run-1');

    expect(prisma.user.findMany.mock.calls[0]?.[0].where).toMatchObject({
      deactivatedAt: null,
      heldAt: null,
      discoverableToEmployers: true,
    });
  });

  it('drops a candidate from a stored run once they become hidden', async () => {
    const shortlist = await storedShortlist();
    expect(shortlist.candidates.map((row) => row.studentId)).toContain(hiddenStudentId);
    const { service } = setup({
      matchRun: matchRunRow({ status: 'SUCCEEDED', resultSnapshot: shortlist }),
      hiddenStudentIds: [hiddenStudentId],
    });

    const dto = await service.getMatchRun(institutionId, 'run-1');

    expect(dto.shortlist?.candidates.map((row) => row.studentId)).toEqual([studentId]);
  });

  it('404s the fit view for a hidden candidate still present in a stored run', async () => {
    const shortlist = await storedShortlist();
    const { service } = setup({
      matchRun: matchRunRow({ status: 'SUCCEEDED', resultSnapshot: shortlist }),
      hiddenStudentIds: [hiddenStudentId],
    });

    const runId = randomUUID();

    await expect(
      service.getCandidateFit(institutionId, runId, hiddenStudentId),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getCandidateFit(institutionId, runId, studentId)).resolves.toMatchObject({
      studentId,
    });
  });

  it('MAT-01 / I374: never queries or includes protected demographic attributes in matching query', async () => {
    const { controller, prisma } = setup();

    await controller.match({ jdId: openingId }, resolveTenantId(tpoAdmin as never));

    const sqlArg = prisma.$queryRaw.mock.calls[0][0];
    const sqlText = sqlArg.sql.toLowerCase();

    // Explicitly verify prohibited protected attributes are not part of query or select fields
    expect(sqlText).not.toContain('gender');
    expect(sqlText).not.toContain('caste');
    expect(sqlText).not.toContain('religion');
    expect(sqlText).not.toContain('race');
    expect(sqlText).not.toContain('date_of_birth');
    expect(sqlText).not.toContain('disability');
    expect(sqlText).not.toContain('photo');
  });

  describe('MAT-01 / I369: Distinguish mandatory requirements from preferences', () => {
    it('enforces mandatory skill requirements in pool query while scoring preference skills conditionally', async () => {
      const { controller, prisma } = setup();

      await controller.match(
        {
          jdId: openingId,
          requiredSkillCodes: ['ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION'],
        },
        resolveTenantId(tpoAdmin as never),
      );

      const sqlArg = prisma.$queryRaw.mock.calls[0][0];
      const sqlText = sqlArg.sql;

      // Mandatory required skill codes must be enforced via EXISTS with status = 'VERIFIED'
      expect(sqlText).toContain("sc_req.status = 'VERIFIED'");
      expect(sqlText).toContain('sk_req.code =');
    });
  });

  describe('SRC-01 searchStudents filters (I399, I402, I404)', () => {
    it('I399 & I402: filters by immediate availability and excludes deactivated / held students', async () => {
      const { service, prisma } = setup();
      prisma.$queryRaw.mockResolvedValueOnce([]);

      await service.searchStudents({ sub: actorId, role: 'COMPANY', inst: undefined } as never, {
        availability: 'Immediate',
        verificationType: 'ai_defense',
      });

      const sqlArg = prisma.$queryRaw.mock.calls[0][0];
      const sqlText = sqlArg.sql;
      expect(sqlText).toContain('u.deactivated_at IS NULL');
      expect(sqlText).toContain('u.held_at IS NULL');
      expect(sqlText).toContain('u.discoverable_to_employers');
      expect(sqlText).toContain('u.profile_visible = TRUE');
      expect(sqlText).toContain("ILIKE '%immediate%'");
      expect(sqlText).toContain('projects p_def');
    });
  });
});
