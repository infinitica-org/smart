import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { AssessmentService } from './assessment.service.js';

/**
 * POST /assessment/complete (SE-T01/CN-T04 finalisation).
 *
 * Each test pins one promise this endpoint makes: the mark-weighted score is
 * computed correctly, the SkillClaim state machine is the only thing that
 * decides a claim's fate, and CODE_TASK items never inflate a score they
 * cannot actually verify (no sandbox yet).
 */

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_STUDENT_ID = '22222222-2222-4222-8222-222222222222';
const ATTEMPT_ID = '55555555-5555-4555-8555-555555555555';
const CLAIM_ID = '44444444-4444-4444-8444-444444444444';
const MCQ_ITEM_ID = '66666666-6666-4666-8666-666666666666';
const MCQ_OPTION_CORRECT = '77777777-7777-4777-8777-777777777777';
const MCQ_OPTION_WRONG = '88888888-8888-4888-8888-888888888888';

function studentUser(sub = STUDENT_ID): RequestUser {
  return { sub, role: 'STUDENT', inst: null };
}

function mcqResponse(selectedOptionId: string) {
  return {
    id: 'resp-mcq',
    answer: { kind: 'MCQ', selectedOptionIds: [selectedOptionId] },
    item: {
      id: MCQ_ITEM_ID,
      itemType: 'MCQ_SINGLE',
      stem: 'Which is correct?',
      modelAnswer: null,
      options: [
        { id: MCQ_OPTION_CORRECT, isCorrect: true },
        { id: MCQ_OPTION_WRONG, isCorrect: false },
      ],
    },
  };
}

function baseAttempt(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: ATTEMPT_ID,
    userId: STUDENT_ID,
    status: 'IN_PROGRESS',
    level: { track: { code: 'TECH_FULLSTACK' } },
    responses: [mcqResponse(MCQ_OPTION_CORRECT)],
    ...overrides,
  };
}

describe('completeAttempt', () => {
  const findUniqueAttempt = vi.fn();
  const updateAttempt = vi.fn();
  const findUniqueClaim = vi.fn();
  const findFirstVerificationAttempt = vi.fn();
  const transaction = vi.fn();
  const aiComplete = vi.fn();
  let service: AssessmentService;

  beforeEach(() => {
    findUniqueAttempt.mockReset();
    updateAttempt.mockReset().mockResolvedValue({});
    findUniqueClaim.mockReset();
    findFirstVerificationAttempt.mockReset().mockResolvedValue(null);
    transaction.mockReset().mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
    aiComplete.mockReset();

    const prisma = {
      attempt: { findUnique: findUniqueAttempt, update: updateAttempt },
      skillClaim: {
        findUnique: findUniqueClaim,
        // Echoes back the transition's `data` so tests can assert on the
        // actual post-transition state rather than a fixed fixture.
        update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: CLAIM_ID,
            studentId: STUDENT_ID,
            lastAttemptId: ATTEMPT_ID,
            skill: { code: 'GIT_VERSION_CONTROL' },
            ...data,
          }),
        ),
      },
      skillVerificationAttempt: {
        findFirst: findFirstVerificationAttempt,
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
      },
      $transaction: transaction,
    };
    const aiGateway = { complete: aiComplete };
    const outbox = { enqueueAssessmentSubmitted: vi.fn().mockResolvedValue(undefined) };
    service = new AssessmentService(
      prisma as never,
      {} as never,
      {} as never,
      outbox as never,
      {} as never,
      aiGateway as never,
    );
  });

  it('rejects completing another candidate’s attempt', async () => {
    findUniqueAttempt.mockResolvedValue(baseAttempt({ userId: OTHER_STUDENT_ID }));
    await expect(
      service.completeAttempt(studentUser(), {
        attemptId: ATTEMPT_ID,
        autoSubmitted: false,
        technicalFailure: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404s on an unknown attempt', async () => {
    findUniqueAttempt.mockResolvedValue(null);
    await expect(
      service.completeAttempt(studentUser(), {
        attemptId: ATTEMPT_ID,
        autoSubmitted: false,
        technicalFailure: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to re-finalise an already-evaluated attempt', async () => {
    findUniqueAttempt.mockResolvedValue(baseAttempt({ status: 'EVALUATED' }));
    await expect(
      service.completeAttempt(studentUser(), {
        attemptId: ATTEMPT_ID,
        autoSubmitted: false,
        technicalFailure: false,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an attempt with no scoreable responses', async () => {
    findUniqueAttempt.mockResolvedValue(baseAttempt({ responses: [] }));
    await expect(
      service.completeAttempt(studentUser(), {
        attemptId: ATTEMPT_ID,
        autoSubmitted: false,
        technicalFailure: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('scores a correct MCQ response as a full mark, with no claim linkage', async () => {
    findUniqueAttempt.mockResolvedValue(baseAttempt());
    const result = await service.completeAttempt(studentUser(), {
      attemptId: ATTEMPT_ID,
      autoSubmitted: false,
      technicalFailure: false,
    });
    expect(result.marksEarned).toBe(1);
    expect(result.marksTotal).toBe(1);
    expect(result.scorePercent).toBe(100);
    expect(result.claim).toBeNull();
    expect(updateAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'EVALUATED' }) }),
    );
  });

  it('scores a wrong MCQ response as zero', async () => {
    findUniqueAttempt.mockResolvedValue(
      baseAttempt({ responses: [mcqResponse(MCQ_OPTION_WRONG)] }),
    );
    const result = await service.completeAttempt(studentUser(), {
      attemptId: ATTEMPT_ID,
      autoSubmitted: false,
      technicalFailure: false,
    });
    expect(result.marksEarned).toBe(0);
    expect(result.scorePercent).toBe(0);
  });

  it('marks a CODE_TASK item incomplete rather than silently scoring it', async () => {
    findUniqueAttempt.mockResolvedValue(
      baseAttempt({
        responses: [
          mcqResponse(MCQ_OPTION_CORRECT),
          {
            id: 'resp-code',
            answer: { kind: 'CODE', language: 'node', source: 'function f() {}' },
            item: {
              id: 'code-item',
              itemType: 'CODE_TASK',
              stem: 'Implement f.',
              modelAnswer: null,
              options: [],
            },
          },
        ],
      }),
    );
    const result = await service.completeAttempt(studentUser(), {
      attemptId: ATTEMPT_ID,
      autoSubmitted: false,
      technicalFailure: false,
    });
    expect(result.incomplete).toBe(true);
    expect(result.marksTotal).toBe(11); // 1 (MCQ) + 10 (unearned coding max)
    expect(result.marksEarned).toBe(1);
  });

  it('calls the AI gateway for a SHORT_ANSWER item and applies the returned marks', async () => {
    aiComplete.mockResolvedValue({
      output: { marksAwarded: 2, justification: 'Mostly correct.' },
      auditId: null,
    });
    findUniqueAttempt.mockResolvedValue(
      baseAttempt({
        responses: [
          {
            id: 'resp-short',
            answer: { kind: 'TEXT', text: 'Immutability means...' },
            item: {
              id: 'short-item',
              itemType: 'SHORT_ANSWER',
              stem: 'Explain immutability.',
              modelAnswer: 'A value that cannot change after creation.',
              options: [],
            },
          },
        ],
      }),
    );
    const result = await service.completeAttempt(studentUser(), {
      attemptId: ATTEMPT_ID,
      autoSubmitted: false,
      technicalFailure: false,
    });
    expect(aiComplete).toHaveBeenCalledWith(
      expect.objectContaining({ promptRef: 'proficiency-short-answer@1' }),
    );
    expect(result.marksEarned).toBe(2);
    expect(result.marksTotal).toBe(3);
  });

  it('verifies a BEGINNER claim on a passing assessment-only score (no interview required)', async () => {
    findUniqueAttempt.mockResolvedValue(baseAttempt());
    findUniqueClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: STUDENT_ID,
      status: 'DECLARED',
      proficiency: 'BEGINNER',
      strikes: 0,
      lockedUntil: null,
      verifiedUntil: null,
      skill: { name: 'React' },
    });

    const result = await service.completeAttempt(studentUser(), {
      attemptId: ATTEMPT_ID,
      claimId: CLAIM_ID,
      autoSubmitted: false,
      technicalFailure: false,
    });

    expect(transaction).toHaveBeenCalled();
    expect(result.claim?.status).toBe('VERIFIED');
  });

  it('fails an INTERMEDIATE claim on a passing assessment score without a passed interview', async () => {
    findUniqueAttempt.mockResolvedValue(baseAttempt());
    findUniqueClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: STUDENT_ID,
      status: 'DECLARED',
      proficiency: 'INTERMEDIATE',
      strikes: 0,
      lockedUntil: null,
      verifiedUntil: null,
      skill: { name: 'React' },
    });

    const result = await service.completeAttempt(studentUser(), {
      attemptId: ATTEMPT_ID,
      claimId: CLAIM_ID,
      autoSubmitted: false,
      technicalFailure: false,
      // interviewPassed omitted — assessment alone must not be enough at Intermediate+
    });

    // GENUINE_FAIL from DECLARED -> BEGINNER_REATTEMPT (SE-T01), never VERIFIED,
    // even though the written assessment itself scored 100%.
    expect(result.claim?.status).toBe('BEGINNER_REATTEMPT');
  });

  it('verifies an INTERMEDIATE claim when both the assessment and interview pass', async () => {
    findUniqueAttempt.mockResolvedValue(baseAttempt());
    findUniqueClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: STUDENT_ID,
      status: 'DECLARED',
      proficiency: 'INTERMEDIATE',
      strikes: 0,
      lockedUntil: null,
      verifiedUntil: null,
      skill: { name: 'React' },
    });

    const result = await service.completeAttempt(studentUser(), {
      attemptId: ATTEMPT_ID,
      claimId: CLAIM_ID,
      autoSubmitted: false,
      technicalFailure: false,
      interviewPassed: true,
    });

    expect(result.claim?.status).toBe('VERIFIED');
  });

  it('never consumes a strike on a technical failure', async () => {
    findUniqueAttempt.mockResolvedValue(baseAttempt());
    findUniqueClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: STUDENT_ID,
      status: 'DECLARED',
      proficiency: 'BEGINNER',
      strikes: 0,
      lockedUntil: null,
      verifiedUntil: null,
      skill: { name: 'React' },
    });

    const result = await service.completeAttempt(studentUser(), {
      attemptId: ATTEMPT_ID,
      claimId: CLAIM_ID,
      autoSubmitted: false,
      technicalFailure: true,
    });

    expect(result.claim?.status).toBe('DECLARED');
    expect(result.claim?.strikes).toBe(0);
  });

  it('blocks completion when the claim is already VERIFIED', async () => {
    findUniqueAttempt.mockResolvedValue(baseAttempt());
    findUniqueClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: STUDENT_ID,
      status: 'VERIFIED',
      proficiency: 'BEGINNER',
      strikes: 0,
      lockedUntil: null,
      verifiedUntil: new Date(Date.now() + 86_400_000),
      skill: { name: 'React' },
    });

    await expect(
      service.completeAttempt(studentUser(), {
        attemptId: ATTEMPT_ID,
        claimId: CLAIM_ID,
        autoSubmitted: false,
        technicalFailure: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects settling a claim that does not belong to the caller', async () => {
    findUniqueAttempt.mockResolvedValue(baseAttempt());
    findUniqueClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: OTHER_STUDENT_ID,
      status: 'DECLARED',
      proficiency: 'BEGINNER',
      strikes: 0,
      lockedUntil: null,
      verifiedUntil: null,
      skill: { name: 'React' },
    });

    await expect(
      service.completeAttempt(studentUser(), {
        attemptId: ATTEMPT_ID,
        claimId: CLAIM_ID,
        autoSubmitted: false,
        technicalFailure: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
