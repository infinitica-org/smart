import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  AttemptSessionDto,
  AttemptStatus,
  DeliverableItemDto,
  DifficultyTag,
  DomainCode,
  IntegrityFlag,
  ItemType,
  LevelFormat,
  LevelNumber,
  NextItemDto,
  SaveDraftRequest,
  SaveDraftResponse,
  StartAttemptRequest,
  Tier,
  TrackCode,
} from '@smart/contracts';
import { attemptsStarted, draftsSaved } from '@smart/observability';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { ItemRotationService } from './item-rotation.service.js';
import type { Prisma } from '../../generated/prisma/index.js';

const SESSION_TTL_SECONDS = 7200; // 2 hours TTL per spec
const ITEM_BANK_TTL_SECONDS = 86400; // 24 hours TTL per spec

interface StoredDraft {
  attemptId: string;
  itemId: string;
  answer: unknown;
  clientSequence: number;
  updatedAt: string;
}

interface AttemptWithLevelAndResponses {
  id: string;
  userId: string;
  formCode: string;
  status: string;
  integrityFlag: string;
  startedAt: Date;
  expiresAt: Date;
  level: {
    levelNumber: number;
    format: string;
    itemCount: number | null;
    track: {
      code: string;
    };
  };
  responses?: unknown[];
}

@Injectable()
export class AssessmentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssessmentService.name);
  readonly owner = 'Vishal Bharath R';
  readonly purpose = 'Attempt lifecycle, item delivery, integrity.';
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(ItemRotationService) private readonly rotation: ItemRotationService,
  ) {}

  onModuleInit() {
    this.flushTimer = setInterval(() => {
      this.flushDraftsToPostgres().catch((err) => {
        this.logger.error({ err }, 'Failed periodic PostgreSQL batch flush of drafts');
      });
    }, 5000);
    this.flushTimer.unref();
  }

  onModuleDestroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async flushDraftsToPostgres(): Promise<void> {
    if (this.isFlushing) return;
    this.isFlushing = true;
    try {
      let dirtyKeys: string[] = [];
      try {
        dirtyKeys = await this.redis.smembers('drafts:dirty');
      } catch (err) {
        this.logger.error({ err }, 'Redis error while reading dirty drafts for flush');
        return;
      }

      if (!dirtyKeys || dirtyKeys.length === 0) return;

      for (const compositeKey of dirtyKeys) {
        const parts = compositeKey.split(':');
        if (parts.length !== 2) continue;
        const [attemptId, itemId] = parts;
        const draftKey = `draft:assessment:${attemptId}:${itemId}`;

        let rawDraft: string | null = null;
        try {
          rawDraft = await this.redis.get(draftKey);
        } catch {
          continue;
        }

        if (!rawDraft) {
          try {
            await this.redis.srem('drafts:dirty', compositeKey);
          } catch {
            // Ignore srem error
          }
          continue;
        }

        try {
          const draft = JSON.parse(rawDraft) as StoredDraft;
          const answerPayloadWithSeq =
            typeof draft.answer === 'object' && draft.answer !== null
              ? {
                  ...(draft.answer as Record<string, unknown>),
                  _clientSequence: draft.clientSequence,
                }
              : draft.answer;

          await this.prisma.response.upsert({
            where: { attemptId_itemId: { attemptId: draft.attemptId, itemId: draft.itemId } },
            update: { answer: answerPayloadWithSeq as Prisma.InputJsonValue },
            create: {
              attemptId: draft.attemptId,
              itemId: draft.itemId,
              answer: answerPayloadWithSeq as Prisma.InputJsonValue,
            },
          });
          await this.redis.srem('drafts:dirty', compositeKey);
        } catch (err) {
          this.logger.error(
            { err, attemptId, itemId },
            'Failed to flush draft to PostgreSQL; will retry next interval',
          );
        }
      }
    } finally {
      this.isFlushing = false;
    }
  }

  async saveDraft(studentId: string, dto: SaveDraftRequest): Promise<SaveDraftResponse> {
    const session = await this.getSession(studentId, dto.attemptId);

    if (session.locked || session.serverRemainingSeconds <= 0) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Assessment session is locked or expired.',
        statusCode: 403,
      });
    }

    const draftKey = `draft:assessment:${dto.attemptId}:${dto.itemId}`;
    const draftsSetKey = `drafts:set:${dto.attemptId}`;

    let isRedisAvailable = true;
    let existingDraft: StoredDraft | null = null;

    try {
      const raw = await this.redis.get(draftKey);
      if (raw) {
        existingDraft = JSON.parse(raw) as StoredDraft;
      }
    } catch (err) {
      isRedisAvailable = false;
      this.logger.warn(
        { err, attemptId: dto.attemptId, itemId: dto.itemId },
        'Redis down during draft read — falling back to PostgreSQL',
      );
    }

    if (isRedisAvailable) {
      if (existingDraft && existingDraft.clientSequence >= dto.clientSequence) {
        const answeredCount = await this.getAnsweredItemsCount(dto.attemptId);
        this.logger.log(
          {
            attemptId: dto.attemptId,
            itemId: dto.itemId,
            clientSequence: dto.clientSequence,
            existingSequence: existingDraft.clientSequence,
            superseded: true,
          },
          'assessment.draft-superseded',
        );
        return {
          accepted: false,
          superseded: true,
          answeredItems: answeredCount,
          serverRemainingSeconds: session.serverRemainingSeconds,
        };
      }

      const newDraft: StoredDraft = {
        attemptId: dto.attemptId,
        itemId: dto.itemId,
        answer: dto.answer,
        clientSequence: dto.clientSequence,
        updatedAt: new Date().toISOString(),
      };

      try {
        await this.redis.setex(draftKey, SESSION_TTL_SECONDS, JSON.stringify(newDraft));
        await this.redis.sadd(draftsSetKey, dto.itemId);
        await this.redis.expire(draftsSetKey, SESSION_TTL_SECONDS);
        await this.redis.sadd('drafts:dirty', `${dto.attemptId}:${dto.itemId}`);
      } catch (err) {
        isRedisAvailable = false;
        this.logger.warn(
          { err, attemptId: dto.attemptId, itemId: dto.itemId },
          'Redis write failed — falling back to PostgreSQL direct write',
        );
      }

      if (isRedisAvailable) {
        draftsSaved?.inc({
          track_code: session.trackCode,
          level_number: String(session.levelNumber),
        });

        this.logger.log(
          {
            attemptId: dto.attemptId,
            itemId: dto.itemId,
            clientSequence: dto.clientSequence,
            superseded: false,
          },
          'assessment.draft-saved',
        );

        const answeredCount = await this.getAnsweredItemsCount(dto.attemptId);
        return {
          accepted: true,
          superseded: false,
          answeredItems: answeredCount,
          serverRemainingSeconds: session.serverRemainingSeconds,
        };
      }
    }

    // Redis Degradation Fallback Path to PostgreSQL
    const existingDb = await this.prisma.response.findUnique({
      where: { attemptId_itemId: { attemptId: dto.attemptId, itemId: dto.itemId } },
    });

    if (existingDb && existingDb.answer && typeof existingDb.answer === 'object') {
      const dbSeq = (existingDb.answer as Record<string, unknown>)._clientSequence;
      if (typeof dbSeq === 'number' && dbSeq >= dto.clientSequence) {
        const dbAnswered = await this.prisma.response.count({
          where: { attemptId: dto.attemptId },
        });
        return {
          accepted: false,
          superseded: true,
          answeredItems: dbAnswered,
          serverRemainingSeconds: session.serverRemainingSeconds,
        };
      }
    }

    const answerPayloadWithSeq =
      typeof dto.answer === 'object' && dto.answer !== null
        ? { ...(dto.answer as Record<string, unknown>), _clientSequence: dto.clientSequence }
        : dto.answer;

    await this.prisma.response.upsert({
      where: { attemptId_itemId: { attemptId: dto.attemptId, itemId: dto.itemId } },
      update: { answer: answerPayloadWithSeq as Prisma.InputJsonValue },
      create: {
        attemptId: dto.attemptId,
        itemId: dto.itemId,
        answer: answerPayloadWithSeq as Prisma.InputJsonValue,
      },
    });

    draftsSaved?.inc({
      track_code: session.trackCode,
      level_number: String(session.levelNumber),
    });

    this.logger.warn(
      {
        attemptId: dto.attemptId,
        itemId: dto.itemId,
        clientSequence: dto.clientSequence,
        degraded: true,
      },
      'assessment.draft-saved-postgres-fallback',
    );

    const dbAnsweredCount = await this.prisma.response.count({
      where: { attemptId: dto.attemptId },
    });

    return {
      accepted: true,
      superseded: false,
      answeredItems: dbAnsweredCount,
      serverRemainingSeconds: session.serverRemainingSeconds,
    };
  }

  private async getAnsweredItemsCount(attemptId: string): Promise<number> {
    try {
      const count = await this.redis.scard(`drafts:set:${attemptId}`);
      if (count > 0) return count;
    } catch {
      // Fall through to DB
    }
    return this.prisma.response.count({
      where: { attemptId },
    });
  }

  async startAttempt(studentId: string, dto: StartAttemptRequest): Promise<AttemptSessionDto> {
    const level = await this.prisma.level.findFirst({
      where: {
        levelNumber: dto.levelNumber,
        track: { code: dto.trackCode },
      },
      include: { track: true },
    });

    if (!level) {
      throw new NotFoundException(`Level ${dto.levelNumber} for track ${dto.trackCode} not found.`);
    }

    // Check for existing IN_PROGRESS attempt (Approved Idempotent Policy)
    const existingAttempt = await this.prisma.attempt.findFirst({
      where: {
        userId: studentId,
        levelId: level.id,
        status: 'IN_PROGRESS',
      },
      include: {
        level: { include: { track: true } },
        responses: true,
      },
    });

    if (existingAttempt) {
      const activeSession = this.buildSessionDto(existingAttempt);
      await this.saveRedisSession(activeSession);
      return activeSession;
    }

    // Level Unlock Rule: Level 2+ requires preceding level cleared with BRONZE or higher
    if (level.levelNumber > 1) {
      const prevLevel = await this.prisma.level.findFirst({
        where: {
          trackId: level.trackId,
          levelNumber: level.levelNumber - 1,
        },
      });

      if (!prevLevel) {
        throw new ForbiddenException({
          error: 'level_locked',
          message: `Preceding level ${dto.levelNumber - 1} does not exist.`,
          statusCode: 403,
        });
      }

      const prevResult = await this.prisma.levelResult.findFirst({
        where: {
          attempt: { userId: studentId },
          levelId: prevLevel.id,
        },
        orderBy: { issuedAt: 'desc' },
      });

      const allowedTiers: Tier[] = ['GOLD', 'SILVER', 'BRONZE'];
      if (!prevResult || !allowedTiers.includes(prevResult.tierAwarded as Tier)) {
        throw new ForbiddenException({
          error: 'level_locked',
          message: `Level ${dto.levelNumber} is locked. Cleared BRONZE or higher on Level ${dto.levelNumber - 1} required.`,
          statusCode: 403,
        });
      }
    }

    // Pick parallel form Code
    let formCode = 'A';
    try {
      const selected = await this.rotation.selectForm(level.id);
      formCode = selected.formCode;
      if (selected.items.length > 0) {
        await this.rotation.recordExposure(selected.items.map((i) => i.id));
      }
    } catch {
      // Fall back to default form 'A' if item rotation bank is unseeded / empty
      formCode = 'A';
    }

    const startedAt = new Date();
    const durationMinutes = level.durationMinutes ?? 60;
    const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    const attempt = await this.prisma.attempt.create({
      data: {
        userId: studentId,
        levelId: level.id,
        formCode,
        status: 'IN_PROGRESS',
        integrityFlag: 'CLEAN',
        startedAt,
        expiresAt,
      },
      include: {
        level: { include: { track: true } },
        responses: true,
      },
    });

    const sessionDto = this.buildSessionDto(attempt);
    await this.saveRedisSession(sessionDto);

    // Increment metric ONLY for newly created attempts
    attemptsStarted.inc({
      track_code: dto.trackCode,
      level_number: String(dto.levelNumber),
    });

    return sessionDto;
  }

  async getSession(studentId: string, attemptId: string): Promise<AttemptSessionDto> {
    const redisKey = `session:assessment:${attemptId}`;
    try {
      const cached = await this.redis.get(redisKey);
      if (cached) {
        const session = JSON.parse(cached) as AttemptSessionDto;
        if (session.studentId !== studentId) {
          throw new ForbiddenException({
            error: 'forbidden',
            message: 'You cannot access another student session.',
            statusCode: 403,
          });
        }
        const expiresAtMs = new Date(session.expiresAt).getTime();
        session.serverRemainingSeconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
        session.locked = session.status !== 'IN_PROGRESS' || session.serverRemainingSeconds <= 0;
        return session;
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      // Fail open to Postgres DB read if Redis throws or misses
    }

    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        level: { include: { track: true } },
        responses: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Assessment attempt ${attemptId} not found.`);
    }

    if (attempt.userId !== studentId) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You cannot access another student session.',
        statusCode: 403,
      });
    }

    const sessionDto = this.buildSessionDto(attempt);
    await this.saveRedisSession(sessionDto);
    return sessionDto;
  }

  async getNextItem(studentId: string, attemptId: string): Promise<NextItemDto> {
    const session = await this.getSession(studentId, attemptId);

    if (session.locked || session.serverRemainingSeconds <= 0) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Assessment session is locked or expired.',
        statusCode: 403,
      });
    }

    const currentItemIndex = session.currentItemIndex ?? 0;

    if (session.totalItems > 0 && currentItemIndex >= session.totalItems) {
      return {
        attemptId: session.attemptId,
        item: null,
        index: currentItemIndex,
        totalItems: session.totalItems,
        serverRemainingSeconds: session.serverRemainingSeconds,
      };
    }

    const itemBankKey = `items:form:${session.trackCode}:${session.levelNumber}:${session.formId}`;
    let items: DeliverableItemDto[] = [];

    try {
      const cachedItemsJson = await this.redis.get(itemBankKey);
      if (cachedItemsJson) {
        items = JSON.parse(cachedItemsJson) as DeliverableItemDto[];
      }
    } catch {
      // Fail open to DB query if Redis throws
    }

    if (items.length === 0) {
      const dbItems = await this.prisma.item.findMany({
        where: {
          level: {
            levelNumber: session.levelNumber,
            track: { code: session.trackCode },
          },
          formCode: session.formId,
          active: true,
        },
        include: {
          competency: true,
          options: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!dbItems || dbItems.length === 0) {
        throw new NotFoundException(`Item bank for form ${session.formId} is empty.`);
      }

      items = dbItems.map((item) => ({
        itemId: item.id,
        competencyId: item.competencyId,
        domainCode: (item.competency?.domainCode ?? 'A') as DomainCode,
        itemType: item.itemType as ItemType,
        difficulty: item.difficultyTag as DifficultyTag,
        promptText: item.stem,
        options:
          item.options && item.options.length > 0
            ? item.options.map((opt) => ({
                optionId: opt.id,
                label: opt.text ? `${opt.label}. ${opt.text}` : opt.label,
              }))
            : undefined,
        itemWeight: 1,
      }));

      try {
        await this.redis.setex(itemBankKey, ITEM_BANK_TTL_SECONDS, JSON.stringify(items));
      } catch {
        // Fail open
      }
    }

    if (currentItemIndex >= items.length) {
      return {
        attemptId: session.attemptId,
        item: null,
        index: currentItemIndex,
        totalItems: session.totalItems || items.length,
        serverRemainingSeconds: session.serverRemainingSeconds,
      };
    }

    const deliverableItem = items[currentItemIndex] ?? null;
    let savedDraft: unknown = undefined;

    if (deliverableItem) {
      const draftKey = `draft:assessment:${attemptId}:${deliverableItem.itemId}`;
      try {
        const rawDraft = await this.redis.get(draftKey);
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft) as StoredDraft;
          savedDraft = parsed.answer;
        }
      } catch {
        // Fail open
      }

      if (!savedDraft) {
        const dbResponse = await this.prisma.response.findUnique({
          where: { attemptId_itemId: { attemptId, itemId: deliverableItem.itemId } },
        });
        if (dbResponse?.answer) {
          const answerObj = dbResponse.answer as Record<string, unknown>;
          if (answerObj && typeof answerObj === 'object' && '_clientSequence' in answerObj) {
            const { _clientSequence, ...cleanAnswer } = answerObj;
            savedDraft = cleanAnswer;
          } else {
            savedDraft = dbResponse.answer;
          }
        }
      }
    }

    this.logger.log(
      {
        attemptId,
        formCode: session.formId,
        index: currentItemIndex,
        totalItems: session.totalItems || items.length,
      },
      'assessment.next-item-served',
    );

    return {
      attemptId: session.attemptId,
      item: deliverableItem,
      index: currentItemIndex,
      totalItems: session.totalItems || items.length,
      savedDraft,
      serverRemainingSeconds: session.serverRemainingSeconds,
    };
  }

  private buildSessionDto(attempt: AttemptWithLevelAndResponses): AttemptSessionDto {
    const expiresAtMs = attempt.expiresAt.getTime();
    const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
    const isLocked = attempt.status !== 'IN_PROGRESS' || remainingSeconds <= 0;

    return {
      attemptId: attempt.id,
      studentId: attempt.userId,
      trackCode: attempt.level.track.code as TrackCode,
      levelNumber: attempt.level.levelNumber as LevelNumber,
      levelFormat: attempt.level.format as LevelFormat,
      status: attempt.status as AttemptStatus,
      formId: attempt.formCode,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: attempt.expiresAt.toISOString(),
      serverRemainingSeconds: remainingSeconds,
      totalItems: attempt.level.itemCount ?? 0,
      answeredItems: attempt.responses?.length ?? 0,
      currentItemIndex: 0,
      integrityFlag: attempt.integrityFlag as IntegrityFlag,
      locked: isLocked,
    };
  }

  private async saveRedisSession(session: AttemptSessionDto): Promise<void> {
    try {
      const redisKey = `session:assessment:${session.attemptId}`;
      await this.redis.setex(redisKey, SESSION_TTL_SECONDS, JSON.stringify(session));
    } catch {
      // Fail open
    }
  }
}
