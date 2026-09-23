import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { SkillVerificationService } from './skill-verification.service.js';

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const CLAIM_ID = '22222222-2222-4222-8222-222222222222';
const SESSION_ID = '33333333-3333-4333-8333-333333333333';

function student(): RequestUser {
  return { sub: STUDENT_ID, role: 'STUDENT', inst: null };
}

function pendingSession() {
  return {
    sessionId: SESSION_ID,
    userId: STUDENT_ID,
    claimId: CLAIM_ID,
    catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
    skillName: 'SQL Query Optimization',
    sdeSkillCode: 'SDE_DATABASE_SQL',
    proficiency: 'ADVANCED',
    skillFocus: null,
    scoringToken: 'x'.repeat(24),
    items: [],
    timeMinutes: 30,
    passMarkPercent: 80,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    answers: [],
    pendingAssessmentResult: {
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      assessmentVersion: 'v1',
      attemptId: SESSION_ID,
      competencyResults: [],
      highestAssessmentSupportedProficiency: 'ADVANCED',
      targetProficiency: 'ADVANCED',
      uncertainties: [],
      recommendedNextStep: 'INTERVIEW',
      requiresInterview: true,
      requiresAdditionalAssessment: false,
      confidence: 'LOW',
      evaluatedAt: new Date().toISOString(),
    },
    pendingGrade: {
      skillCode: 'SDE_DATABASE_SQL',
      proficiency: 'ADVANCED',
      marksEarned: 24,
      marksTotal: 30,
      scorePercent: 80,
      passed: true,
      promptRef: 'sde-skill-open-batch-grader@2',
      mcqCorrect: 2,
      mcqTotal: 2,
      traceCorrect: 0,
      traceTotal: 1,
      itemResults: [],
    },
  };
}

function makeService(redisStore: Record<string, unknown>) {
  const redis = {
    get: vi.fn().mockImplementation(async () => JSON.stringify(redisStore)),
    setex: vi.fn().mockImplementation(async (_key: string, _ttl: number, value: string) => {
      Object.assign(redisStore, JSON.parse(value));
      return 'OK';
    }),
    del: vi.fn(),
    exists: vi.fn().mockResolvedValue(0),
  };

  return new SkillVerificationService(
    {
      skillClaim: { findUnique: vi.fn() },
      skillVerificationAttempt: { findFirst: vi.fn(), create: vi.fn() },
      $transaction: vi.fn(),
    } as never,
    redis as never,
    {
      gradeSkillInterview: vi.fn(),
      generateSkillInterview: vi.fn(),
    } as never,
    { enqueueEnvelope: vi.fn() } as never,
    { resolveBlueprint: vi.fn(), buildAssessmentResult: vi.fn() } as never,
    { evaluateClaimVerification: vi.fn() } as never,
    { fuseForVerification: vi.fn().mockResolvedValue(null) } as never,
    {
      assertCompleteForSkillVerification: vi.fn().mockResolvedValue(undefined),
      isCompleteForSkillVerification: vi.fn().mockResolvedValue(true),
      getProgressForStudent: vi.fn().mockResolvedValue({ percent: 100 }),
    } as never,
  );
}

describe('SkillVerificationService interview security', () => {
  it('rejects completeInterview when interview/start was never called', async () => {
    const redisStore = pendingSession();
    const service = makeService(redisStore);

    await expect(
      service.completeInterview(student(), SESSION_ID, {
        items: [
          { index: 1, question: 'Easy question one here?', answer: 'answer one' },
          { index: 2, question: 'Easy question two here?', answer: 'answer two' },
          { index: 3, question: 'Easy question three here?', answer: 'answer three' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects substituted interview questions', async () => {
    const redisStore = {
      ...pendingSession(),
      interviewQuestions: [
        { index: 1, text: 'Describe a production SQL optimization you led.' },
        { index: 2, text: 'How do you validate an index change before rollout?' },
        { index: 3, text: 'Explain a time you resolved a query regression.' },
      ],
    };
    const service = makeService(redisStore);

    await expect(
      service.completeInterview(student(), SESSION_ID, {
        items: [
          { index: 1, question: 'What is 2+2?', answer: '4' },
          { index: 2, question: 'What is 3+3?', answer: '6' },
          { index: 3, question: 'What is 4+4?', answer: '8' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
