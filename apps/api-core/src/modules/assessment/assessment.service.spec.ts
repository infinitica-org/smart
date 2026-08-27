import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { attemptsStarted } from '@smart/observability';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentService } from './assessment.service.js';

const STUDENT_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_STUDENT_ID = '22222222-2222-2222-2222-222222222222';
const TRACK_ID = '33333333-3333-3333-3333-333333333333';
const LEVEL1_ID = '44444444-4444-4444-4444-444444444441';
const LEVEL2_ID = '44444444-4444-4444-4444-444444444442';
const ATTEMPT_ID = '55555555-5555-5555-5555-555555555555';

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

  return {
    _attemptsStore: attemptsStore,
    _levelResultsStore: levelResultsStore,
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
        return attemptsStore.find((a) => a.id === where.id) ?? null;
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
  } as any;
}

function createMockRedis() {
  const store = new Map<string, string>();
  return {
    _store: store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    setex: vi.fn(async (key: string, ttl: number, val: string) => {
      store.set(key, val);
      return 'OK';
    }),
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

describe('AssessmentService (ST-04 / S1-VB-01)', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let redis: ReturnType<typeof createMockRedis>;
  let rotation: ReturnType<typeof createMockRotation>;
  let service: AssessmentService;
  let attemptsStartedSpy: any;

  beforeEach(() => {
    prisma = createMockPrisma();
    redis = createMockRedis();
    rotation = createMockRotation();
    service = new AssessmentService(prisma, redis, rotation);
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
});
