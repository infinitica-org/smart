import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GradingAdminService } from './grading-admin.service.js';

const actorId = randomUUID();
const responseId = randomUUID();
const attemptId = randomUUID();

function subjectiveResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: responseId,
    attemptId,
    itemId: randomUUID(),
    answer: { kind: 'TEXT', text: 'Candidate answer text' },
    score: null,
    maxScore: 10,
    evaluatedBy: null,
    evaluatedAt: null,
    item: { stem: 'Explain REST', itemType: 'SHORT_ANSWER' },
    attempt: {
      status: 'EVALUATED',
      userId: randomUUID(),
      completedAt: new Date(),
      user: { fullName: 'Ada Lovelace' },
      level: { levelNumber: 1, track: { code: 'IT_SE' } },
    },
    ...overrides,
  };
}

describe('GradingAdminService (T17)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists eligible subjective responses', async () => {
    const prisma = {
      response: {
        findMany: vi.fn().mockResolvedValue([subjectiveResponse()]),
        count: vi.fn().mockResolvedValue(1),
      },
    };
    const recalculation = { recalculateForAttempt: vi.fn() };
    const service = new GradingAdminService(
      prisma as never,
      { record: vi.fn() } as never,
      recalculation as never,
    );
    const result = await service.listQueue({ page: 1, pageSize: 25 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.itemType).toBe('SHORT_ANSWER');
  });

  it('rejects grading non-subjective responses', async () => {
    const prisma = {
      response: {
        findUnique: vi
          .fn()
          .mockResolvedValue(subjectiveResponse({ item: { itemType: 'MCQ_SINGLE', stem: 'Q' } })),
      },
    };
    const service = new GradingAdminService(
      prisma as never,
      { record: vi.fn() } as never,
      { recalculateForAttempt: vi.fn() } as never,
    );
    await expect(service.gradeResponse(actorId, responseId, { score: 5 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects score above max', async () => {
    const prisma = {
      response: { findUnique: vi.fn().mockResolvedValue(subjectiveResponse()) },
    };
    const service = new GradingAdminService(
      prisma as never,
      { record: vi.fn() } as never,
      { recalculateForAttempt: vi.fn() } as never,
    );
    await expect(service.gradeResponse(actorId, responseId, { score: 99 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('grades response, recalculates attempt, and audits once', async () => {
    const prisma = {
      response: {
        findUnique: vi.fn().mockResolvedValue(subjectiveResponse()),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (fn) => fn({ response: { update: vi.fn() } })),
    };
    const recalculation = {
      recalculateForAttempt: vi.fn().mockResolvedValue({
        attemptId,
        marksEarned: 8,
        marksTotal: 10,
        scorePercent: 80,
        tierAwarded: null,
        confidenceBand: null,
        borderline: false,
      }),
    };
    const auditPublisher = { record: vi.fn() };
    const service = new GradingAdminService(
      prisma as never,
      auditPublisher as never,
      recalculation as never,
    );
    const result = await service.gradeResponse(actorId, responseId, { score: 8 });
    expect(result.evaluatedBy).toBe('HUMAN_RATER');
    expect(recalculation.recalculateForAttempt).toHaveBeenCalledWith(attemptId, {
      actorId,
      trigger: 'manual_grade',
      reasonCode: null,
    });
    expect(auditPublisher.record).toHaveBeenCalledTimes(1);
  });

  it('is idempotent for repeated identical grades', async () => {
    const prisma = {
      response: {
        findUnique: vi.fn().mockResolvedValue(
          subjectiveResponse({
            score: 8,
            evaluatedBy: 'HUMAN_RATER',
            evaluatedAt: new Date(),
          }),
        ),
      },
    };
    const recalculation = {
      recalculateForAttempt: vi.fn().mockResolvedValue({
        attemptId,
        scorePercent: 80,
        marksEarned: 8,
        marksTotal: 10,
        tierAwarded: null,
        confidenceBand: null,
        borderline: false,
      }),
    };
    const auditPublisher = { record: vi.fn() };
    const service = new GradingAdminService(
      prisma as never,
      auditPublisher as never,
      recalculation as never,
    );
    await service.gradeResponse(actorId, responseId, { score: 8 });
    expect(auditPublisher.record).not.toHaveBeenCalled();
  });
});
