import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { SkillVerificationService } from './skill-verification.service.js';

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const CLAIM_ID = '22222222-2222-4222-8222-222222222222';
const SESSION_ID = '33333333-3333-4333-8333-333333333333';

function student(): RequestUser {
  return { sub: STUDENT_ID, role: 'STUDENT', inst: null };
}

function declaredClaim() {
  return {
    id: CLAIM_ID,
    studentId: STUDENT_ID,
    proficiency: 'BEGINNER',
    status: 'DECLARED',
    strikes: 0,
    lockedUntil: null,
    verifiedUntil: null,
    lastAttemptId: null,
    skill: { code: 'SQL_QUERY_OPTIMIZATION', name: 'Git' },
  };
}

function profileCompletion(overrides: Record<string, unknown> = {}) {
  return {
    assertCompleteForSkillVerification: vi.fn().mockResolvedValue(undefined),
    isCompleteForSkillVerification: vi.fn().mockResolvedValue(true),
    getProgressForStudent: vi.fn().mockResolvedValue({ percent: 100 }),
    ...overrides,
  };
}

function intelligenceService(overrides: Record<string, unknown> = {}) {
  return {
    resolveBlueprint: vi.fn(),
    buildAssessmentResult: vi.fn(),
    claimPassesFromAssessment: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

function verificationService(overrides: Record<string, unknown> = {}) {
  return {
    evaluateClaimVerification: vi.fn(),
    evaluateGate: vi.fn(),
    loadEvidenceContext: vi.fn().mockResolvedValue({ availableCount: 0, items: [] }),
    ...overrides,
  };
}

function makeService(deps: {
  prisma?: Record<string, unknown>;
  redis?: Record<string, unknown>;
  evaluation?: Record<string, unknown>;
  outbox?: Record<string, unknown>;
  intelligence?: Record<string, unknown>;
  verification?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  gradeQueue?: { add: ReturnType<typeof vi.fn> };
}) {
  return new SkillVerificationService(
    (deps.prisma ?? {
      skillClaim: { findUnique: vi.fn(), update: vi.fn() },
      skillVerificationAttempt: { create: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(),
    }) as never,
    (deps.redis ?? {
      get: vi.fn(),
      setex: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      exists: vi.fn().mockResolvedValue(0),
    }) as never,
    (deps.evaluation ?? { generateSkillForm: vi.fn(), gradeSkillForm: vi.fn() }) as never,
    (deps.outbox ?? { enqueueEnvelope: vi.fn() }) as never,
    intelligenceService(deps.intelligence) as never,
    verificationService(deps.verification) as never,
    profileCompletion(deps.profile) as never,
    deps.gradeQueue as never,
  );
}

describe('SkillVerificationService', () => {
  it('accepts complete and enqueues background grading when the grade queue is wired', async () => {
    const stored = {
      sessionId: SESSION_ID,
      userId: STUDENT_ID,
      claimId: CLAIM_ID,
      catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
      skillName: 'Git',
      sdeSkillCode: 'SDE_GIT',
      proficiency: 'BEGINNER',
      scoringToken: 'token',
      items: [
        { index: 1, format: 'MCQ', prompt: 'q', options: { A: 'a', B: 'b', C: 'c', D: 'd' } },
      ],
      timeMinutes: 20,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      answers: [{ index: 1, selectedKey: 'A' }],
    };
    const redis = {
      get: vi.fn().mockResolvedValue(JSON.stringify(stored)),
      setex: vi.fn().mockResolvedValue('OK'),
      exists: vi.fn().mockResolvedValue(0),
    };
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue(declaredClaim()),
        update: vi.fn().mockImplementation(({ data }: { data: { lastAttemptId: string } }) =>
          Promise.resolve({
            ...declaredClaim(),
            lastAttemptId: data.lastAttemptId,
            sourceMetadata: {
              skillVerificationPending: {
                sessionId: SESSION_ID,
                since: '2026-01-01T00:00:00.000Z',
              },
            },
          }),
        ),
      },
      skillVerificationAttempt: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const gradeQueue = { add: vi.fn().mockResolvedValue(undefined) };
    const evaluation = { gradeSkillForm: vi.fn() };
    const service = makeService({ prisma, redis, evaluation, gradeQueue });
    const gradingSpy = vi.spyOn(service, 'processQueuedComplete').mockResolvedValue(undefined);

    const result = await service.complete(student(), SESSION_ID, { responses: stored.answers });

    expect(result.gradingAccepted).toBe(true);
    expect(result.grade).toBeNull();
    expect(result.claim?.verificationInProgress).toBe(true);
    expect(gradingSpy).toHaveBeenCalledWith(SESSION_ID, STUDENT_ID);
    expect(gradeQueue.add).toHaveBeenCalledWith(
      'grade',
      { sessionId: SESSION_ID, userId: STUDENT_ID },
      { jobId: `skill-verify-grade-${SESSION_ID}` },
    );
  });

  it('re-enqueues background grading when complete is called again while grading is queued', async () => {
    const stored = {
      sessionId: SESSION_ID,
      userId: STUDENT_ID,
      claimId: CLAIM_ID,
      catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
      skillName: 'Git',
      sdeSkillCode: 'SDE_GIT',
      proficiency: 'BEGINNER',
      scoringToken: 'token',
      items: [
        { index: 1, format: 'MCQ', prompt: 'q', options: { A: 'a', B: 'b', C: 'c', D: 'd' } },
      ],
      timeMinutes: 20,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      answers: [{ index: 1, selectedKey: 'A' }],
      gradingStatus: 'QUEUED' as const,
    };
    const redis = {
      get: vi.fn().mockResolvedValue(JSON.stringify(stored)),
      setex: vi.fn().mockResolvedValue('OK'),
      exists: vi.fn().mockResolvedValue(0),
    };
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue(declaredClaim()),
        update: vi.fn().mockImplementation(({ data }: { data: { lastAttemptId: string } }) =>
          Promise.resolve({
            ...declaredClaim(),
            lastAttemptId: data.lastAttemptId,
            sourceMetadata: {
              skillVerificationPending: {
                sessionId: SESSION_ID,
                since: '2026-01-01T00:00:00.000Z',
              },
            },
          }),
        ),
      },
      skillVerificationAttempt: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const gradeQueue = { add: vi.fn().mockResolvedValue(undefined) };
    const service = makeService({
      prisma,
      redis,
      evaluation: { gradeSkillForm: vi.fn() },
      gradeQueue,
    });
    const gradingSpy = vi.spyOn(service, 'processQueuedComplete').mockResolvedValue(undefined);

    const result = await service.complete(student(), SESSION_ID, {});

    expect(result.gradingAccepted).toBe(true);
    expect(result.claim?.verificationInProgress).toBe(true);
    expect(gradeQueue.add).toHaveBeenCalled();
    expect(gradingSpy).toHaveBeenCalledWith(SESSION_ID, STUDENT_ID);
  });

  it('processQueuedComplete is a no-op when the redis session was already cleared', async () => {
    const redis = { get: vi.fn().mockResolvedValue(null) };
    const service = makeService({ prisma: {}, redis, evaluation: {} });

    await expect(service.processQueuedComplete(SESSION_ID, STUDENT_ID)).resolves.toBeUndefined();
  });

  it('prepareOnly skips LLM generate after the claim/cooldown gate', async () => {
    const evaluation = { generateSkillForm: vi.fn() };
    const redis = { setex: vi.fn().mockResolvedValue('OK') };
    const prisma = {
      skillClaim: { findUnique: vi.fn().mockResolvedValue(declaredClaim()) },
      skillVerificationAttempt: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const service = makeService({ prisma, redis, evaluation });

    const prepared = await service.start(student(), CLAIM_ID, { prepareOnly: true });
    expect('items' in prepared).toBe(false);
    expect(evaluation.generateSkillForm).not.toHaveBeenCalled();
    expect(redis.setex).toHaveBeenCalled();
  });

  it('blocks prepare when the 48h inter-attempt cooldown is still open', async () => {
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue({ ...declaredClaim(), status: 'BEGINNER_REATTEMPT' }),
      },
      skillVerificationAttempt: {
        findFirst: vi.fn().mockResolvedValue({ createdAt: new Date() }),
      },
    };
    const service = makeService({ prisma });

    await expect(service.start(student(), CLAIM_ID, { prepareOnly: true })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects catalog skills that are not on the SDE v4 bridge', async () => {
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue({
          ...declaredClaim(),
          skill: { code: '', name: 'Nope' },
        }),
      },
    };
    const service = makeService({ prisma });

    await expect(service.start(student(), CLAIM_ID)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('settles with evaluation.passed and does not require an interview flag', async () => {
    const form = {
      scoringToken: 'x'.repeat(24),
      items: [
        { index: 1, format: 'MCQ', prompt: 'q', options: { A: 'a', B: 'b', C: 'c', D: 'd' } },
      ],
      timeMinutes: 20,
      passMarkPercent: 80,
    };
    const evaluation = {
      generateSkillForm: vi.fn().mockResolvedValue(form),
      gradeSkillForm: vi.fn().mockResolvedValue({
        skillCode: 'SDE_GIT',
        proficiency: 'BEGINNER',
        marksEarned: 12,
        marksTotal: 12,
        scorePercent: 100,
        passed: true,
        promptRef: 'sde-skill-open-batch-grader@2',
        mcqCorrect: 1,
        mcqTotal: 1,
        traceCorrect: 0,
        traceTotal: 0,
        itemResults: [
          {
            index: 1,
            format: 'MCQ',
            marksEarned: 1,
            marksMax: 1,
            correct: true,
            selectedKey: 'A',
            correctKey: 'A',
            feedback: 'Correct.',
          },
        ],
      }),
    };
    const stored = {
      sessionId: SESSION_ID,
      userId: STUDENT_ID,
      claimId: CLAIM_ID,
      catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
      skillName: 'Git',
      sdeSkillCode: 'SDE_GIT',
      proficiency: 'BEGINNER',
      scoringToken: form.scoringToken,
      items: form.items,
      timeMinutes: 20,
      passMarkPercent: 80,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      answers: [{ index: 1, selectedKey: 'A' }],
    };
    const redis = {
      get: vi.fn().mockResolvedValue(JSON.stringify(stored)),
      del: vi.fn().mockResolvedValue(1),
      setex: vi.fn().mockResolvedValue('OK'),
      exists: vi.fn().mockResolvedValue(0),
    };
    const updated = {
      ...declaredClaim(),
      status: 'VERIFIED',
      lastAttemptId: SESSION_ID,
    };
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue(declaredClaim()),
        update: vi.fn(),
      },
      skillVerificationAttempt: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      $transaction: vi.fn().mockResolvedValue([updated]),
    };
    const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
    const service = makeService({ prisma, redis, evaluation, outbox });

    const result = await service.complete(student(), SESSION_ID, { responses: stored.answers });

    expect(evaluation.gradeSkillForm).toHaveBeenCalled();
    expect(prisma.skillClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'VERIFIED', strikes: 0 }),
      }),
    );
    expect(result.claim.status).toBe('VERIFIED');
    expect(result.grade?.passed).toBe(true);
    expect(outbox.enqueueEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'smart.skill.verification.completed',
        data: expect.objectContaining({ status: 'VERIFIED' }),
      }),
    );
  });

  it('blocks prepare on DECLARED when the last sit is still inside the 48h window', async () => {
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue(declaredClaim()),
      },
      skillVerificationAttempt: {
        findFirst: vi.fn().mockResolvedValue({ createdAt: new Date() }),
      },
    };
    const service = makeService({ prisma });

    await expect(service.start(student(), CLAIM_ID, { prepareOnly: true })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks start when the claim is already verified', async () => {
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue({ ...declaredClaim(), status: 'VERIFIED' }),
      },
      skillVerificationAttempt: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const service = makeService({ prisma });

    await expect(service.start(student(), CLAIM_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('applies 48h cooldown after a technical abort so the focus cannot be sat again immediately', async () => {
    const stored = {
      sessionId: SESSION_ID,
      userId: STUDENT_ID,
      claimId: CLAIM_ID,
      catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
      skillName: 'Git',
      sdeSkillCode: 'SDE_GIT',
      proficiency: 'BEGINNER',
      skillFocus: 'Branching',
      scoringToken: 'x'.repeat(24),
      items: [
        { index: 1, format: 'MCQ', prompt: 'q', options: { A: 'a', B: 'b', C: 'c', D: 'd' } },
      ],
      timeMinutes: 20,
      passMarkPercent: 80,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      answers: [],
    };
    const redis = {
      get: vi.fn().mockResolvedValue(JSON.stringify(stored)),
      del: vi.fn().mockResolvedValue(1),
      setex: vi.fn().mockResolvedValue('OK'),
      exists: vi.fn().mockResolvedValue(0),
    };
    let savedMetadata: unknown;
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockImplementation(() =>
          Promise.resolve({
            ...declaredClaim(),
            sourceMetadata: savedMetadata ?? {},
            lastAttemptId: savedMetadata ? SESSION_ID : null,
          }),
        ),
        update: vi.fn().mockImplementation((args: { data: { sourceMetadata: unknown } }) => {
          savedMetadata = args.data.sourceMetadata;
          return Promise.resolve({
            ...declaredClaim(),
            sourceMetadata: savedMetadata,
            lastAttemptId: SESSION_ID,
          });
        }),
      },
      skillVerificationAttempt: {
        create: vi.fn().mockResolvedValue({}),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    const evaluation = { gradeSkillForm: vi.fn() };
    const service = makeService({ prisma, redis, evaluation });

    const result = await service.complete(student(), SESSION_ID, { technicalFailure: true });
    expect(evaluation.gradeSkillForm).not.toHaveBeenCalled();
    expect(result.technicalFailure).toBe(true);
    expect(prisma.skillClaim.update).toHaveBeenCalled();
    const payload = prisma.skillClaim.update.mock.calls[0]?.[0] as {
      data: { sourceMetadata: { focusProgress: Array<{ lastGenuineFailureAt: string | null }> } };
    };
    expect(payload.data.sourceMetadata.focusProgress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lastGenuineFailureAt: expect.any(String) }),
      ]),
    );
    expect(result.claim.retryAvailableAt).toEqual(expect.any(String));
    expect(Date.parse(result.claim.retryAvailableAt ?? '')).toBeGreaterThan(Date.now());

    await expect(service.start(student(), CLAIM_ID, { prepareOnly: true })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('persists BEGINNER_REATTEMPT when the form is a genuine fail', async () => {
    const stored = {
      sessionId: SESSION_ID,
      userId: STUDENT_ID,
      claimId: CLAIM_ID,
      catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
      skillName: 'Git',
      sdeSkillCode: 'SDE_GIT',
      proficiency: 'BEGINNER',
      scoringToken: 'x'.repeat(24),
      items: [
        { index: 1, format: 'MCQ', prompt: 'q', options: { A: 'a', B: 'b', C: 'c', D: 'd' } },
      ],
      timeMinutes: 20,
      passMarkPercent: 80,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      answers: [{ index: 1, selectedKey: 'B' }],
    };
    const redis = {
      get: vi.fn().mockResolvedValue(JSON.stringify(stored)),
      del: vi.fn().mockResolvedValue(1),
      exists: vi.fn().mockResolvedValue(0),
    };
    const updated = {
      ...declaredClaim(),
      status: 'BEGINNER_REATTEMPT',
      strikes: 1,
      lastAttemptId: SESSION_ID,
    };
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue(declaredClaim()),
        update: vi.fn(),
      },
      skillVerificationAttempt: { create: vi.fn() },
      $transaction: vi.fn().mockResolvedValue([updated]),
    };
    const evaluation = {
      gradeSkillForm: vi.fn().mockResolvedValue({
        skillCode: 'SDE_GIT',
        proficiency: 'BEGINNER',
        marksEarned: 0,
        marksTotal: 12,
        scorePercent: 0,
        passed: false,
        promptRef: 'sde-skill-open-batch-grader@2',
        mcqCorrect: 0,
        mcqTotal: 1,
        traceCorrect: 0,
        traceTotal: 0,
        itemResults: [],
      }),
    };
    const service = makeService({ prisma, redis, evaluation });

    const result = await service.complete(student(), SESSION_ID, { responses: stored.answers });

    expect(prisma.skillClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'BEGINNER_REATTEMPT', strikes: 1 }),
      }),
    );
    expect(result.claim.status).toBe('BEGINNER_REATTEMPT');
    expect(result.technicalFailure).toBe(false);
    expect(result.grade?.passed).toBe(false);
  });

  it('treats a proctor warning-cap lock as a genuine fail, not a technical abort', async () => {
    const stored = {
      sessionId: SESSION_ID,
      userId: STUDENT_ID,
      claimId: CLAIM_ID,
      catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
      skillName: 'Git',
      sdeSkillCode: 'SDE_GIT',
      proficiency: 'BEGINNER',
      scoringToken: 'x'.repeat(24),
      items: [
        { index: 1, format: 'MCQ', prompt: 'q', options: { A: 'a', B: 'b', C: 'c', D: 'd' } },
      ],
      timeMinutes: 20,
      passMarkPercent: 80,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      answers: [],
    };
    const redis = {
      get: vi.fn().mockResolvedValue(JSON.stringify(stored)),
      del: vi.fn().mockResolvedValue(1),
      exists: vi.fn().mockResolvedValue(1),
    };
    const updated = {
      ...declaredClaim(),
      status: 'BEGINNER_REATTEMPT',
      strikes: 1,
      lastAttemptId: SESSION_ID,
    };
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue(declaredClaim()),
        update: vi.fn(),
      },
      skillVerificationAttempt: { create: vi.fn() },
      $transaction: vi.fn().mockResolvedValue([updated]),
    };
    const evaluation = { gradeSkillForm: vi.fn() };
    const service = makeService({ prisma, redis, evaluation });

    const result = await service.complete(student(), SESSION_ID, {
      technicalFailure: true,
      integrityTerminated: true,
    });

    expect(evaluation.gradeSkillForm).not.toHaveBeenCalled();
    expect(prisma.skillClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'BEGINNER_REATTEMPT', strikes: 1 }),
      }),
    );
    expect(result.technicalFailure).toBe(false);
    expect(result.claim.status).toBe('BEGINNER_REATTEMPT');
  });

  it('rejects verification start when the profile is incomplete', async () => {
    const redis = { setex: vi.fn().mockResolvedValue('OK') };
    const prisma = {
      skillClaim: { findUnique: vi.fn().mockResolvedValue(declaredClaim()) },
      skillVerificationAttempt: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const profile = profileCompletion({
      assertCompleteForSkillVerification: vi.fn().mockRejectedValue(
        new ForbiddenException({
          error: 'profile_incomplete',
          message: 'Reach at least 10% profile completion to unlock skill verification.',
          statusCode: 403,
        }),
      ),
    });
    const service = makeService({ prisma, redis, profile });

    await expect(service.start(student(), CLAIM_ID, { prepareOnly: true })).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'profile_incomplete' }),
    });
    expect(prisma.skillClaim.findUnique).not.toHaveBeenCalled();
    expect(redis.setex).not.toHaveBeenCalled();
  });

  it('ignores client-supplied profile completion hints and uses server profile state', async () => {
    const profile = profileCompletion({
      assertCompleteForSkillVerification: vi.fn().mockRejectedValue(
        new ForbiddenException({
          error: 'profile_incomplete',
          message: 'Reach at least 10% profile completion to unlock skill verification.',
          statusCode: 403,
        }),
      ),
    });
    const service = makeService({
      prisma: { skillClaim: { findUnique: vi.fn() } },
      profile,
    });

    await expect(
      service.start(student(), CLAIM_ID, { prepareOnly: true, profilePercent: 100 } as never),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'profile_incomplete' }),
    });
    expect(profile.assertCompleteForSkillVerification).toHaveBeenCalledWith(STUDENT_ID);
  });

  it('finalizes after diagnostic without a second targeted form', async () => {
    const diagnosticGrade = {
      skillCode: 'SDE_DATABASE_SQL',
      proficiency: 'BEGINNER',
      marksEarned: 8,
      marksTotal: 10,
      scorePercent: 80,
      passed: true,
      promptRef: 'sde-skill-open-batch-grader@2',
      mcqCorrect: 4,
      mcqTotal: 4,
      traceCorrect: 2,
      traceTotal: 3,
      itemResults: [],
    };
    const stored = {
      sessionId: SESSION_ID,
      userId: STUDENT_ID,
      claimId: CLAIM_ID,
      catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
      skillName: 'SQL Query Optimization',
      sdeSkillCode: 'SDE_DATABASE_SQL',
      proficiency: 'BEGINNER',
      scoringToken: 'x'.repeat(24),
      items: [
        { index: 1, format: 'MCQ', prompt: 'q', options: { A: 'a', B: 'b', C: 'c', D: 'd' } },
      ],
      timeMinutes: 20,
      passMarkPercent: 80,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      answers: [{ index: 1, selectedKey: 'A' }],
      intelligenceEnabled: true,
      stage: 'DIAGNOSTIC' as const,
    };
    const redis = {
      get: vi.fn().mockResolvedValue(JSON.stringify(stored)),
      del: vi.fn().mockResolvedValue(1),
      setex: vi.fn().mockResolvedValue('OK'),
      exists: vi.fn().mockResolvedValue(0),
    };
    const evaluation = {
      gradeSkillForm: vi.fn().mockResolvedValue(diagnosticGrade),
      generateSkillForm: vi.fn(),
    };
    const intelligence = intelligenceService({
      resolveBlueprint: vi.fn().mockReturnValue({
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        competencyModel: [{ id: 'c1', capability: 'Pipelines' }],
      }),
      buildAssessmentResult: vi.fn().mockReturnValue({
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        assessmentVersion: 'v1',
        attemptId: SESSION_ID,
        competencyResults: [],
        highestAssessmentSupportedProficiency: 'BEGINNER',
        targetProficiency: 'BEGINNER',
        assessmentPassed: true,
        uncertainties: [],
        recommendedNextStep: 'REMEDIATION',
        requiresInterview: false,
        requiresAdditionalAssessment: false,
        confidence: 'MEDIUM',
        evaluatedAt: new Date().toISOString(),
      }),
      claimPassesFromAssessment: vi.fn().mockReturnValue(false),
    });
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue(declaredClaim()),
        update: vi.fn(),
      },
      skillVerificationAttempt: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      $transaction: vi.fn().mockResolvedValue([declaredClaim()]),
    };
    const verification = verificationService({
      evaluateClaimVerification: vi.fn().mockResolvedValue({
        recommendedNextStep: 'NONE',
        requiresInterview: false,
        requiresEvidence: false,
        canFinalizeClaim: true,
        reasons: [],
      }),
    });
    const service = makeService({ prisma, redis, evaluation, intelligence, verification });

    const result = await service.complete(student(), SESSION_ID, { responses: stored.answers });

    expect(evaluation.generateSkillForm).not.toHaveBeenCalled();
    expect(result.grade?.marksEarned).toBe(8);
  });

  it('allows verification start when the eight-area profile is complete', async () => {
    const redis = { setex: vi.fn().mockResolvedValue('OK') };
    const prisma = {
      skillClaim: { findUnique: vi.fn().mockResolvedValue(declaredClaim()) },
      skillVerificationAttempt: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const profile = profileCompletion();
    const service = makeService({ prisma, redis, profile });

    await service.start(student(), CLAIM_ID, { prepareOnly: true });

    expect(profile.assertCompleteForSkillVerification).toHaveBeenCalledWith(STUDENT_ID);
    expect(redis.setex).toHaveBeenCalled();
  });
});
