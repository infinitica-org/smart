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
  StartAttemptRequest,
  Tier,
  TrackCode,
} from '@smart/contracts';
import { attemptsStarted } from '@smart/observability';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { ItemRotationService } from './item-rotation.service.js';

const SESSION_TTL_SECONDS = 7200; // 2 hours TTL per spec
const ITEM_BANK_TTL_SECONDS = 86400; // 24 hours TTL per spec

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
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);
  readonly owner = 'Vishal Bharath R';
  readonly purpose = 'Attempt lifecycle, item delivery, integrity.';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(ItemRotationService) private readonly rotation: ItemRotationService,
  ) {}

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
