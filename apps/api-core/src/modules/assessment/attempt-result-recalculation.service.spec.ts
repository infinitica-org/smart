import { describe, expect, it, vi } from 'vitest';
import { AttemptResultRecalculationService } from './attempt-result-recalculation.service.js';

const ATTEMPT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LEVEL_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ITEM_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('AttemptResultRecalculationService', () => {
  it('updates rawScore and sets tierAwarded to null when level has no published CutScores', async () => {
    const findUniqueAttempt = vi.fn().mockResolvedValue({
      id: ATTEMPT_ID,
      levelId: LEVEL_ID,
      level: {
        id: LEVEL_ID,
        cutScores: [], // No published CutScores
      },
      responses: [
        {
          id: 'resp-1',
          itemId: ITEM_ID,
          score: 3,
          maxScore: 3,
          item: {
            id: ITEM_ID,
            itemType: 'SHORT_ANSWER',
          },
        },
      ],
      result: {
        attemptId: ATTEMPT_ID,
        rawScore: 50,
        tierAwarded: 'BRONZE',
        confidenceBand: '70-80',
        borderline: false,
      },
    });

    const audit = { record: vi.fn() };
    const updateLevelResult = vi.fn().mockResolvedValue({});
    const createLevelResult = vi.fn().mockResolvedValue({});

    const prisma = {
      attempt: { findUnique: findUniqueAttempt },
      levelResult: { update: updateLevelResult, create: createLevelResult },
    };

    const service = new AttemptResultRecalculationService(prisma as never, audit as never);
    const result = await service.recalculateForAttempt(ATTEMPT_ID);

    expect(result.scorePercent).toBe(100);
    expect(result.tierAwarded).toBeNull();
    expect(updateLevelResult).toHaveBeenCalledWith({
      where: { attemptId: ATTEMPT_ID },
      data: {
        rawScore: 100,
        tierAwarded: null,
        confidenceBand: '70-80',
        borderline: false,
      },
    });
    expect(createLevelResult).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith({
      actorId: null,
      action: 'score.recalculated',
      resourceType: 'Attempt',
      resourceId: ATTEMPT_ID,
      reasonCode: null,
      metadata: {
        trigger: 'system',
        levelId: LEVEL_ID,
        previousScorePercent: 50,
        nextScorePercent: 100,
        previousTier: 'BRONZE',
        nextTier: null,
      },
    });
  });

  it('creates LevelResult with rawScore when result record does not exist initially and no cutScores exist', async () => {
    const findUniqueAttempt = vi.fn().mockResolvedValue({
      id: ATTEMPT_ID,
      levelId: LEVEL_ID,
      level: {
        id: LEVEL_ID,
        cutScores: [],
      },
      responses: [
        {
          id: 'resp-1',
          itemId: ITEM_ID,
          score: 1,
          maxScore: 1,
          item: {
            id: ITEM_ID,
            itemType: 'MCQ_SINGLE',
          },
        },
      ],
      result: null,
    });

    const audit = { record: vi.fn() };
    const updateLevelResult = vi.fn().mockResolvedValue({});
    const createLevelResult = vi.fn().mockResolvedValue({});

    const prisma = {
      attempt: { findUnique: findUniqueAttempt },
      levelResult: { update: updateLevelResult, create: createLevelResult },
    };

    const service = new AttemptResultRecalculationService(prisma as never, audit as never);
    const result = await service.recalculateForAttempt(ATTEMPT_ID);

    expect(result.scorePercent).toBe(100);
    expect(result.tierAwarded).toBeNull();
    expect(createLevelResult).toHaveBeenCalledWith({
      data: {
        attemptId: ATTEMPT_ID,
        levelId: LEVEL_ID,
        rawScore: 100,
        tierAwarded: null,
        confidenceBand: '100%',
        borderline: false,
      },
    });
    expect(updateLevelResult).not.toHaveBeenCalled();
  });

  it('records the manual-grade actor and reason, and skips a no-op recalculation (S6-VV-102)', async () => {
    const attempt = {
      id: ATTEMPT_ID,
      levelId: LEVEL_ID,
      level: { id: LEVEL_ID, cutScores: [] },
      responses: [
        {
          id: 'resp-1',
          itemId: ITEM_ID,
          score: 3,
          maxScore: 3,
          item: { id: ITEM_ID, itemType: 'SHORT_ANSWER' },
        },
      ],
      result: {
        attemptId: ATTEMPT_ID,
        rawScore: 60,
        tierAwarded: null,
        confidenceBand: 'x',
        borderline: false,
      },
    };
    const audit = { record: vi.fn() };
    const prisma = {
      attempt: { findUnique: vi.fn().mockResolvedValue(attempt) },
      levelResult: { update: vi.fn().mockResolvedValue({}), create: vi.fn() },
    };
    const service = new AttemptResultRecalculationService(prisma as never, audit as never);

    await service.recalculateForAttempt(ATTEMPT_ID, {
      actorId: 'admin-1',
      trigger: 'manual_grade',
      reasonCode: 'rubric_review',
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        reasonCode: 'rubric_review',
        metadata: expect.objectContaining({
          trigger: 'manual_grade',
          previousScorePercent: 60,
          nextScorePercent: 100,
        }),
      }),
    );

    audit.record.mockClear();
    attempt.result = { ...attempt.result, rawScore: 100 };
    await service.recalculateForAttempt(ATTEMPT_ID);
    expect(audit.record).not.toHaveBeenCalled();
  });
});
