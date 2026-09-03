import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { attemptsStarted } from '@smart/observability';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { AssessmentService } from './assessment.service.js';

const STUDENT_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_STUDENT_ID = '22222222-2222-2222-2222-222222222222';
const TRACK_ID = '33333333-3333-3333-3333-333333333333';
const LEVEL1_ID = '44444444-4444-4444-4444-444444444441';
const LEVEL2_ID = '44444444-4444-4444-4444-444444444442';
const ATTEMPT_ID = '55555555-5555-5555-5555-555555555555';
const MCQ_ITEM_ID = '66666666-6666-4666-8666-666666666666';
const MCQ_OPTION_CORRECT = '77777777-7777-4777-8777-777777777777';

function studentUser(sub = STUDENT_ID): RequestUser {
  return { sub, role: 'STUDENT', inst: null };
}

function scoredAttempt(overrides: Record<string, unknown> = {}) {
  return {
    id: ATTEMPT_ID,
    userId: STUDENT_ID,
    status: 'IN_PROGRESS',
    integrityFlag: 'CLEAN',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    level: { levelNumber: 1, track: { code: 'TECH_FULLSTACK' } },
    responses: [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        answer: { kind: 'MCQ', selectedOptionIds: [MCQ_OPTION_CORRECT] },
        item: {
          id: MCQ_ITEM_ID,
          itemType: 'MCQ_SINGLE',
          stem: 'Which is correct?',
          modelAnswer: null,
          options: [{ id: MCQ_OPTION_CORRECT, isCorrect: true }],
        },
      },
    ],
    ...overrides,
  };
}

function createMockPrisma() {
  const levels = [
    {
      id: LEVEL1_ID,
      trackId: TRACK_ID,
      levelNumber: 1,
      format: 'MCQ',
      durationMinutes: 60,
      itemCount: 20,
      track: { id: TRACK_ID, code: 'TECH_FULLSTACK' },
    },
    {
      id: LEVEL2_ID,
      trackId: TRACK_ID,
      levelNumber: 2,
      format: 'MCQ',
      durationMinutes: 60,
      itemCount: 25,
      track: { id: TRACK_ID, code: 'TECH_FULLSTACK' },
    },
  ];

  const attemptsStore: any[] = [];
  const levelResultsStore: any[] = [];
  const responsesStore: any[] = [];

  return {
    _attemptsStore: attemptsStore,
    _levelResultsStore: levelResultsStore,
    _responsesStore: responsesStore,
    level: {
      findFirst: vi.fn(async ({ where }: any) => {
        if (where.levelNumber !== undefined && where.track?.code) {
          return (
            levels.find(
              (l) => l.levelNumber === where.levelNumber && l.track.code === where.track.code,
            ) ?? null
          );
        }
        if (where.trackId !== undefined && where.levelNumber !== undefined) {
          return (
            levels.find(
              (l) => l.trackId === where.trackId && l.levelNumber === where.levelNumber,
            ) ?? null
          );
        }
        return null;
      }),
    },
    attempt: {
      findFirst: vi.fn(async ({ where }: any) => {
        return (
          attemptsStore.find(
            (a) =>
              a.userId === where.userId && a.levelId === where.levelId && a.status === where.status,
          ) ?? null
        );
      }),
      create: vi.fn(async ({ data }: any) => {
        const level = levels.find((l) => l.id === data.levelId);
        if (!level) throw new Error('Level not found in mock store');
        const newAttempt = {
          id: ATTEMPT_ID,
          userId: data.userId,
          levelId: data.levelId,
          formCode: data.formCode ?? 'A',
          status: data.status,
          integrityFlag: data.integrityFlag ?? 'CLEAN',
          startedAt: data.startedAt,
          expiresAt: data.expiresAt,
          level,
          responses: [],
        };
        attemptsStore.push(newAttempt);
        return newAttempt;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        const found = attemptsStore.find((a) => a.id === where.id);
        if (!found) return null;
        return {
          ...found,
          responses: responsesStore
            .filter((r) => r.attemptId === found.id)
            .map((r) => ({
              ...r,
              item: { id: r.itemId, competencyId: '66666666-6666-4666-8666-666666666666' },
            })),
        };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const found = attemptsStore.find((a) => a.id === where.id);
        if (!found) throw new Error('Attempt not found');
        Object.assign(found, data);
        return found;
      }),
    },
    levelResult: {
      findFirst: vi.fn(async ({ where }: any) => {
        return (
          levelResultsStore.find(
            (r) => r.userId === where.attempt?.userId && r.levelId === where.levelId,
          ) ?? null
        );
      }),
    },
    item: {
      findMany: vi.fn(async () => []),
    },
    response: {
      findUnique: vi.fn(async ({ where }: any) => {
        const { attemptId, itemId } = where.attemptId_itemId;
        return responsesStore.find((r) => r.attemptId === attemptId && r.itemId === itemId) ?? null;
      }),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const { attemptId, itemId } = where.attemptId_itemId;
        const idx = responsesStore.findIndex(
          (r) => r.attemptId === attemptId && r.itemId === itemId,
        );
        if (idx >= 0) {
          responsesStore[idx] = { ...responsesStore[idx], ...update };
          return responsesStore[idx];
        }
        const created = { id: `resp-${Date.now()}`, attemptId, itemId, ...create };
        responsesStore.push(created);
        return created;
      }),
      count: vi.fn(async ({ where }: any) => {
        return responsesStore.filter((r) => r.attemptId === where.attemptId).length;
      }),
    },
  } as any;
}

function createMockRedis() {
  const store = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  return {
    _store: store,
    _sets: sets,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    setex: vi.fn(async (key: string, _ttl: number, val: string) => {
      store.set(key, val);
      return 'OK';
    }),
    sadd: vi.fn(async (key: string, val: string) => {
      let set = sets.get(key);
      if (!set) {
        set = new Set();
        sets.set(key, set);
      }
      set.add(val);
      return 1;
    }),
    srem: vi.fn(async (key: string, val: string) => {
      const set = sets.get(key);
      if (set) set.delete(val);
      return 1;
    }),
    smembers: vi.fn(async (key: string) => {
      return Array.from(sets.get(key) ?? []);
    }),
    scard: vi.fn(async (key: string) => {
      return sets.get(key)?.size ?? 0;
    }),
    expire: vi.fn(async () => 1),
    exists: vi.fn(async () => 0),
  } as any;
}

function createMockRotation() {
  return {
    selectForm: vi.fn(async () => ({
      formCode: 'A',
      items: [{ id: 'item-1' }, { id: 'item-2' }],
    })),
    recordExposure: vi.fn(async () => ({ retired: 0 })),
  } as any;
}

function createMockOutbox() {
  return {
    enqueueAssessmentSubmitted: vi.fn(async () => undefined),
  } as any;
}

describe('AssessmentService (ST-04 / S1-VB-01)', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let redis: ReturnType<typeof createMockRedis>;
  let rotation: ReturnType<typeof createMockRotation>;
  let outbox: ReturnType<typeof createMockOutbox>;
  let service: AssessmentService;
  let attemptsStartedSpy: any;

  beforeEach(() => {
    prisma = createMockPrisma();
    redis = createMockRedis();
    rotation = createMockRotation();
    outbox = createMockOutbox();
    service = new AssessmentService(prisma, redis, rotation, outbox, {} as never, {} as never);
    attemptsStartedSpy = vi.spyOn(attemptsStarted, 'inc');
    vi.clearAllMocks();
  });

  it('1. Level 1 start succeeds', async () => {
    const session = await service.startAttempt(STUDENT_ID, {
      trackCode: 'TECH_FULLSTACK',
      levelNumber: 1,
    });

    expect(session.attemptId).toBe(ATTEMPT_ID);
    expect(session.levelNumber).toBe(1);
    expect(session.status).toBe('IN_PROGRESS');
    expect(session.locked).toBe(false);
  });

  it('2. Level 2+ with no previous LevelResult returns 403', async () => {
    await expect(
      service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 2,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('3. Level 2+ with BELOW_BRONZE returns 403', async () => {
    prisma._levelResultsStore.push({
      userId: STUDENT_ID,
      levelId: LEVEL1_ID,
      tierAwarded: 'BELOW_BRONZE',
    });

    await expect(
      service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 2,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('4. Level 2+ with BRONZE succeeds', async () => {
    prisma._levelResultsStore.push({
      userId: STUDENT_ID,
      levelId: LEVEL1_ID,
      tierAwarded: 'BRONZE',
    });

    const session = await service.startAttempt(STUDENT_ID, {
      trackCode: 'TECH_FULLSTACK',
      levelNumber: 2,
    });

    expect(session.levelNumber).toBe(2);
    expect(session.status).toBe('IN_PROGRESS');
  });

  it('5. Level 2+ with SILVER succeeds', async () => {
    prisma._levelResultsStore.push({
      userId: STUDENT_ID,
      levelId: LEVEL1_ID,
      tierAwarded: 'SILVER',
    });

    const session = await service.startAttempt(STUDENT_ID, {
      trackCode: 'TECH_FULLSTACK',
      levelNumber: 2,
    });

    expect(session.levelNumber).toBe(2);
    expect(session.status).toBe('IN_PROGRESS');
  });

  it('6. Level 2+ with GOLD succeeds', async () => {
    prisma._levelResultsStore.push({
      userId: STUDENT_ID,
      levelId: LEVEL1_ID,
      tierAwarded: 'GOLD',
    });

    const session = await service.startAttempt(STUDENT_ID, {
      trackCode: 'TECH_FULLSTACK',
      levelNumber: 2,
    });

    expect(session.levelNumber).toBe(2);
    expect(session.status).toBe('IN_PROGRESS');
  });

  it('7. Duplicate IN_PROGRESS start returns existing session and does NOT create another Attempt', async () => {
    // First start
    const firstSession = await service.startAttempt(STUDENT_ID, {
      trackCode: 'TECH_FULLSTACK',
      levelNumber: 1,
    });
    expect(prisma.attempt.create).toHaveBeenCalledTimes(1);
    expect(attemptsStartedSpy).toHaveBeenCalledTimes(1);

    // Second start (Duplicate)
    const secondSession = await service.startAttempt(STUDENT_ID, {
      trackCode: 'TECH_FULLSTACK',
      levelNumber: 1,
    });

    expect(secondSession.attemptId).toBe(firstSession.attemptId);
    expect(prisma.attempt.create).toHaveBeenCalledTimes(1); // Not called again
    expect(attemptsStartedSpy).toHaveBeenCalledTimes(1); // Not incremented again
  });

  it('8. New attempt is persisted correctly', async () => {
    await service.startAttempt(STUDENT_ID, {
      trackCode: 'TECH_FULLSTACK',
      levelNumber: 1,
    });

    expect(prisma.attempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: STUDENT_ID,
          levelId: LEVEL1_ID,
          status: 'IN_PROGRESS',
          integrityFlag: 'CLEAN',
        }),
      }),
    );
  });

  it('9. Redis session is written with 7200-second TTL', async () => {
    await service.startAttempt(STUDENT_ID, {
      trackCode: 'TECH_FULLSTACK',
      levelNumber: 1,
    });

    expect(redis.setex).toHaveBeenCalledWith(
      `session:assessment:${ATTEMPT_ID}`,
      7200,
      expect.any(String),
    );
  });

  it('10. attemptsStarted metric increments only for a new attempt', async () => {
    await service.startAttempt(STUDENT_ID, {
      trackCode: 'TECH_FULLSTACK',
      levelNumber: 1,
    });
    expect(attemptsStartedSpy).toHaveBeenCalledWith({
      track_code: 'TECH_FULLSTACK',
      level_number: '1',
    });

    // Duplicate call
    await service.startAttempt(STUDENT_ID, {
      trackCode: 'TECH_FULLSTACK',
      levelNumber: 1,
    });
    expect(attemptsStartedSpy).toHaveBeenCalledTimes(1);
  });

  it('11. GET session returns the student session', async () => {
    await service.startAttempt(STUDENT_ID, {
      trackCode: 'TECH_FULLSTACK',
      levelNumber: 1,
    });

    const session = await service.getSession(STUDENT_ID, ATTEMPT_ID);
    expect(session.attemptId).toBe(ATTEMPT_ID);
    expect(session.studentId).toBe(STUDENT_ID);
  });

  it('12. GET session cannot access another student attempt', async () => {
    await service.startAttempt(STUDENT_ID, {
      trackCode: 'TECH_FULLSTACK',
      levelNumber: 1,
    });

    await expect(service.getSession(OTHER_STUDENT_ID, ATTEMPT_ID)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('13. Redis miss can reconstruct the session from Postgres DB', async () => {
    await service.startAttempt(STUDENT_ID, {
      trackCode: 'TECH_FULLSTACK',
      levelNumber: 1,
    });

    // Clear Redis cache to simulate cache eviction/miss
    redis._store.clear();

    const reconstructed = await service.getSession(STUDENT_ID, ATTEMPT_ID);
    expect(reconstructed.attemptId).toBe(ATTEMPT_ID);
    expect(reconstructed.studentId).toBe(STUDENT_ID);
    // Cache warm-through write to Redis
    expect(redis.setex).toHaveBeenCalledWith(
      `session:assessment:${ATTEMPT_ID}`,
      7200,
      expect.any(String),
    );
  });

  it('14. Throws NotFoundException if level does not exist', async () => {
    await expect(
      service.startAttempt(STUDENT_ID, {
        trackCode: 'NON_EXISTENT' as any,
        levelNumber: 1,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  describe('getNextItem (ST-04 / S1-VB-02)', () => {
    const itemBankKey = 'items:form:TECH_FULLSTACK:1:A';
    const mockItems = [
      {
        itemId: 'item-101',
        competencyId: 'comp-1',
        domainCode: 'A',
        itemType: 'MCQ_SINGLE',
        difficulty: 'MEDIUM',
        promptText: 'What is the complexity of binary search?',
        options: [
          { optionId: 'opt-1', label: 'A. O(1)' },
          { optionId: 'opt-2', label: 'B. O(log n)' },
        ],
        itemWeight: 1,
      },
      {
        itemId: 'item-102',
        competencyId: 'comp-1',
        domainCode: 'A',
        itemType: 'MCQ_SINGLE',
        difficulty: 'HARD',
        promptText: 'What is quicksort worst case?',
        options: [
          { optionId: 'opt-1', label: 'A. O(n^2)' },
          { optionId: 'opt-2', label: 'B. O(n log n)' },
        ],
        itemWeight: 1,
      },
    ];

    it('15. Warm-cache success: returns item from Redis with ZERO Prisma queries', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });
      redis._store.set(itemBankKey, JSON.stringify(mockItems));

      vi.clearAllMocks();

      const result = await service.getNextItem(STUDENT_ID, ATTEMPT_ID);

      expect(result.attemptId).toBe(ATTEMPT_ID);
      expect(result.index).toBe(0);
      expect(result.totalItems).toBe(20);
      expect(result.item?.itemId).toBe('item-101');
      expect(result.item?.promptText).toBe('What is the complexity of binary search?');

      expect(prisma.attempt.findUnique).not.toHaveBeenCalled();
      expect(prisma.item.findMany).not.toHaveBeenCalled();
    });

    it('16. End of assessment: returns item null when currentItemIndex >= totalItems', async () => {
      const session = await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });
      session.currentItemIndex = 20;
      redis._store.set(`session:assessment:${ATTEMPT_ID}`, JSON.stringify(session));
      redis._store.set(itemBankKey, JSON.stringify(mockItems));

      const result = await service.getNextItem(STUDENT_ID, ATTEMPT_ID);

      expect(result.attemptId).toBe(ATTEMPT_ID);
      expect(result.item).toBeNull();
      expect(result.index).toBe(20);
    });

    it('17. Forbidden student: throws ForbiddenException when session studentId does not match', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });

      await expect(service.getNextItem(OTHER_STUDENT_ID, ATTEMPT_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('18. Missing session: throws NotFoundException when attempt session does not exist in Redis or DB', async () => {
      await expect(
        service.getNextItem(STUDENT_ID, '99999999-9999-9999-9999-999999999999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('19. Locked/expired session: throws ForbiddenException', async () => {
      const session = await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });
      session.status = 'SUBMITTED';
      redis._store.set(`session:assessment:${ATTEMPT_ID}`, JSON.stringify(session));

      await expect(service.getNextItem(STUDENT_ID, ATTEMPT_ID)).rejects.toThrow(ForbiddenException);
    });

    it('20. Item-bank cache miss: lazy loads active items from Postgres and populates Redis with 86400 TTL', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });

      redis._store.delete(itemBankKey);

      prisma.item.findMany = vi.fn(async () => [
        {
          id: 'item-201',
          levelId: LEVEL1_ID,
          competencyId: 'comp-1',
          itemType: 'MCQ_SINGLE',
          stem: 'What is a closure in JS?',
          difficultyTag: 'EASY',
          active: true,
          formCode: 'A',
          competency: { domainCode: 'A' },
          options: [{ id: 'opt-1', label: 'A', text: 'Function with lexical scope' }],
        },
      ]);

      const result = await service.getNextItem(STUDENT_ID, ATTEMPT_ID);

      expect(prisma.item.findMany).toHaveBeenCalledTimes(1);
      expect(redis.setex).toHaveBeenCalledWith(itemBankKey, 86400, expect.any(String));
      expect(result.item?.itemId).toBe('item-201');
      expect(result.item?.promptText).toBe('What is a closure in JS?');
    });

    it('21. Empty item bank: throws NotFoundException when Postgres has no active items for form', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });

      redis._store.delete(itemBankKey);
      prisma.item.findMany = vi.fn(async () => []);

      await expect(service.getNextItem(STUDENT_ID, ATTEMPT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveDraft & submitL1 (S1-VB-03)', () => {
    const ITEM_ID = '99999999-9999-9999-9999-999999999999';

    it('22. Valid L1 draft submission: writes draft to Redis with TTL and returns accepted: true', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });

      const result = await service.saveDraft(STUDENT_ID, {
        attemptId: ATTEMPT_ID,
        itemId: ITEM_ID,
        answer: { kind: 'MCQ', selectedOptionIds: ['opt-1'] },
        clientSequence: 1,
      });

      expect(result.accepted).toBe(true);
      expect(result.superseded).toBe(false);
      expect(result.answeredItems).toBe(1);
      expect(redis.setex).toHaveBeenCalledWith(
        `draft:assessment:${ATTEMPT_ID}:${ITEM_ID}`,
        7200,
        expect.any(String),
      );
      expect(redis.sadd).toHaveBeenCalledWith(`drafts:set:${ATTEMPT_ID}`, ITEM_ID);
      expect(redis.sadd).toHaveBeenCalledWith('drafts:dirty', `${ATTEMPT_ID}:${ITEM_ID}`);
    });

    it('23. Client sequence guard: older or equal sequence returns superseded: true and accepted: false', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });

      await service.saveDraft(STUDENT_ID, {
        attemptId: ATTEMPT_ID,
        itemId: ITEM_ID,
        answer: { kind: 'MCQ', selectedOptionIds: ['opt-1'] },
        clientSequence: 5,
      });

      const supersededResult = await service.saveDraft(STUDENT_ID, {
        attemptId: ATTEMPT_ID,
        itemId: ITEM_ID,
        answer: { kind: 'MCQ', selectedOptionIds: ['opt-old'] },
        clientSequence: 4,
      });

      expect(supersededResult.accepted).toBe(false);
      expect(supersededResult.superseded).toBe(true);

      const equalSeqResult = await service.saveDraft(STUDENT_ID, {
        attemptId: ATTEMPT_ID,
        itemId: ITEM_ID,
        answer: { kind: 'MCQ', selectedOptionIds: ['opt-equal'] },
        clientSequence: 5,
      });

      expect(equalSeqResult.accepted).toBe(false);
      expect(equalSeqResult.superseded).toBe(true);
    });

    it('24. Student attempt ownership: throws ForbiddenException when saving into another student attempt', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });

      await expect(
        service.saveDraft(OTHER_STUDENT_ID, {
          attemptId: ATTEMPT_ID,
          itemId: ITEM_ID,
          answer: { kind: 'MCQ', selectedOptionIds: ['opt-1'] },
          clientSequence: 1,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('25. Locked / expired attempt: throws ForbiddenException when session is locked', async () => {
      const session = await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });

      const attempt = prisma._attemptsStore.find((a: any) => a.id === session.attemptId);
      attempt.status = 'COMPLETED';
      redis._store.clear(); // force reload from prisma

      await expect(
        service.saveDraft(STUDENT_ID, {
          attemptId: ATTEMPT_ID,
          itemId: ITEM_ID,
          answer: { kind: 'MCQ', selectedOptionIds: ['opt-1'] },
          clientSequence: 1,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('26. Redis-down degradation: falls back to direct Postgres upsert when Redis throws', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });

      redis.get = vi.fn(async () => {
        throw new Error('Redis Connection Error');
      });
      redis.setex = vi.fn(async () => {
        throw new Error('Redis Connection Error');
      });

      const result = await service.saveDraft(STUDENT_ID, {
        attemptId: ATTEMPT_ID,
        itemId: ITEM_ID,
        answer: { kind: 'MCQ', selectedOptionIds: ['opt-degraded'] },
        clientSequence: 10,
      });

      expect(result.accepted).toBe(true);
      expect(result.superseded).toBe(false);
      expect(prisma.response.upsert).toHaveBeenCalledTimes(1);
    });

    it('27. 5-second PostgreSQL batch flush: syncs dirty drafts to Postgres and clears dirty set', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });

      await service.saveDraft(STUDENT_ID, {
        attemptId: ATTEMPT_ID,
        itemId: ITEM_ID,
        answer: { kind: 'MCQ', selectedOptionIds: ['opt-flush'] },
        clientSequence: 1,
      });

      await service.flushDraftsToPostgres();

      expect(prisma.response.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { attemptId_itemId: { attemptId: ATTEMPT_ID, itemId: ITEM_ID } },
        }),
      );
      const dirtyMembers = await redis.smembers('drafts:dirty');
      expect(dirtyMembers).not.toContain(`${ATTEMPT_ID}:${ITEM_ID}`);
    });

    it('28. Batch flush error retry: retains dirty key if Postgres upsert fails', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });

      await service.saveDraft(STUDENT_ID, {
        attemptId: ATTEMPT_ID,
        itemId: ITEM_ID,
        answer: { kind: 'MCQ', selectedOptionIds: ['opt-retry'] },
        clientSequence: 1,
      });

      prisma.response.upsert = vi.fn(async () => {
        throw new Error('Postgres DB Error');
      });

      await service.flushDraftsToPostgres();

      const dirtyMembers = await redis.smembers('drafts:dirty');
      expect(dirtyMembers).toContain(`${ATTEMPT_ID}:${ITEM_ID}`);
    });

    it('29. Refresh → savedDraft resume: getNextItem returns saved draft for current item', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });

      const itemBankKey = `items:form:TECH_FULLSTACK:1:A`;
      redis._store.delete(itemBankKey);
      prisma.item.findMany = vi.fn(async () => [
        {
          id: ITEM_ID,
          levelId: LEVEL1_ID,
          competencyId: 'comp-1',
          itemType: 'MCQ_SINGLE',
          stem: 'Question with draft?',
          difficultyTag: 'EASY',
          active: true,
          formCode: 'A',
          competency: { domainCode: 'A' },
          options: [{ id: 'opt-1', label: 'A', text: 'Option A' }],
        },
      ]);

      await service.saveDraft(STUDENT_ID, {
        attemptId: ATTEMPT_ID,
        itemId: ITEM_ID,
        answer: { kind: 'MCQ', selectedOptionIds: ['opt-1'] },
        clientSequence: 1,
      });

      const nextItemResult = await service.getNextItem(STUDENT_ID, ATTEMPT_ID);

      expect(nextItemResult.savedDraft).toEqual({ kind: 'MCQ', selectedOptionIds: ['opt-1'] });
    });

    it('30. Redis-flushed draft retains sequence in Postgres and rejects older sequence on Redis failure', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });

      await service.saveDraft(STUDENT_ID, {
        attemptId: ATTEMPT_ID,
        itemId: ITEM_ID,
        answer: { kind: 'MCQ', selectedOptionIds: ['opt-new'] },
        clientSequence: 10,
      });

      await service.flushDraftsToPostgres();

      const flushedResponse = prisma._responsesStore.find(
        (r: any) => r.attemptId === ATTEMPT_ID && r.itemId === ITEM_ID,
      );
      expect(flushedResponse).toBeDefined();
      expect(flushedResponse.answer).toEqual({
        kind: 'MCQ',
        selectedOptionIds: ['opt-new'],
        _clientSequence: 10,
      });

      redis.get = vi.fn(async () => {
        throw new Error('Redis Down');
      });
      redis.setex = vi.fn(async () => {
        throw new Error('Redis Down');
      });

      const olderResult = await service.saveDraft(STUDENT_ID, {
        attemptId: ATTEMPT_ID,
        itemId: ITEM_ID,
        answer: { kind: 'MCQ', selectedOptionIds: ['opt-old'] },
        clientSequence: 5,
      });

      expect(olderResult.accepted).toBe(false);
      expect(olderResult.superseded).toBe(true);
    });
  });

  describe('currentItemIndex persist / complete (S2-SV-01)', () => {
    const itemBankKey = `items:form:TECH_FULLSTACK:1:A`;
    const mockItems = [
      {
        itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        competencyId: '66666666-6666-4666-8666-666666666666',
        domainCode: 'A' as const,
        itemType: 'MCQ_SINGLE' as const,
        difficulty: 'MEDIUM' as const,
        promptText: 'Q1',
        options: [{ optionId: 'opt-1', label: 'A' }],
        itemWeight: 1,
      },
      {
        itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
        competencyId: '66666666-6666-4666-8666-666666666666',
        domainCode: 'A' as const,
        itemType: 'MCQ_SINGLE' as const,
        difficulty: 'MEDIUM' as const,
        promptText: 'Q2',
        options: [{ optionId: 'opt-2', label: 'B' }],
        itemWeight: 1,
      },
    ];

    it('31. Persists requested index and serves that item on resume', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });
      redis._store.set(itemBankKey, JSON.stringify(mockItems));

      const advanced = await service.getNextItem(STUDENT_ID, ATTEMPT_ID, 1);
      expect(advanced.index).toBe(1);
      expect(advanced.item?.itemId).toBe(mockItems[1]?.itemId);

      const resumed = await service.getNextItem(STUDENT_ID, ATTEMPT_ID);
      expect(resumed.index).toBe(1);
      expect(resumed.item?.itemId).toBe(mockItems[1]?.itemId);
    });

    it('32. Idempotent start does not reset persisted currentItemIndex', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });
      redis._store.set(itemBankKey, JSON.stringify(mockItems));
      await service.getNextItem(STUDENT_ID, ATTEMPT_ID, 1);

      const restarted = await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });
      expect(restarted.currentItemIndex).toBe(1);
    });

    it('33. Other student cannot advance another student index', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });
      await expect(service.getNextItem(OTHER_STUDENT_ID, ATTEMPT_ID, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('34. Complete scores an owned attempt and emits smart.assessment.submitted', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });
      prisma.attempt.findUnique.mockResolvedValueOnce(scoredAttempt());

      const result = await service.completeAttempt(studentUser(), {
        attemptId: ATTEMPT_ID,
        autoSubmitted: false,
        technicalFailure: false,
      });

      expect(result.attemptId).toBe(ATTEMPT_ID);
      expect(result.status).toBe('EVALUATED');
      expect(result.evaluationJobId).toBeNull();
      expect(result.estimatedResultSeconds).toBeNull();
      expect(result.scorePercent).toBeDefined();
      expect(outbox.enqueueAssessmentSubmitted).toHaveBeenCalledTimes(1);
      expect(prisma.attempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'EVALUATED' }),
        }),
      );
    });

    it('35. Complete is forbidden for another student', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });
      prisma.attempt.findUnique.mockResolvedValueOnce(scoredAttempt());
      await expect(
        service.completeAttempt(studentUser(OTHER_STUDENT_ID), {
          attemptId: ATTEMPT_ID,
          autoSubmitted: false,
          technicalFailure: false,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(outbox.enqueueAssessmentSubmitted).not.toHaveBeenCalled();
    });

    it('36. Complete returns 409 for an already EVALUATED attempt', async () => {
      await service.startAttempt(STUDENT_ID, {
        trackCode: 'TECH_FULLSTACK',
        levelNumber: 1,
      });
      prisma.attempt.findUnique.mockResolvedValueOnce(scoredAttempt({ status: 'EVALUATED' }));

      await expect(
        service.completeAttempt(studentUser(), {
          attemptId: ATTEMPT_ID,
          autoSubmitted: false,
          technicalFailure: false,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(outbox.enqueueAssessmentSubmitted).not.toHaveBeenCalled();
    });
  });
});
