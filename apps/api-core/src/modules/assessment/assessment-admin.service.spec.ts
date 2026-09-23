import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentAdminService } from './assessment-admin.service.js';

const actorId = randomUUID();
const trackId = randomUUID();
const levelId = randomUUID();
const competencyId = randomUUID();
const otherCompetencyId = randomUUID();

function setup() {
  const prisma = {
    track: { findUnique: vi.fn().mockResolvedValue({ id: trackId, code: 'IT_SE', name: 'SE' }) },
    level: {
      findUnique: vi.fn().mockResolvedValue({
        id: levelId,
        trackId,
        levelNumber: 1,
        name: 'Foundations',
        format: 'MCQ',
        durationMinutes: 60,
        itemCount: 0,
        createdAt: new Date(),
        track: { id: trackId, code: 'IT_SE', name: 'SE' },
      }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({
        id: levelId,
        trackId,
        levelNumber: 1,
        name: 'Foundations',
        format: 'MCQ',
        durationMinutes: 60,
        itemCount: 0,
        createdAt: new Date(),
        track: { id: trackId, code: 'IT_SE', name: 'SE' },
      }),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: levelId,
          trackId,
          levelNumber: 1,
          name: data.name ?? 'Foundations',
          format: data.format ?? 'MCQ',
          durationMinutes: data.durationMinutes ?? 60,
          itemCount: 0,
          createdAt: new Date(),
          track: { id: trackId, code: 'IT_SE', name: 'SE' },
        }),
      ),
    },
    competency: {
      findUnique: vi.fn().mockResolvedValue({ id: competencyId, trackId, name: 'Algorithms' }),
    },
    attempt: { count: vi.fn().mockResolvedValue(0) },
    item: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    },
    itemOption: { deleteMany: vi.fn(), createMany: vi.fn() },
    cutScore: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn((ops: unknown) =>
      typeof ops === 'function' ? ops(prisma) : Promise.all(ops),
    ),
  };
  const auditPublisher = { record: vi.fn().mockResolvedValue(undefined) };
  const service = new AssessmentAdminService(prisma as never, auditPublisher as never);
  return { service, prisma, auditPublisher };
}

describe('AssessmentAdminService levels (T10)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a valid level and records audit', async () => {
    const { service, auditPublisher } = setup();
    const dto = await service.createLevel(actorId, {
      trackId,
      levelNumber: 1,
      name: 'Foundations',
      format: 'MCQ',
      durationMinutes: 60,
    });
    expect(dto.levelId).toBe(levelId);
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'admin.level.created' }),
    );
  });

  it('rejects invalid track', async () => {
    const { service, prisma } = setup();
    prisma.track.findUnique.mockResolvedValue(null);
    await expect(
      service.createLevel(actorId, {
        trackId,
        levelNumber: 1,
        name: 'Foundations',
        format: 'MCQ',
        durationMinutes: 60,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid duration', async () => {
    const { service } = setup();
    await expect(
      service.createLevel(actorId, {
        trackId,
        levelNumber: 1,
        name: 'Foundations',
        format: 'MCQ',
        durationMinutes: 0,
      }),
    ).rejects.toThrow();
  });

  it('maps duplicate track+levelNumber to conflict', async () => {
    const { service, prisma } = setup();
    prisma.level.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      service.createLevel(actorId, {
        trackId,
        levelNumber: 1,
        name: 'Foundations',
        format: 'MCQ',
        durationMinutes: 60,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks format change when active attempts exist', async () => {
    const { service, prisma } = setup();
    prisma.attempt.count.mockResolvedValue(1);
    await expect(
      service.updateLevel(actorId, levelId, { format: 'SANDBOX' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates level name and audits', async () => {
    const { service, auditPublisher } = setup();
    const dto = await service.updateLevel(actorId, levelId, { name: 'Updated name' });
    expect(dto.name).toBe('Updated name');
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'admin.level.updated' }),
    );
  });
});

describe('AssessmentAdminService items (T11)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates MCQ_SINGLE with one correct option', async () => {
    const { service, prisma, auditPublisher } = setup();
    const itemId = randomUUID();
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        item: {
          create: vi.fn().mockResolvedValue({ id: itemId }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: itemId,
            levelId,
            competencyId,
            itemType: 'MCQ_SINGLE',
            stem: 'What is 2+2?',
            modelAnswer: null,
            difficultyTag: 'MEDIUM',
            active: true,
            formCode: 'A',
            createdAt: new Date(),
            competency: { name: 'Algorithms' },
            options: [{ id: randomUUID(), label: 'A', text: '4', isCorrect: true }],
          }),
        },
        itemOption: { createMany: vi.fn() },
        level: { update: vi.fn() },
      };
      return fn(tx);
    });

    const dto = await service.createItem(actorId, levelId, {
      competencyId,
      itemType: 'MCQ_SINGLE',
      stem: 'What is 2+2?',
      options: [
        { label: 'A', text: '4', isCorrect: true },
        { label: 'B', text: '5', isCorrect: false },
      ],
    });
    expect(dto.itemType).toBe('MCQ_SINGLE');
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'admin.item.created' }),
    );
  });

  it('rejects MCQ with no correct answer', async () => {
    const { service } = setup();
    await expect(
      service.createItem(actorId, levelId, {
        competencyId,
        itemType: 'MCQ_SINGLE',
        stem: 'Pick one option please now',
        options: [
          { label: 'A', text: 'Wrong', isCorrect: false },
          { label: 'B', text: 'Also wrong', isCorrect: false },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects competency track mismatch', async () => {
    const { service, prisma } = setup();
    prisma.competency.findUnique.mockResolvedValue({
      id: otherCompetencyId,
      trackId: randomUUID(),
      name: 'Other',
    });
    await expect(
      service.createItem(actorId, levelId, {
        competencyId: otherCompetencyId,
        itemType: 'SHORT_ANSWER',
        stem: 'Explain polymorphism in your own words with detail',
        modelAnswer: 'Polymorphism allows one interface many forms',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks semantic item update during active attempts', async () => {
    const { service, prisma } = setup();
    prisma.item.findUnique.mockResolvedValue({
      id: randomUUID(),
      levelId,
      competencyId,
      itemType: 'SHORT_ANSWER',
      stem: 'Old stem content here',
      modelAnswer: 'answer',
      difficultyTag: 'MEDIUM',
      active: true,
      formCode: 'A',
      createdAt: new Date(),
      options: [],
      competency: { name: 'Algorithms' },
      level: { trackId },
    });
    prisma.attempt.count.mockResolvedValue(1);
    await expect(
      service.updateItem(actorId, randomUUID(), { stem: 'New stem content here please' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('AssessmentAdminService cut scores (T11)', () => {
  it('rejects editing published cut scores', async () => {
    const { service, prisma } = setup();
    prisma.cutScore.findUnique.mockResolvedValue({
      id: randomUUID(),
      levelId,
      tier: 'GOLD',
      mean: 80,
      sd: 5,
      published: true,
      createdAt: new Date(),
    });
    await expect(
      service.upsertCutScore(actorId, levelId, { tier: 'GOLD', mean: 75, sd: 4 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
