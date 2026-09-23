import { describe, expect, it, vi } from 'vitest';
import type { AssessmentResult, GradeSdeSkillFormResponse } from '@smart/contracts';
import { withSkillVerificationPending } from '@smart/contracts';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { SkillVerificationService } from './skill-verification.service.js';

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const CLAIM_ID = '22222222-2222-4222-8222-222222222222';
const SESSION_ID = '33333333-3333-4333-8333-333333333333';
const COMPETENCY_ID = 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee';

function student(): RequestUser {
  return { sub: STUDENT_ID, role: 'STUDENT', inst: null };
}

function professionalClaim() {
  return {
    id: CLAIM_ID,
    studentId: STUDENT_ID,
    proficiency: 'PROFESSIONAL',
    status: 'DECLARED',
    strikes: 0,
    lockedUntil: null,
    verifiedUntil: null,
    lastAttemptId: null,
    sourceMetadata: {},
    skill: { code: 'SQL_QUERY_OPTIMIZATION', name: 'SQL Query Optimization' },
  };
}

function claimMarkedInProgress() {
  return {
    ...professionalClaim(),
    lastAttemptId: SESSION_ID,
    sourceMetadata: withSkillVerificationPending({}, SESSION_ID),
    skill: { code: 'SQL_QUERY_OPTIMIZATION', name: 'SQL Query Optimization' },
  };
}

function passedGrade(): GradeSdeSkillFormResponse {
  return {
    skillCode: 'SDE_DATABASE_SQL',
    proficiency: 'PROFESSIONAL',
    marksEarned: 30,
    marksTotal: 30,
    scorePercent: 100,
    passed: true,
    promptRef: 'sde-skill-open-batch-grader@2',
    mcqCorrect: 2,
    mcqTotal: 2,
    traceCorrect: 1,
    traceTotal: 1,
    itemResults: [],
  };
}

function assessmentResult(overrides?: Partial<AssessmentResult>): AssessmentResult {
  return {
    skillCode: 'SQL_QUERY_OPTIMIZATION',
    assessmentVersion: 'v1',
    attemptId: SESSION_ID,
    competencyResults: [
      {
        competencyId: COMPETENCY_ID,
        status: 'DEMONSTRATED',
        confidence: 'HIGH',
        evidence: [],
      },
    ],
    highestAssessmentSupportedProficiency: 'PROFESSIONAL',
    targetProficiency: 'PROFESSIONAL',
    assessmentComplete: true,
    assessmentPassed: true,
    requiresEvidenceVerification: false,
    uncertainties: [],
    recommendedNextStep: 'EVIDENCE_VERIFICATION',
    requiresInterview: true,
    requiresAdditionalAssessment: false,
    confidence: 'HIGH',
    evaluatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function pendingStoredSession(includePending = false) {
  const session = {
    sessionId: SESSION_ID,
    userId: STUDENT_ID,
    claimId: CLAIM_ID,
    catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
    skillName: 'SQL Query Optimization',
    sdeSkillCode: 'SDE_DATABASE_SQL',
    proficiency: 'PROFESSIONAL',
    skillFocus: null,
    scoringToken: 'x'.repeat(24),
    items: [{ index: 1, format: 'MCQ', prompt: 'q', options: { A: 'a', B: 'b', C: 'c', D: 'd' } }],
    timeMinutes: 30,
    passMarkPercent: 80,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    answers: [{ index: 1, selectedKey: 'A' }],
    intelligenceEnabled: true,
    stage: 'FULL' as const,
  };
  if (includePending) {
    return {
      ...session,
      pendingAssessmentResult: assessmentResult(),
      pendingGrade: passedGrade(),
      verificationStep: 'INTERVIEW' as const,
    };
  }
  return session;
}

function makeService(deps: {
  prisma?: Record<string, unknown>;
  redis?: Record<string, unknown>;
  evaluation?: Record<string, unknown>;
  intelligence?: Record<string, unknown>;
  verification?: Record<string, unknown>;
  outbox?: Record<string, unknown>;
  profile?: Record<string, unknown>;
}) {
  return new SkillVerificationService(
    (deps.prisma ?? {
      skillClaim: { findUnique: vi.fn(), update: vi.fn() },
      skillVerificationAttempt: { create: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) },
      evidenceRecord: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(),
    }) as never,
    (deps.redis ?? {
      get: vi.fn(),
      setex: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      exists: vi.fn().mockResolvedValue(0),
    }) as never,
    (deps.evaluation ?? {
      generateSkillForm: vi.fn(),
      gradeSkillForm: vi.fn(),
      generateSkillInterview: vi.fn(),
      gradeSkillInterview: vi.fn(),
    }) as never,
    (deps.outbox ?? { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) }) as never,
    (deps.intelligence ?? {
      resolveBlueprint: vi.fn(),
      buildAssessmentResult: vi.fn(),
      claimPassesFromAssessment: vi.fn().mockReturnValue(false),
    }) as never,
    (deps.verification ?? {
      evaluateClaimVerification: vi.fn(),
    }) as never,
    { fuseForVerification: vi.fn().mockResolvedValue(null) } as never,
    (deps.profile ?? {
      assertCompleteForSkillVerification: vi.fn().mockResolvedValue(undefined),
      isCompleteForSkillVerification: vi.fn().mockResolvedValue(true),
      getProgressForStudent: vi.fn().mockResolvedValue({ percent: 100 }),
    }) as never,
  );
}

describe('SkillVerificationService pending verification flow', () => {
  it('runs assessment → interview → evidence → verified professional claim', async () => {
    const stored = pendingStoredSession(false);
    const redisStore = { ...stored };
    const redis = {
      get: vi.fn().mockImplementation(async () => JSON.stringify(redisStore)),
      setex: vi.fn().mockImplementation(async (_key: string, _ttl: number, value: string) => {
        Object.assign(redisStore, JSON.parse(value));
        return 'OK';
      }),
      del: vi.fn().mockResolvedValue(1),
      exists: vi.fn().mockResolvedValue(0),
    };

    const updatedClaim = {
      ...professionalClaim(),
      status: 'VERIFIED',
      proficiency: 'PROFESSIONAL',
      lastAttemptId: SESSION_ID,
    };

    const verification = {
      evaluateClaimVerification: vi
        .fn()
        .mockResolvedValueOnce({
          recommendedNextStep: 'INTERVIEW',
          requiresInterview: true,
          requiresEvidence: true,
          canFinalizeClaim: false,
          reasons: [],
        })
        .mockResolvedValueOnce({
          recommendedNextStep: 'EVIDENCE_VERIFICATION',
          requiresInterview: true,
          requiresEvidence: true,
          canFinalizeClaim: false,
          reasons: ['Professional verification requires linked project or work evidence.'],
        })
        .mockResolvedValueOnce({
          recommendedNextStep: 'NONE',
          requiresInterview: true,
          requiresEvidence: true,
          canFinalizeClaim: true,
          verificationDecision: 'VERIFIED',
          claimConfidence: 0.85,
          reasons: [],
        }),
    };

    const evaluation = {
      gradeSkillForm: vi.fn().mockResolvedValue(passedGrade()),
      generateSkillInterview: vi.fn().mockResolvedValue({
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        proficiency: 'ADVANCED',
        questions: [
          { index: 1, text: 'Describe a production SQL optimization you led.' },
          { index: 2, text: 'How do you validate an index change before rollout?' },
          { index: 3, text: 'Explain a time you resolved a query regression.' },
        ],
        promptRef: 'skill-interview-examiner@1',
      }),
      gradeSkillInterview: vi.fn().mockResolvedValue({
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        proficiency: 'ADVANCED',
        passed: true,
        explanation: 'Defense interview passed.',
        promptRef: 'skill-interview-grader@1',
        auditId: null,
      }),
    };

    const intelligence = {
      resolveBlueprint: vi.fn().mockReturnValue({
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        competencyModel: [],
      }),
      buildAssessmentResult: vi.fn().mockReturnValue(assessmentResult()),
      claimPassesFromAssessment: vi
        .fn()
        .mockImplementation(
          (result: { recommendedNextStep: string }) => result.recommendedNextStep === 'NONE',
        ),
    };

    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue(professionalClaim()),
        update: vi.fn().mockResolvedValue(claimMarkedInProgress()),
      },
      skillVerificationAttempt: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      evidenceRecord: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      verificationDecision: {
        create: vi.fn().mockResolvedValue({ id: 'decision-1' }),
      },
      $transaction: vi.fn().mockImplementation(async (ops) => {
        const results = [];
        for (const op of ops) {
          results.push(await op);
        }
        return [updatedClaim, ...results.slice(1)];
      }),
    };

    const service = makeService({ prisma, redis, evaluation, intelligence, verification });

    const pending = await service.complete(student(), SESSION_ID, {
      responses: stored.answers,
    });
    expect(pending.pendingVerification).toBe(true);
    expect(pending.assessmentResult?.recommendedNextStep).toBe('INTERVIEW');
    expect(pending.claim.verificationInProgress).toBe(true);
    expect(prisma.skillClaim.update).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();

    const interview = await service.startInterview(student(), SESSION_ID);
    expect(interview.questions).toHaveLength(3);
    expect(evaluation.generateSkillInterview).toHaveBeenCalledTimes(1);

    await service.startInterview(student(), SESSION_ID);
    expect(evaluation.generateSkillInterview).toHaveBeenCalledTimes(1);

    const afterInterview = await service.completeInterview(student(), SESSION_ID, {
      items: interview.questions.map((question) => ({
        index: question.index,
        question: question.text,
        answer: 'Led index tuning with measured latency gains.',
      })),
    });
    expect(afterInterview.pendingVerification).toBe(true);
    expect(afterInterview.assessmentResult?.recommendedNextStep).toBe('EVIDENCE_VERIFICATION');

    const finalized = await service.finalizeVerification(student(), SESSION_ID);
    expect(finalized.claim.status).toBe('VERIFIED');
    expect(finalized.claim.proficiency).toBe('PROFESSIONAL');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalled();
  });

  it('returns pending verification without incrementing strikes when interview is required', async () => {
    const stored = pendingStoredSession(false);

    const redis = {
      get: vi.fn().mockResolvedValue(JSON.stringify(stored)),
      setex: vi.fn().mockResolvedValue('OK'),
      del: vi.fn(),
      exists: vi.fn().mockResolvedValue(0),
    };

    const evaluation = {
      gradeSkillForm: vi.fn().mockResolvedValue(passedGrade()),
    };
    const intelligence = {
      resolveBlueprint: vi.fn().mockReturnValue({
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        competencyModel: [{ competencyId: COMPETENCY_ID, capability: 'Debugging' }],
      }),
      buildAssessmentResult: vi
        .fn()
        .mockReturnValue(assessmentResult({ recommendedNextStep: 'INTERVIEW' })),
      claimPassesFromAssessment: vi.fn().mockReturnValue(false),
    };
    const verification = {
      evaluateClaimVerification: vi.fn().mockResolvedValue({
        recommendedNextStep: 'INTERVIEW',
        requiresInterview: true,
        requiresEvidence: true,
        canFinalizeClaim: false,
        reasons: [],
      }),
    };

    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue(professionalClaim()),
        update: vi.fn().mockResolvedValue(claimMarkedInProgress()),
      },
      skillVerificationAttempt: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
      evidenceRecord: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn(),
    };

    const service = makeService({ prisma, redis, evaluation, intelligence, verification });
    const result = await service.complete(student(), SESSION_ID, { responses: stored.answers });

    expect(result.pendingVerification).toBe(true);
    expect(result.claim.status).toBe('DECLARED');
    expect(result.claim.strikes).toBe(0);
    expect(result.claim.verificationInProgress).toBe(true);
    expect(prisma.skillClaim.update).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
